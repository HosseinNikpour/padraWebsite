import { CrudCard, CrudPage } from "@/components/admin/crud/CrudPage";
import ChangePasswordForm from "@/components/staff/ChangePasswordForm";
export default function ChangePasswordPage() {
  return <CrudPage eyebrow="PADRA STAFF" title="تغییر رمز عبور" description="برای امنیت حساب، رمز فعلی را وارد و یک رمز جدید انتخاب کنید."><CrudCard title="اطلاعات رمز عبور" description="رمز جدید باید حداقل ۸ کاراکتر باشد."><ChangePasswordForm /></CrudCard></CrudPage>;
}
