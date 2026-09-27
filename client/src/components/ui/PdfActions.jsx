import { FiEye, FiDownload } from "react-icons/fi";
import { fileUrl } from "../../api/client";

// زرّا عرض وتحميل ملف PDF لكل ملف مرتبط بالكتاب
// (عند وجود أكثر من ملف يُعرض رقم الملف بجانب أزراره)
export default function PdfActions({ bookId, pdfs }) {
  if (!pdfs?.length) {
    return <span className="text-sm text-slate-400 dark:text-slate-500">لا يوجد</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {pdfs.map((pdf, i) => (
        <div key={pdf.id} className="flex items-center gap-1.5" title={pdf.original_name}>
          {pdfs.length > 1 && (
            <span className="w-5 text-center text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</span>
          )}
          <a
            href={fileUrl(`/api/books/${bookId}/pdfs/${pdf.id}/view`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50 transition"
          >
            <FiEye size={14} />
            عرض
          </a>
          <a
            href={fileUrl(`/api/books/${bookId}/pdfs/${pdf.id}/download`)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-gold-50 text-gold-700 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-300 dark:hover:bg-gold-900/50 transition"
          >
            <FiDownload size={14} />
            تحميل
          </a>
        </div>
      ))}
    </div>
  );
}
