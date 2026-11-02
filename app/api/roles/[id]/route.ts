import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authorize, getPermissionCodes, isAdminRole } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const auth = await authorize("roles.manage");
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const roleId = Number(id);

    if (!Number.isInteger(roleId)) {
      return NextResponse.json(
        { error: "شناسه نقش نامعتبر است" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const permissionIds = Array.isArray(body.permissionIds)
      ? body.permissionIds
          .map(Number)
          .filter((id: number) => Number.isInteger(id))
      : [];

    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: "نقش پیدا نشد" },
        { status: 404 }
      );
    }

    // نقش ADMIN همیشه به همه‌ی دسترسی‌ها دسترسی دارد و قابل ویرایش نیست
    if (isAdminRole(role)) {
      return NextResponse.json(
        { error: "دسترسی‌های نقش مدیر سیستم قابل تغییر نیست" },
        { status: 400 }
      );
    }

    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
        isActive: true,
      },
    });

    // هیچ‌کس نمی‌تواند دسترسی‌ای را به نقشی بدهد که خودش ندارد
    if (!isAdminRole(auth.user.role)) {
      const mine = getPermissionCodes(auth.user.role);
      const forbidden = permissions.filter(
        (permission: { code: string }) => !mine.has(permission.code)
      );

      if (forbidden.length > 0) {
        return NextResponse.json(
          { error: "نمی‌توانید دسترسی‌ای را بدهید که خودتان ندارید" },
          { status: 403 }
        );
      }
    }

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.rolePermission.deleteMany({
          where: {
            roleId,
          },
        });

        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map(
              (permission: { id: number }) => ({
                roleId,
                permissionId: permission.id,
              })
            ),
            skipDuplicates: true,
          });
        }
      }
    );

    const updatedRole = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      role: updatedRole,
    });
  } catch (error) {
    console.error("UPDATE_ROLE_ERROR:", error);

    return NextResponse.json(
      {
        error: "خطا در ذخیره دسترسی‌های نقش",
      },
      { status: 500 }
    );
  }
}