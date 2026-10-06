import { useEffect, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";

// توحيد النص العربي للبحث: إزالة التشكيل والتطويل، وتوحيد أشكال الألف والياء والتاء المربوطة
export function normalizeArabic(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesSearch(name, query) {
  const q = normalizeArabic(query);
  return !q || normalizeArabic(name).includes(q);
}

// مربع بحث يُثبَّت أعلى القائمة المنسدلة ويأخذ التركيز تلقائياً عند فتحها
export function DropdownSearchBox({ value, onChange, onEnter, onEscape, placeholder = "ابحث..." }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="sticky top-0 z-10 p-2 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
      <div className="relative">
        <FiSearch className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter?.();
            } else if (e.key === "Escape") {
              onEscape?.();
            }
          }}
          placeholder={placeholder}
          className="w-full h-10 pr-9 pl-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            aria-label="مسح البحث"
            className="absolute top-1/2 -translate-y-1/2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <FiX size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function NoResults({ text = "لا توجد نتائج مطابقة" }) {
  return <p className="px-4 py-3 text-sm font-semibold text-slate-400">{text}</p>;
}
