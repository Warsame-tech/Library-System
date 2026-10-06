import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiUploadCloud, FiFile, FiTrash2, FiArrowRight } from "react-icons/fi";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { FormField, TextInput, Select } from "../../components/ui/FormField";
import AuthorMultiSelect from "../../components/AuthorMultiSelect";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { PageSpinner } from "../../components/ui/Spinner";

function formatSize(bytes) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} كيلوبايت`;
  return `${(kb / 1024).toFixed(1)} ميغابايت`;
}

export default function BookForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [arts, setArts] = useState([]);

  const [form, setForm] = useState({
    title: "",
    publisher_id: "",
    art_id: "",
    volume_count: "",
    shelf_number: "",
    author_ids: [],
  });

  const [newPdfs, setNewPdfs] = useState([]);
  const [existingPdfs, setExistingPdfs] = useState([]);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [deletingPdf, setDeletingPdf] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/authors", { params: { all: true } }),
      api.get("/publishers", { params: { all: true } }),
      api.get("/arts", { params: { all: true } }),
    ]).then(([a, p, ar]) => {
      setAuthors(a.data.data);
      setPublishers(p.data.data);
      setArts(ar.data.data);
    });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/books/${id}`)
      .then(({ data }) => {
        setForm({
          title: data.title,
          publisher_id: data.publisher_id || "",
          art_id: data.art_id || "",
          volume_count: data.volume_count || "",
          shelf_number: data.shelf_number || "",
          author_ids: data.authors.map((a) => a.id),
        });
        setExistingPdfs(data.pdfs);
      })
      .catch(() => {
        toast.error("تعذّر جلب بيانات الكتاب");
        navigate("/books");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handlePdfChange(e) {
    const files = Array.from(e.target.files);
    setNewPdfs((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeNewPdf(idx) {
    setNewPdfs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirmDeleteExistingPdf() {
    setDeletingPdf(true);
    try {
      await api.delete(`/books/${id}/pdfs/${pdfToDelete.id}`);
      setExistingPdfs((prev) => prev.filter((p) => p.id !== pdfToDelete.id));
      toast.success("تم حذف الملف بنجاح");
      setPdfToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "تعذّر حذف الملف");
    } finally {
      setDeletingPdf(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("اسم الكتب مطلوب");
      return;
    }
    setError("");
    setSaving(true);

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("publisher_id", form.publisher_id || "");
    fd.append("art_id", form.art_id || "");
    fd.append("volume_count", form.volume_count || "");
    fd.append("shelf_number", form.shelf_number || "");
    fd.append("author_ids", JSON.stringify(form.author_ids));
    newPdfs.forEach((f) => fd.append("pdfs", f));

    try {
      if (isEdit) {
        await api.put(`/books/${id}`, fd);
        toast.success("تم تحديث الكتاب بنجاح");
      } else {
        await api.post("/books", fd);
        toast.success("تمت إضافة الكتاب بنجاح");
      }
      navigate("/books");
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء حفظ الكتاب");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-base font-semibold mb-4 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <FiArrowRight size={16} />
        رجوع
      </button>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">
        {isEdit ? "تعديل الكتاب" : "تسجيل كتاب جديد"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-base font-semibold border border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900">
            {error}
          </div>
        )}

        <FormField label="اسم الكتب" required>
          <TextInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="أدخل اسم الكتب"
            autoFocus
          />
        </FormField>

        <FormField label="المؤلف">
          <AuthorMultiSelect
            authors={authors}
            value={form.author_ids}
            onChange={(ids) => setForm({ ...form, author_ids: ids })}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormField label="دار النشر">
            <Select value={form.publisher_id} onChange={(e) => setForm({ ...form, publisher_id: e.target.value })}>
              <option value="">بدون دار نشر</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="الفن">
            <Select value={form.art_id} onChange={(e) => setForm({ ...form, art_id: e.target.value })}>
              <option value="">بدون فن</option>
              {arts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormField label="عدد المجلدات">
            <TextInput
              type="number"
              value={form.volume_count}
              onChange={(e) => setForm({ ...form, volume_count: e.target.value })}
              placeholder="مثال: 3"
              min="0"
            />
          </FormField>

          <FormField label="الرف رقم">
            <TextInput
              value={form.shelf_number}
              onChange={(e) => setForm({ ...form, shelf_number: e.target.value })}
              placeholder="مثال: A12"
            />
          </FormField>
        </div>

        <FormField label={<>ملفات PDF <span className="text-sm font-semibold text-slate-400">(اختياري)</span></>}>
          <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-6 px-3 text-center text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition">
            <span className="flex items-center gap-2">
              <FiUploadCloud size={20} />
              <span className="text-base font-bold">اضغط لاختيار ملف أو أكثر بصيغة PDF</span>
            </span>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
              {isEdit
                ? "الملفات الجديدة تُضاف إلى الملفات الحالية"
                : "يمكنك حفظ الكتاب بدون ملف، وإضافة ملف PDF لاحقاً من خلال تعديل الكتاب"}
            </span>
            <input type="file" accept="application/pdf" multiple onChange={handlePdfChange} className="hidden" />
          </label>

          {existingPdfs.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {existingPdfs.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FiFile className="text-primary-600 dark:text-primary-400 shrink-0" size={17} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{p.original_name}</p>
                      <p className="text-sm text-slate-400">{formatSize(p.file_size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfToDelete(p)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {newPdfs.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {newPdfs.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FiFile className="text-primary-600 dark:text-primary-400 shrink-0" size={17} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                      <p className="text-sm text-slate-400">{formatSize(f.size)} · جديد</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewPdf(idx)}
                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg shrink-0"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormField>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base transition disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الكتاب"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={!!pdfToDelete}
        onClose={() => setPdfToDelete(null)}
        onConfirm={confirmDeleteExistingPdf}
        loading={deletingPdf}
        title="حذف الملف"
        message={`هل أنت متأكد من حذف الملف "${pdfToDelete?.original_name}"؟`}
      />
    </div>
  );
}
