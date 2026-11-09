/**
 * کپی شیفت‌های یک هفته به یک یا چند هفته‌ی دیگر (هفته از شنبه شروع می‌شود).
 *
 * استفاده:
 *   node scripts/copy-week.js --to=2026-11-14
 *   node scripts/copy-week.js --from=2026-11-07 --to=2026-11-14,2026-11-21 --mode=replace
 *   node scripts/copy-week.js --to=2026-11-14 --dry-run
 *
 * --to       (الزامی) یک روزِ دلخواه از هفته‌ی مقصد، میلادی YYYY-MM-DD. چند هفته با کاما جدا شود.
 * --from     یک روزِ دلخواه از هفته‌ی مبدأ؛ پیش‌فرض: هفته‌ی قبلِ هر هفته‌ی مقصد
 * --mode     fill (پیش‌فرض: فقط خانه‌های خالی پر شود) | replace (شیفت‌های هفته‌ی مقصد حذف و جایگزین شود)
 * --dry-run  فقط گزارش بده، چیزی ننویس
 */
try {
  require("dotenv/config");
} catch {}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utc = (d) => new Date(`${d}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);

function addDays(date, n) {
  const d = utc(date);

  d.setUTCDate(d.getUTCDate() + n);

  return iso(d);
}

// شنبه = 0 ... جمعه = 6
const weekdayIndex = (date) => (utc(date).getUTCDay() + 1) % 7;
const weekStart = (date) => addDays(date, -weekdayIndex(date));

function validDate(v) {
  return DATE_RE.test(v) && !Number.isNaN(utc(v).getTime()) && iso(utc(v)) === v;
}

function parseArgs() {
  const args = {};

  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);

    if (m) args[m[1]] = m[2] ?? true;
  }

  return args;
}

async function main() {
  const args = parseArgs();
  const mode = args.mode || "fill";
  const dry = !!args["dry-run"];

  if (!["fill", "replace"].includes(mode)) throw new Error("--mode باید fill یا replace باشد");
  if (!args.to || args.to === true) throw new Error("--to الزامی است. مثال: --to=2026-11-14");
  if (args.from !== undefined && !validDate(args.from)) throw new Error("--from معتبر نیست (YYYY-MM-DD)");

  const targets = String(args.to).split(",").map((s) => s.trim()).filter(Boolean);

  for (const t of targets) if (!validDate(t)) throw new Error(`تاریخ مقصد معتبر نیست: ${t}`);

  const staffFilter = { isActive: true, role: { code: { not: "CUSTOMER" } } };

  for (const t of targets) {
    const toStart = weekStart(t);
    const toEnd = addDays(toStart, 6);
    const fromStart = args.from ? weekStart(args.from) : addDays(toStart, -7);
    const fromEnd = addDays(fromStart, 6);

    if (fromStart === toStart) throw new Error(`هفته‌ی مبدأ و مقصد یکی است (${toStart})`);

    const [source, target] = await Promise.all([
      prisma.shift.findMany({
        where: { date: { gte: utc(fromStart), lte: utc(fromEnd) }, user: staffFilter },
        select: { userId: true, date: true, type: true },
      }),
      prisma.shift.findMany({
        where: { date: { gte: utc(toStart), lte: utc(toEnd) }, user: staffFilter },
        select: { userId: true, date: true },
      }),
    ]);

    console.log(`\nهفته‌ی ${fromStart}..${fromEnd}  ←→  ${toStart}..${toEnd}`);
    console.log(`  شیفت مبدأ: ${source.length} | شیفت موجود در مقصد: ${target.length}`);

    if (source.length === 0) {
      console.log("  شیفتی در هفته‌ی مبدأ نیست؛ رد شد.");
      continue;
    }

    const offset = (utc(toStart) - utc(fromStart)) / 86_400_000;
    const taken = new Set(target.map((x) => `${x.userId}|${iso(x.date)}`));

    const rows = source
      .map((s) => ({ userId: s.userId, date: addDays(iso(s.date), offset), type: s.type }))
      .filter((r) => mode === "replace" || !taken.has(`${r.userId}|${r.date}`));

    console.log(`  کپی می‌شود: ${rows.length} | حفظ‌شده/ردشده: ${source.length - rows.length} | حالت: ${mode}`);

    if (dry) {
      console.log("  (dry-run: چیزی نوشته نشد)");
      continue;
    }

    await prisma.$transaction([
      ...(mode === "replace"
        ? [prisma.shift.deleteMany({ where: { date: { gte: utc(toStart), lte: utc(toEnd) }, user: staffFilter } })]
        : []),
      prisma.shift.createMany({
        data: rows.map((r) => ({ userId: r.userId, date: utc(r.date), type: r.type })),
        skipDuplicates: true,
      }),
    ]);

    console.log("  انجام شد ✔");
  }
}

main()
  .catch((e) => {
    console.error("خطا:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
