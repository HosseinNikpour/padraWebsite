import { getCurrentUser } from "@/lib/auth";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resolveRedirect, type SessionType } from "@/lib/redirect";

export { resolveRedirect };
export type { SessionType };

/** هویت فعلی (پرسنل یا مشتری). اگر هر دو کوکی باشد پرسنل اولویت دارد. */
export async function getSessionIdentity(): Promise<
  { type: SessionType; name: string } | null
> {
  const user = await getCurrentUser();

  if (user) return { type: "staff", name: user.name };

  const customer = await getCurrentCustomer();

  if (customer) return { type: "customer", name: customer.name };

  return null;
}
