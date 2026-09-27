import { useEffect, useState } from "react";
import { FiBookOpen, FiUsers, FiHome, FiTag, FiFile, FiCalendar } from "react-icons/fi";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageSpinner } from "../components/ui/Spinner";

const cards = [
  { key: "total_books", label: "إجمالي الكتاب", icon: FiBookOpen, featured: true },
  { key: "total_authors", label: "إجمالي المؤلفين", icon: FiUsers, color: "sky" },
  { key: "total_publishers", label: "إجمالي دور النشر", icon: FiHome, color: "gold" },
  { key: "total_arts", label: "إجمالي الفنون", icon: FiTag, color: "violet" },
  { key: "total_pdfs", label: "إجمالي ملفات PDF", icon: FiFile, color: "rose" },
];

const colorClasses = {
  sky: { icon: "from-sky-400 to-sky-600 shadow-sky-500/30", glow: "bg-sky-500/10" },
  gold: { icon: "from-gold-300 to-gold-600 shadow-gold-500/30", glow: "bg-gold-500/10" },
  violet: { icon: "from-violet-400 to-violet-600 shadow-violet-500/30", glow: "bg-violet-500/10" },
  rose: { icon: "from-rose-400 to-rose-600 shadow-rose-500/30", glow: "bg-rose-500/10" },
};

const todayLabel = new Intl.DateTimeFormat("ar-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

function FeaturedCard({ card, value }) {
  return (
    <div className="relative overflow-hidden sm:col-span-2 rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white shadow-lg shadow-primary-900/20 min-w-0">
      <span aria-hidden="true" className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-gold-400/15 blur-2xl" />
      <span aria-hidden="true" className="absolute left-24 -top-12 w-32 h-32 rounded-full border-[18px] border-white/5" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-primary-100 text-lg sm:text-xl font-bold">{card.label}</p>
          <p className="text-5xl sm:text-6xl font-extrabold mt-3 leading-none">{value}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            الكتاب المسجّلة في المكتبة
          </p>
        </div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gold-300 to-gold-600 text-primary-950 shadow-lg shadow-black/30">
          <card.icon className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ card, value }) {
  const color = colorClasses[card.color];
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 sm:p-7 shadow-[0_1px_3px_rgba(17,27,54,0.06)] min-w-0">
      <span aria-hidden="true" className={`absolute -left-8 -bottom-10 w-32 h-32 rounded-full ${color.glow}`} />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-slate-500 dark:text-slate-300 text-lg sm:text-xl font-bold">{card.label}</p>
          <p className="text-5xl sm:text-6xl font-extrabold text-primary-950 dark:text-white mt-3 leading-none">{value}</p>
        </div>
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg ${color.icon}`}
        >
          <card.icon className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-5 sm:mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-gold-600 dark:text-gold-400 text-sm sm:text-base font-bold">
            مرحباً، {user?.full_name || user?.username}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-950 dark:text-slate-100 mt-1">لوحة التحكم</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium mt-1.5">نظرة عامة على إحصائيات المكتبة</p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
          <FiCalendar className="text-primary-600 dark:text-gold-400" size={16} />
          {todayLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {cards.map((c) =>
          c.featured ? (
            <FeaturedCard key={c.key} card={c} value={stats?.[c.key] ?? 0} />
          ) : (
            <StatCard key={c.key} card={c} value={stats?.[c.key] ?? 0} />
          )
        )}
      </div>
    </div>
  );
}
