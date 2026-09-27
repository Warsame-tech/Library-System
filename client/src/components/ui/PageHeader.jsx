import { FiPlus, FiSearch, FiX } from "react-icons/fi";

export default function PageHeader({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = "بحث...",
  onAdd,
  addLabel = "إضافة",
  extra,
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 break-words">{title}</h1>
          {subtitle && <p className="text-slate-500 dark:text-slate-400 text-base font-semibold mt-1">{subtitle}</p>}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <FiPlus size={18} />
            {addLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {onSearchChange && (
          <div className="group relative w-full sm:flex-1 sm:min-w-[260px] sm:max-w-xl">
            <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-2 w-9 h-9 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300 group-focus-within:bg-emerald-600 group-focus-within:text-white transition">
              <FiSearch size={17} />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-12 pr-14 pl-11 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base text-slate-700 dark:text-slate-200 placeholder:text-slate-400 shadow-sm hover:shadow-md focus:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 transition [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="مسح البحث"
                className="absolute top-1/2 -translate-y-1/2 left-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        )}
        {extra}
      </div>
    </div>
  );
}
