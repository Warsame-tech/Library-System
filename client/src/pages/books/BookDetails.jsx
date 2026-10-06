import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowRight, FiEdit2, FiTrash2, FiEye, FiDownload, FiFile } from "react-icons/fi";
import api, { fileUrl } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageSpinner } from "../../components/ui/Spinner";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { BookTypeBadge } from "../../components/ui/BookType";

function formatSize(bytes) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} كيلوبايت`;
  return `${(kb / 1024).toFixed(1)} ميغابايت`;
}

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`/books/${id}`)
      .then(({ data }) => setBook(data))
      .catch(() => {
        toast.error("تعذّر جلب بيانات الكتاب");
        navigate("/books");
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/books/${id}`);
      toast.success("تم حذف الكتاب بنجاح");
      navigate("/books");
    } catch (err) {
      toast.error(err.response?.data?.message || "تعذّر حذف الكتاب");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!book) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-base font-semibold mb-4 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <FiArrowRight size={16} />
        رجوع
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 min-w-0 break-words">{book.title}</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigate(`/books/${id}/edit`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 text-base font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
            >
              <FiEdit2 size={17} />
              تعديل
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-base font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition"
            >
              <FiTrash2 size={17} />
              حذف
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-4 mt-5 sm:mt-6 text-base break-words">
          <div>
            <p className="text-slate-400 dark:text-slate-500 mb-0.5 font-semibold">المؤلف</p>
            <p className="text-slate-700 dark:text-slate-200 font-extrabold">
              {book.authors.map((a) => a.name).join("، ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 mb-0.5 font-semibold">دار النشر</p>
            <p className="text-slate-700 dark:text-slate-200 font-extrabold">{book.publisher_name || "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 mb-0.5 font-semibold">الفن</p>
            <p className="text-slate-700 dark:text-slate-200 font-extrabold">{book.art_name || "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 dark:text-slate-500 mb-0.5 font-semibold">نوع الكتب</p>
            <BookTypeBadge type={book.book_type} />
          </div>
          {book.book_type !== "risala" && (
            <div>
              <p className="text-slate-400 dark:text-slate-500 mb-0.5 font-semibold">عدد المجلدات</p>
              <p className="text-slate-700 dark:text-slate-200 font-extrabold">{book.volume_count || "—"}</p>
            </div>
          )}
          <div>
            <p className="text-slate-400 dark:text-slate-500 mb-0.5 font-semibold">الرف رقم</p>
            <p className="text-slate-700 dark:text-slate-200 font-extrabold">{book.shelf_number || "—"}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
          <h2 className="font-extrabold text-xl text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FiFile size={18} />
            ملفات PDF ({book.pdfs.length})
          </h2>

          {book.pdfs.length === 0 ? (
            <p className="text-slate-400 text-base font-semibold py-4">لا توجد ملفات PDF مرفقة بهذا الكتاب.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {book.pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <FiFile size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-700 dark:text-slate-200 truncate">{pdf.original_name}</p>
                      <p className="text-sm font-semibold text-slate-400">{formatSize(pdf.file_size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={fileUrl(`/api/books/${id}/pdfs/${pdf.id}/view`)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-base font-bold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition"
                    >
                      <FiEye size={16} />
                      قراءة
                    </a>
                    <a
                      href={fileUrl(`/api/books/${id}/pdfs/${pdf.id}/download`)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-base font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      <FiDownload size={16} />
                      تحميل
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="حذف الكتاب"
        message={`هل أنت متأكد من حذف كتاب "${book.title}"؟ سيتم حذف جميع ملفات PDF المرتبطة به.`}
      />
    </div>
  );
}
