import { BOOK_TYPES, bookTypeLabel } from "../../constants/bookTypes";

const badgeStyles = {
  risala: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800",
  mujallad: "bg-gold-50 text-gold-700 ring-gold-200 dark:bg-gold-900/30 dark:text-gold-300 dark:ring-gold-800",
};

// شارة نوع الكتب في الجداول والبطاقات
export function BookTypeBadge({ type }) {
  if (!type) return <span className="text-sm text-slate-400 dark:text-slate-500">غير محدد</span>;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ring-1 ${badgeStyles[type]}`}>
      {bookTypeLabel(type)}
    </span>
  );
}

// أزرار تصفية القائمة حسب نوع الكتب: الكل / الرسالة / المجلد
export function BookTypeFilter({ value, onChange }) {
  const options = [{ value: "", label: "الكل" }, ...BOOK_TYPES];
  return (
    <div role="group" aria-label="تصفية حسب نوع الكتب" className="inline-flex p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
      {options.map((o) => (
        <button
          key={o.value || "all"}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-4 h-10 rounded-full text-sm font-bold transition ${
            value === o.value
              ? "bg-primary-700 text-white shadow"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
