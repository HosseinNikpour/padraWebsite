export default function MenuAdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#123E73]">
              مدیریت منو
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              مدیریت دسته‌بندی‌ها و آیتم‌های منوی کافه
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          <a
            href="/admin/menu/categories"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#123E73]/10 text-2xl">
              ☰
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              دسته‌بندی‌ها
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              افزودن، ویرایش و مدیریت دسته‌بندی‌های منو
            </p>

            <div className="mt-5 text-sm font-medium text-[#123E73]">
              مدیریت دسته‌بندی‌ها ←
            </div>
          </a>

          <a
            href="/admin/menu/items"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#123E73]/10 text-2xl">
              🍔
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              آیتم‌های منو
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              افزودن، ویرایش و مدیریت غذاها و نوشیدنی‌ها
            </p>

            <div className="mt-5 text-sm font-medium text-[#123E73]">
              مدیریت آیتم‌ها ←
            </div>
          </a>

        </div>
      </div>
    </main>
  );
}