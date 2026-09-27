import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiChevronDown, FiX } from "react-icons/fi";
import { TbLayoutDashboardFilled, TbPencilPlus, TbReportAnalytics } from "react-icons/tb";

// أيقونة ملوّنة داخل مربع دائري الحواف للقوائم الرئيسية فقط
function MenuIcon({ icon: Icon, color, active }) {
  return (
    <span
      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-sm ${
        active ? "bg-white/20 text-white" : color
      }`}
    >
      <Icon className="w-[19px] h-[19px]" />
    </span>
  );
}

const registrationLinks = [
  { to: "/arts", label: "تسجيل الفنون" },
  { to: "/authors", label: "تسجيل المؤلفين" },
  { to: "/publishers", label: "تسجيل دور النشر" },
  { to: "/books", label: "تسجيل الكتاب" },
];

const reportLinks = [
  { to: "/reports/all-books", label: "تقرير جميع الكتاب" },
  { to: "/reports/books-by-art", label: "تقرير الكتاب حسب الفنون" },
];

function NavGroup({ label, icon, color, links, closeMobile }) {
  const { pathname } = useLocation();
  // مغلقة افتراضياً (عند تسجيل الدخول)، وتُفتح فقط إذا كانت الصفحة الحالية إحدى صفحاتها
  const [open, setOpen] = useState(() => links.some((l) => pathname.startsWith(l.to)));
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-[0.95rem] font-semibold transition"
      >
        <span className="flex items-center gap-3">
          <MenuIcon icon={icon} color={color} />
          {label}
        </span>
        <FiChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} size={16} />
      </button>
      {open && (
        <div className="mt-1 mr-2 pr-3 border-r-2 border-slate-200 dark:border-slate-700 flex flex-col gap-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium leading-snug transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:sticky top-0 right-0 z-50 lg:z-auto h-dvh w-64 max-w-[85vw] lg:w-60 2xl:w-64 shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-tight min-w-0">نظام إدارة المكتبة</h2>
          <button onClick={onClose} aria-label="إغلاق القائمة" className="lg:hidden p-1.5 shrink-0 text-slate-400 hover:text-slate-600">
            <FiX size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-1">
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-1.5 rounded-lg text-[0.95rem] font-semibold transition ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <MenuIcon icon={TbLayoutDashboardFilled} color="bg-emerald-500 text-white" active={isActive} />
                لوحة التحكم
              </>
            )}
          </NavLink>

          <NavGroup
            label="التسجيل"
            icon={TbPencilPlus}
            color="bg-sky-500 text-white"
            links={registrationLinks}
            closeMobile={onClose}
          />
          <NavGroup
            label="التقارير"
            icon={TbReportAnalytics}
            color="bg-violet-500 text-white"
            links={reportLinks}
            closeMobile={onClose}
          />
        </nav>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-400 dark:text-slate-500 text-center">
          نظام إدارة المكتبة © {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}
