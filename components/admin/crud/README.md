# قالب مشترک CRUD پنل مدیریت پادرا

این قالب یک لایه نمایشی مشترک است؛ منطق داده، API و اعتبارسنجی اختصاصی هر صفحه باید در خود صفحه بماند.

## اجزا
- `CrudPage`: عنوان، توضیح، شمارنده و پوسته صفحه
- `CrudColumns`: چیدمان دو ستونه (در موبایل تک‌ستونه)
- `CrudCard`: کارت فرم یا فهرست با سربرگ مشترک
- `CrudField`: برچسب، فیلد و راهنمای ورودی
- `crud-theme.css`: متغیرهای رنگ/فاصله/گردی و استایل پایه دکمه‌ها و جدول

## نمونه استفاده
```tsx
import { CrudPage, CrudColumns, CrudCard, CrudField } from "@/components/admin/crud/CrudPage";

<CrudPage eyebrow="PADRA ADMIN" title="مدیریت نمونه" description="اطلاعات را مدیریت کنید." count={items.length} countLabel="مورد">
  <CrudColumns>
    <CrudCard title="فهرست اطلاعات">
      {/* جدول را با کلاس‌های crud-table و crud-table-wrap نمایش دهید */}
    </CrudCard>
    <CrudCard title="ایجاد مورد جدید">
      <form>
        <CrudField label="عنوان"><input /></CrudField>
        <button className="crud-button crud-button--primary">ذخیره</button>
      </form>
    </CrudCard>
  </CrudColumns>
</CrudPage>
```

## توسعه امن
صفحات فعلی users، games و events شامل رفتارهای متفاوت (از جمله آپلود تصویر و occurrenceهای ایونت) هستند. این اجزا عمداً API یا منطق آن صفحات را تغییر نمی‌دهند. برای جلوگیری از حذف تصادفی قابلیت‌ها، مهاجرت هر صفحه باید جداگانه انجام و پس از آن در مرورگر تست شود. رنگ‌ها و ابعاد عمومی از متغیرهای `:root` در `crud-theme.css` قابل تنظیم هستند.
