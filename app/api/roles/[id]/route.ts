import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز" },
        { status: 401 }
      );
    }

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

    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
        isActive: true,
      },
    });

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