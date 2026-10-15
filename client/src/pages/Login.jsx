import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiAlertCircle, FiSun, FiMoon } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import userAvatar from "../assets/user-avatar-navy.jpg";
import LoginArtwork from "../components/login/LoginArtwork";

const inputClass =
  "peer w-full h-12 pl-11 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[0.95rem] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-500 dark:focus:border-gold-400 dark:focus:ring-gold-400/15 transition";

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
      className="relative min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-[#f7f3ea] via-[#f1ece0] to-[#e9e1cf] dark:from-slate-950 dark:via-[#0b1124] dark:to-slate-950 px-4 pt-20 pb-8 sm:py-10"
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-white text-primary-800 ring-1 ring-primary-900/10 shadow-md hover:scale-105 dark:bg-slate-800 dark:text-gold-300 dark:ring-white/10 transition"
      >
        {theme === "dark" ? <FiSun size={19} /> : <FiMoon size={19} />}
      </button>

      {/* بطاقة واحدة بقسمين: اللوحة الفنية (مكتبة إسلامية) + نموذج الدخول على خلفية نظيفة */}
      <div className="login-card w-full max-w-[25rem] lg:max-w-[60rem] grid lg:grid-cols-[1.05fr_1fr] rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xl shadow-primary-950/20 dark:shadow-black/50 ring-1 ring-primary-900/10 dark:ring-white/10">
        <LoginArtwork />

        <form onSubmit={handleSubmit} noValidate className="flex flex-col justify-center px-6 sm:px-10 py-8 lg:py-12">
          <div className="text-center mb-7">
            <div className="inline-block p-[3px] rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-gold-700 shadow-lg shadow-primary-900/20">
              <img
                src={userAvatar}
                alt="Admin"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-900"
              />
            </div>
            <h1 className="mt-4 text-[1.6rem] leading-tight font-extrabold tracking-tight text-slate-800 dark:text-white">
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

          <p className="mt-8 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} Library Management System
          </p>
        </form>
      </div>
    </div>
  );
}
