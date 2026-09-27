import { Link } from "react-router-dom";
import { FiAlertCircle } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FiAlertCircle className="text-slate-300 dark:text-slate-600 mb-4" size={48} />
      <h1 className="text-2xl font-extrabold text-slate-700 dark:text-slate-200 mb-2">الصفحة غير موجودة</h1>
      <p className="text-slate-500 dark:text-slate-400 text-base font-semibold mb-5">الصفحة التي تحاول الوصول إليها غير موجودة.</p>
      <Link to="/" className="text-emerald-600 dark:text-emerald-400 font-bold text-base hover:underline">
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}
