import { FiUploadCloud, FiFile, FiTrash2, FiX, FiEye, FiRefreshCw } from "react-icons/fi";
import { fileUrl } from "../api/client";

function formatSize(bytes) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} كيلوبايت`;
  return `${(kb / 1024).toFixed(1)} ميغابايت`;
}

function FilePicker({ label, icon: Icon, onPick, disabled, className }) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <Icon size={15} />
      {label}
      <input
        type="file"
        accept="application/pdf"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
        className="hidden"
      />
    </label>
  );
}

// خانة رفع لكل نسخة (1..count). كل الخانات اختيارية: الخانة الفارغة لا تؤثر على أي ملف.
// existing: { رقم النسخة: ملف محفوظ }، pending: { رقم النسخة: ملف مختار لم يُرفع بعد }
export default function CopyPdfSlots({
  bookId,
  count,
  existing,
  pending,
  onPick,
  onClear,
  onDelete,
  onUploadNow,
  canUploadNow,
  uploading,
}) {
  const busy = uploading !== null;

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const saved = existing[n];
        const file = pending[n];
        return (
          <div
            key={n}
            className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border ${
              file
                ? "bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-900"
                : "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700"
            }`}
          >
            <span className="shrink-0 w-20 text-sm font-extrabold text-slate-600 dark:text-slate-300">النسخة {n}</span>

            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {file || saved ? (
                <>
                  <FiFile className="text-primary-600 dark:text-primary-400 shrink-0" size={17} />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{file ? file.name : saved.original_name}</p>
                    <p className="text-sm text-slate-400">
                      {file
                        ? `${formatSize(file.size)} · ${saved ? "سيحل محل الملف الحالي عند الرفع" : "جديد"}`
                        : formatSize(saved.file_size)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">لم يُرفع ملف بعد (اختياري)</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {file ? (
                <>
                  {canUploadNow(n) && (
                    <button
                      type="button"
                      onClick={() => onUploadNow([n])}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition disabled:opacity-60"
                    >
                      <FiUploadCloud size={15} />
                      {uploading === n ? "جارٍ الرفع..." : "رفع الآن"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onClear(n)}
                    disabled={busy}
                    title="إلغاء اختيار الملف"
                    className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-60"
                  >
                    <FiX size={15} />
                  </button>
                </>
              ) : saved ? (
                <>
                  <a
                    href={fileUrl(`/api/books/${bookId}/pdfs/${saved.id}/view`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition"
                  >
                    <FiEye size={15} />
                    عرض
                  </a>
                  <FilePicker
                    label="استبدال"
                    icon={FiRefreshCw}
                    onPick={(f) => onPick(n, f)}
                    disabled={busy}
                    className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => onDelete(saved)}
                    disabled={busy}
                    title="حذف الملف"
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-60"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </>
              ) : (
                <FilePicker
                  label="اختر ملف PDF"
                  icon={FiUploadCloud}
                  onPick={(f) => onPick(n, f)}
                  disabled={busy}
                  className="border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
