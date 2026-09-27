import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiChevronDown, FiX } from "react-icons/fi";
import { TbLayoutDashboardFilled, TbPencilPlus, TbReportAnalytics, TbBooks } from "react-icons/tb";

// أيقونة ملوّنة داخل مربع دائري الحواف للقوائم الرئيسية فقط
function MenuIcon({ icon: Icon, color }) {
  return (
    <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center shadow-md shadow-black/20 ${color}`}>
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

const itemBase = "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-[0.95rem] font-semibold transition";
const itemIdle = "text-primary-100/85 hover:bg-white/[0.06] hover:text-white";
const itemActive =
  "bg-white/10 text-white shadow-inner before:absolute before:-right-2.5 before:top-2 before:bottom-2 before:w-1 before:rounded-l-full before:bg-gold-400";

function NavGroup({ label, icon, color, links, closeMobile }) {
  const { pathname } = useLocation();
  const hasActive = links.some((l) => pathname.startsWith(l.to));
  // مغلقة افتراضياً (عند تسجيل الدخول)، وتُفتح فقط إذا كانت الصفحة الحالية إحدى صفحاتها
  const [open, setOpen] = useState(hasActive);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={`${itemBase} justify-between ${hasActive ? "text-white" : itemIdle}`}>
        <span className="flex items-center gap-3">
          <MenuIcon icon={icon} color={color} />
          {label}
        </span>
        <FiChevronDown className={`text-primary-300 transition-transform ${open ? "rotate-180" : ""}`} size={16} />
      </button>
      {open && (
        <div className="mt-1 mr-6 pr-3 border-r border-white/10 flex flex-col gap-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm leading-snug transition ${
                  isActive
                    ? "bg-gold-400/15 text-gold-300 font-bold"
                    : "text-primary-200/75 font-medium hover:text-white hover:bg-white/[0.05]"
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
      {open && <div className="fixed inset-0 bg-primary-950/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:sticky top-0 right-0 z-50 lg:z-auto h-dvh w-64 max-w-[85vw] lg:w-60 2xl:w-64 shrink-0 bg-gradient-to-b from-primary-900 via-primary-950 to-primary-950 text-white flex flex-col shadow-2xl lg:shadow-none transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-14 shrink-0 flex items-center justify-between gap-2 px-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-gold-300 to-gold-600 text-primary-950 flex items-center justify-center shadow-md shadow-black/30">
              <TbBooks size={19} />
            </span>
            <h2 className="font-bold text-base text-white leading-tight truncate">نظام إدارة المكتبة</h2>
          </div>
          <button onClick={onClose} aria-label="إغلاق القائمة" className="lg:hidden p-1.5 shrink-0 text-primary-200 hover:text-white">
            <FiX size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4 flex flex-col gap-1">
          <p className="px-2.5 mb-1 text-[0.7rem] font-bold tracking-wider text-primary-300/70">القائمة الرئيسية</p>
          <NavLink to="/" end onClick={onClose} className={({ isActive }) => `${itemBase} ${isActive ? itemActive : itemIdle}`}>
            <MenuIcon icon={TbLayoutDashboardFilled} color="bg-gradient-to-br from-gold-300 to-gold-500 text-primary-950" />
            لوحة التحكم
          </NavLink>

          <NavGroup
            label="التسجيل"
            icon={TbPencilPlus}
            color="bg-gradient-to-br from-sky-400 to-sky-600 text-white"
            links={registrationLinks}
            closeMobile={onClose}
          />
          <NavGroup
            label="التقارير"
            icon={TbReportAnalytics}
            color="bg-gradient-to-br from-violet-400 to-violet-600 text-white"
            links={reportLinks}
            closeMobile={onClose}
          />
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-xs font-medium text-primary-300/70 text-center">
          نظام إدارة المكتبة © {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}
