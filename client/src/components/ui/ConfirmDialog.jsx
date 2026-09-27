import { FiAlertTriangle } from "react-icons/fi";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من رغبتك في تنفيذ هذا الإجراء؟",
  confirmLabel = "حذف",
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
          <FiAlertTriangle size={28} />
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-base font-semibold break-words">{message}</p>
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? "جارٍ الحذف..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
