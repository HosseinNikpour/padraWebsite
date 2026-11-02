// اجرای تست‌ها با Node (type-stripping داخلی)؛ alias «@/…» را به ریشه‌ی پروژه نگاشت می‌کند.
import { register } from "node:module";

register("./loader.mjs", import.meta.url);
