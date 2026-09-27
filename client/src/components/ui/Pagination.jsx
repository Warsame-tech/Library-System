import { FiChevronRight, FiChevronLeft } from "react-icons/fi";

export default function Pagination({ page, totalPages, onChange, total }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 px-3 sm:px-4 py-4">
      <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
        إجمالي النتائج: <span className="font-extrabold text-slate-700 dark:text-slate-200">{total}</span>
      </p>
      <div className="flex items-center flex-wrap justify-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <FiChevronRight />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[40px] h-10 rounded-lg text-base font-bold transition ${
              p === page
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <FiChevronLeft />
        </button>
      </div>
    </div>
  );
}
