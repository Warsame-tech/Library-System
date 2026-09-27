import { useState } from "react";
import { FiMenu, FiSun, FiMoon, FiLogOut, FiChevronDown } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import userAvatar from "../assets/user-avatar-red.jpg";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 shrink-0 px-3 sm:px-5 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
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
          className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          {theme === "dark" ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <img src={userAvatar} alt="" className="w-8 h-8 rounded-full object-cover object-top" />
            <span className="hidden sm:block max-w-[12rem] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
              {user?.full_name || user?.username}
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
