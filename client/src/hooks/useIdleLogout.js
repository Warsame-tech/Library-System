import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// مدة عدم النشاط قبل تسجيل الخروج التلقائي (بالثواني) — قابلة للتعديل من client/.env
const IDLE_TIMEOUT_SECONDS = Number(import.meta.env.VITE_IDLE_TIMEOUT_SECONDS) || 300;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart"];
const STORAGE_KEY = "lastActivity";

// يسجّل خروج المستخدم تلقائياً بعد فترة من عدم النشاط.
// آخر نشاط يُحفظ في localStorage كي تتشارك كل التبويبات المفتوحة نفس المؤقت،
// والفحص الدوري (بدلاً من setTimeout واحد) يعمل بشكل صحيح بعد سكون الجهاز.
export default function useIdleLogout() {
  const { logout } = useAuth();
  const toast = useToast();

  useEffect(() => {
    let lastWrite = 0;
    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite < 1000) return; // تقليل الكتابة أثناء تحريك الفأرة
      lastWrite = now;
      localStorage.setItem(STORAGE_KEY, String(now));
    };

    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const timer = setInterval(() => {
      const last = Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
      if (Date.now() - last >= IDLE_TIMEOUT_SECONDS * 1000) {
        clearInterval(timer);
        localStorage.removeItem(STORAGE_KEY);
        logout();
        toast.info("انتهت الجلسة بسبب عدم النشاط، يرجى تسجيل الدخول مرة أخرى");
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
