import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiAlertCircle, FiSun, FiMoon } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import userAvatar from "../assets/user-avatar-navy.jpg";
import booksPattern from "../assets/bookshelf-pattern.jpg";

const inputClass =
  "peer w-full h-12 pl-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-[0.95rem] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 transition";

const iconClass =
  "pointer-events-none absolute top-1/2 -translate-y-1/2 left-4 text-slate-400 peer-focus:text-primary-600 dark:peer-focus:text-gold-400 transition-colors";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter your username and password");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success("Logged in successfully");
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="ltr"
      className="relative overflow-hidden min-h-dvh flex flex-col items-center justify-center bg-[#eef2f9] dark:bg-slate-950 px-4 py-10"
    >
      {/* خلفية: رفوف الكتب المتحركة تحت طبقة لونية (فاتحة أو داكنة حسب الوضع) */}
      <div
        aria-hidden="true"
        className="login-pattern pointer-events-none absolute inset-0 opacity-25 dark:opacity-30"
        style={{ backgroundImage: `url(${booksPattern})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50/90 via-white/80 to-gold-50/90 dark:from-primary-950/95 dark:via-primary-900/85 dark:to-slate-950/95"
      />
      <div aria-hidden="true" className="login-glow pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-300/40 dark:bg-primary-400/30 blur-3xl" />
      <div aria-hidden="true" className="login-glow pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-gold-300/40 dark:bg-gold-400/20 blur-3xl [animation-delay:-6s]" />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-white/80 text-primary-800 ring-1 ring-primary-900/10 shadow-lg shadow-primary-900/10 hover:bg-white hover:scale-105 dark:bg-white/10 dark:text-gold-300 dark:ring-white/15 dark:shadow-black/30 dark:hover:bg-white/20 backdrop-blur-md transition"
      >
        {theme === "dark" ? <FiSun size={19} /> : <FiMoon size={19} />}
      </button>

      <div className="login-card relative w-full max-w-[25rem] mt-14">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary-900/15 dark:shadow-black/40 ring-1 ring-primary-900/5 dark:ring-white/15 px-6 sm:px-9 pt-16 pb-8"
        >
          {/* الصورة الشخصية فوق البطاقة */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            <div className="p-1 rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-gold-700 shadow-xl shadow-black/30">
              <img
                src={userAvatar}
                alt="Admin"
                className="w-28 h-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-900"
              />
            </div>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight text-slate-800 dark:text-white">
              Library Management System
            </h1>
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-gold-50 ring-1 ring-gold-200 dark:bg-gold-900/30 dark:ring-gold-800 text-gold-700 dark:text-gold-300 text-xs font-bold tracking-wide uppercase">
              <FiShield size={13} />
              Admin Login
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900"
            >
              <FiAlertCircle size={17} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className={`${inputClass} pr-4`}
                placeholder="Enter your username"
              />
              <FiUser className={iconClass} size={18} />
            </div>
          </div>

          <div className="mb-7">
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`${inputClass} pr-12`}
                placeholder="Enter your password"
              />
              <FiLock className={iconClass} size={18} />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-1/2 -translate-y-1/2 right-2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-800 to-primary-600 hover:from-primary-700 hover:to-primary-500 text-white text-base font-bold shadow-lg shadow-primary-800/30 hover:shadow-primary-600/40 active:scale-[0.99] transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                Log In
                <FiArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-primary-800/60 dark:text-gold-200/70">
          © {new Date().getFullYear()} Library Management System
        </p>
      </div>
    </div>
  );
}
