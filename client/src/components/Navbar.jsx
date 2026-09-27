import { useState } from "react";
import { FiMenu, FiSun, FiMoon, FiLogOut, FiChevronDown } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import userAvatar from "../assets/user-avatar-navy.jpg";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 shrink-0 px-3 sm:px-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_rgba(17,27,54,0.05)]">
      <button
        onClick={onMenuClick}
        aria-label="فتح القائمة"
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300"
      >
        <FiMenu size={22} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-700 bg-primary-50 hover:bg-primary-100 dark:text-gold-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
        >
          {theme === "dark" ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <img src={userAvatar} alt="" className="w-9 h-9 rounded-full object-cover object-top ring-2 ring-gold-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" />
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="max-w-[12rem] truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {user?.full_name || user?.username}
              </span>
              <span className="text-[0.7rem] font-semibold text-gold-600 dark:text-gold-400">مدير النظام</span>
            </span>
            <FiChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-20">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <FiLogOut size={16} />
                  تسجيل الخروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
