import { useEffect, useState } from "react";
import { FiBookOpen, FiUsers, FiHome, FiTag, FiFile } from "react-icons/fi";
import api from "../api/client";
import { PageSpinner } from "../components/ui/Spinner";

const cards = [
  { key: "total_books", label: "إجمالي الكتاب", icon: FiBookOpen, color: "emerald", wide: true },
  { key: "total_authors", label: "إجمالي المؤلفين", icon: FiUsers, color: "sky" },
  { key: "total_publishers", label: "إجمالي دور النشر", icon: FiHome, color: "amber" },
  { key: "total_arts", label: "إجمالي الفنون", icon: FiTag, color: "violet" },
  { key: "total_pdfs", label: "إجمالي ملفات PDF", icon: FiFile, color: "rose" },
];

const colorClasses = {
  emerald: { icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", bar: "bg-emerald-500" },
  sky: { icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", bar: "bg-sky-500" },
  amber: { icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", bar: "bg-amber-500" },
  violet: { icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", bar: "bg-violet-500" },
  rose: { icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", bar: "bg-rose-500" },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-5 sm:mb-7">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">لوحة التحكم</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-semibold mt-1.5">نظرة عامة على إحصائيات المكتبة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {cards.map((c) => (
          <div
            key={c.key}
            className={`relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-7 shadow-sm min-w-0 ${
              c.wide ? "sm:col-span-2" : ""
            }`}
          >
            <span className={`absolute top-0 inset-x-0 h-1.5 ${colorClasses[c.color].bar}`} />
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl font-bold">{c.label}</p>
                <p className="text-5xl sm:text-6xl font-extrabold text-slate-800 dark:text-slate-100 mt-3 leading-none">
                  {stats?.[c.key] ?? 0}
                </p>
              </div>
              <div className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl flex items-center justify-center ${colorClasses[c.color].icon}`}>
                <c.icon className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
