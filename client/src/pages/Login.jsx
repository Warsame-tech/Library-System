import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import userAvatar from "../assets/user-avatar-red.jpg";
import booksPattern from "../assets/bookshelf-pattern.jpg";

const inputClass =
  "peer w-full h-12 pl-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-[0.95rem] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 transition";

const iconClass =
  "pointer-events-none absolute top-1/2 -translate-y-1/2 left-4 text-slate-400 peer-focus:text-emerald-600 transition-colors";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const toast = useToast();
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
      className="relative overflow-hidden min-h-dvh flex flex-col items-center justify-center bg-slate-950 px-4 py-10"
    >
      {/* خلفية: رفوف الكتب المتحركة تحت طبقة لونية داكنة */}
      <div
        aria-hidden="true"
        className="login-pattern pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: `url(${booksPattern})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-slate-950/85 to-emerald-900/90"
      />
      <div aria-hidden="true" className="login-glow pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/25 blur-3xl" />
      <div aria-hidden="true" className="login-glow pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-amber-400/15 blur-3xl [animation-delay:-6s]" />

      <div className="login-card relative w-full max-w-[25rem] mt-14">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-white/20 px-6 sm:px-9 pt-16 pb-8"
        >
          {/* الصورة الشخصية فوق البطاقة */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            <div className="p-1 rounded-full bg-gradient-to-br from-emerald-400 via-amber-300 to-red-500 shadow-xl shadow-black/30">
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
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide uppercase">
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
            className="group w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-bold shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 active:scale-[0.99] transition disabled:opacity-70 disabled:cursor-not-allowed"
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

        <p className="mt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Library Management System
        </p>
      </div>
    </div>
  );
}
