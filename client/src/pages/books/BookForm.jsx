import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiUploadCloud, FiFile, FiTrash2, FiArrowRight } from "react-icons/fi";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { FormField, TextInput, Select } from "../../components/ui/FormField";
import AuthorMultiSelect from "../../components/AuthorMultiSelect";
import CopyPdfSlots from "../../components/CopyPdfSlots";
import SearchableSelect from "../../components/ui/SearchableSelect";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { PageSpinner } from "../../components/ui/Spinner";
import { BOOK_TYPES } from "../../constants/bookTypes";

// يطابق الحد الأقصى في الخادم (server/schemas/bookSchema.js)
const MAX_COPIES = 100;

// عدد النسخات: أرقام صحيحة فقط — تُحوَّل الأرقام العربية (٠-٩) والفارسية (۰-۹) إلى 0-9 ويُحذف أي حرف آخر
function digitsOnly(value) {
  return value
    .replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf))
    .replace(/\D/g, "")
    .replace(/^0+/, "");
}

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
  const [fieldErrors, setFieldErrors] = useState({});

  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [arts, setArts] = useState([]);

  const [form, setForm] = useState({
    title: "",
    publisher_id: "",
    art_id: "",
    book_type: "",
    volume_count: "",
    has_copies: false,
    copy_count: "",
    copy_description: "",
    shelf_number: "",
    author_ids: [],
  });

  const [newPdfs, setNewPdfs] = useState([]);
  const [existingPdfs, setExistingPdfs] = useState([]);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [deletingPdf, setDeletingPdf] = useState(false);

  // ملفات النسخات المختارة ولم تُرفع بعد: { رقم النسخة: File }
  const [copyFiles, setCopyFiles] = useState({});
  // إعدادات النسخات كما هي محفوظة في الخادم (لمعرفة الخانات التي يمكن رفعها فوراً قبل الحفظ)
  const [savedCopies, setSavedCopies] = useState({ has_copies: false, copy_count: null });
  const [uploadingCopies, setUploadingCopies] = useState(null);

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
          book_type: data.book_type || "",
          volume_count: data.volume_count || "",
          has_copies: !!data.has_copies,
          copy_count: data.copy_count || "",
          copy_description: data.copy_description || "",
          shelf_number: data.shelf_number || "",
          author_ids: data.authors.map((a) => a.id),
        });
        setSavedCopies({ has_copies: !!data.has_copies, copy_count: data.copy_count });
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

  // تغيير نوع الكتب: عند اختيار "الرسالة" تُمسح قيمة عدد المجلدات لأنها لا تنطبق عليها
  function handleBookTypeChange(value) {
    setForm((f) => ({ ...f, book_type: value, volume_count: value === "mujallad" ? f.volume_count : "" }));
    setFieldErrors({});
    setError("");
  }

  const isMujallad = form.book_type === "mujallad";

  // عدد خانات رفع ملفات النسخات المعروضة (0 إذا لم يُدخل عدد صالح بعد)
  const copyCountText = String(form.copy_count).trim();
  const copyCountValid = /^\d+$/.test(copyCountText) && Number(copyCountText) >= 1 && Number(copyCountText) <= MAX_COPIES;
  const slotCount = form.has_copies && copyCountValid ? Number(copyCountText) : 0;

  const existingCopies = Object.fromEntries(existingPdfs.filter((p) => p.copy_number).map((p) => [p.copy_number, p]));
  const generalPdfs = existingPdfs.filter((p) => !p.copy_number);
  const maxExistingCopy = Math.max(0, ...Object.keys(existingCopies).map(Number));

  // إلغاء "له النسخات" يخفي عدد النسخات ووصف النسخ ويمسح قيمتهما — إلا إذا كانت هناك ملفات نسخات محفوظة (حتى لا تُفقد)
  function handleHasCopiesChange(checked) {
    if (!checked && maxExistingCopy > 0) {
      setFieldErrors((fe) => ({
        ...fe,
        has_copies: "لا يمكن إلغاء هذا الخيار لأن للكتاب ملفات نسخات محفوظة؛ احذف ملفات النسخات أولاً",
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      has_copies: checked,
      copy_count: checked ? f.copy_count : "",
      copy_description: checked ? f.copy_description : "",
    }));
    if (!checked) setCopyFiles({});
    setFieldErrors((fe) => ({ ...fe, has_copies: undefined, copy_count: undefined }));
  }

  function handleCopyPick(n, file) {
    if (file.type !== "application/pdf") {
      toast.error("يُسمح فقط برفع ملفات PDF");
      return;
    }
    setCopyFiles((prev) => ({ ...prev, [n]: file }));
  }

  function clearCopyPick(n) {
    setCopyFiles((prev) => {
      const next = { ...prev };
      delete next[n];
      return next;
    });
  }

  // الرفع الفوري (قبل الحفظ) متاح عند التعديل للنسخ ضمن العدد المحفوظ في الخادم
  const canUploadNow = (n) => isEdit && savedCopies.has_copies && n <= (savedCopies.copy_count || 0);
  const pendingCopyNumbers = Object.keys(copyFiles)
    .map(Number)
    .filter((n) => n <= slotCount)
    .sort((a, b) => a - b);
  const uploadableNow = pendingCopyNumbers.filter(canUploadNow);

  async function uploadCopiesNow(numbers) {
    setUploadingCopies(numbers.length === 1 ? numbers[0] : "all");
    const fd = new FormData();
    fd.append("copy_numbers", JSON.stringify(numbers));
    numbers.forEach((n) => fd.append("copy_pdfs", copyFiles[n]));
    try {
      const { data } = await api.post(`/books/${id}/copy-pdfs`, fd);
      setExistingPdfs(data.data.pdfs);
      setCopyFiles((prev) => {
        const next = { ...prev };
        numbers.forEach((n) => delete next[n]);
        return next;
      });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "تعذّر رفع الملفات");
    } finally {
      setUploadingCopies(null);
    }
  }

  function validate() {
    const errors = {};
    if (!form.book_type) errors.book_type = "نوع الكتب مطلوب";
    if (isMujallad) {
      if (!String(form.volume_count).trim()) errors.volume_count = "عدد المجلدات مطلوب";
    }
    if (form.has_copies) {
      if (copyCountText !== "" && !copyCountValid) {
        errors.copy_count = `عدد النسخات يجب أن يكون رقماً صحيحاً من 1 إلى ${MAX_COPIES}`;
      } else if (maxExistingCopy > slotCount) {
        errors.copy_count = `لا يمكن أن يكون عدد النسخات أقل من ${maxExistingCopy} لأن النسخة رقم ${maxExistingCopy} لها ملف PDF؛ احذف الملف أولاً`;
      }
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("اسم الكتب مطلوب");
      return;
    }
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("يرجى إكمال الحقول المطلوبة");
      return;
    }
    setError("");
    setSaving(true);

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("publisher_id", form.publisher_id || "");
    fd.append("art_id", form.art_id || "");
    fd.append("book_type", form.book_type);
    // عدد المجلدات يُرسل فقط للمجلد؛ للرسالة تُرسل فارغة (والخادم يحفظها NULL)
    fd.append("volume_count", isMujallad ? String(form.volume_count).trim() : "");
    fd.append("has_copies", form.has_copies ? "true" : "false");
    fd.append("copy_count", form.has_copies ? copyCountText : "");
    fd.append("copy_description", form.has_copies ? form.copy_description.trim() : "");
    fd.append("shelf_number", form.shelf_number || "");
    fd.append("author_ids", JSON.stringify(form.author_ids));
    newPdfs.forEach((f) => fd.append("pdfs", f));
    // تُرسل فقط الخانات التي اختير لها ملف؛ الخانات الفارغة لا تؤثر على الملفات المحفوظة
    if (pendingCopyNumbers.length) {
      fd.append("copy_numbers", JSON.stringify(pendingCopyNumbers));
      pendingCopyNumbers.forEach((n) => fd.append("copy_pdfs", copyFiles[n]));
    }

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
            <SearchableSelect
              options={publishers}
              value={form.publisher_id}
              onChange={(v) => setForm({ ...form, publisher_id: v })}
              emptyLabel="بدون دار نشر"
              searchPlaceholder="ابحث عن دار نشر..."
            />
          </FormField>

          <FormField label="الفن">
            <SearchableSelect
              options={arts}
              value={form.art_id}
              onChange={(v) => setForm({ ...form, art_id: v })}
              emptyLabel="بدون فن"
              searchPlaceholder="ابحث عن فن..."
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FormField label="نوع الكتب" required error={fieldErrors.book_type}>
            <Select
              value={form.book_type}
              onChange={(e) => handleBookTypeChange(e.target.value)}
              className={form.book_type ? "" : "text-slate-400 dark:text-slate-500"}
            >
              <option value="" disabled>
                اختر نوع الكتب
              </option>
              {BOOK_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="text-slate-700 dark:text-slate-200">
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          {/* عدد المجلدات: يظهر وتكون مطلوبة فقط عند اختيار "المجلد" */}
          {isMujallad && (
            <FormField label="عدد المجلدات" required error={fieldErrors.volume_count}>
              {/* نص حر: أرقام أو كلمات بأي لغة */}
              <TextInput
                value={form.volume_count}
                onChange={(e) => {
                  setForm({ ...form, volume_count: e.target.value });
                  if (fieldErrors.volume_count) setFieldErrors((fe) => ({ ...fe, volume_count: undefined }));
                }}
                placeholder="مثال: 3 أو المجلد الأول"
                maxLength={100}
                dir="auto"
              />
            </FormField>
          )}

          <FormField label="الرف رقم">
            <TextInput
              value={form.shelf_number}
              onChange={(e) => setForm({ ...form, shelf_number: e.target.value })}
              placeholder="مثال: A12"
            />
          </FormField>
        </div>

        <div className="mb-4">
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.has_copies}
              onChange={(e) => handleHasCopiesChange(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-base font-bold text-slate-700 dark:text-slate-300">له النسخات</span>
          </label>
          {fieldErrors.has_copies && <p className="text-red-500 text-sm font-semibold mt-1">{fieldErrors.has_copies}</p>}
        </div>

        {/* عدد النسخات ووصف النسخ: يظهران فقط عند تفعيل "له النسخات"؛ عدد النسخات يحدد عدد خانات رفع ملفات PDF */}
        {form.has_copies && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <FormField
                label={<>عدد النسخات <span className="text-sm font-semibold text-slate-400">(اختياري)</span></>}
                error={fieldErrors.copy_count}
              >
                <TextInput
                  type="text"
                  inputMode="numeric"
                  value={form.copy_count}
                  onChange={(e) => {
                    setForm({ ...form, copy_count: digitsOnly(e.target.value) });
                    if (fieldErrors.copy_count) setFieldErrors((fe) => ({ ...fe, copy_count: undefined }));
                  }}
                  placeholder="مثال: 5"
                  maxLength={3}
                />
              </FormField>

              <FormField
                label={<>وصف النسخ <span className="text-sm font-semibold text-slate-400">(اختياري)</span></>}
                error={fieldErrors.copy_description}
              >
                <TextInput
                  value={form.copy_description}
                  onChange={(e) => setForm({ ...form, copy_description: e.target.value })}
                  placeholder="مثال: النسخة الأصلية، Student Copy"
                  maxLength={500}
                  dir="auto"
                />
              </FormField>
            </div>

            {slotCount > 0 && (
              <FormField label={<>ملفات النسخات <span className="text-sm font-semibold text-slate-400">(اختياري)</span></>}>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-2">
                  {isEdit
                    ? "ارفع الملفات الناقصة أو استبدل الموجودة. الخانات الفارغة لا تؤثر على الملفات المحفوظة."
                    : "يمكنك رفع بعض الملفات أو لا شيء، وإكمال الباقي لاحقاً من خلال تعديل الكتاب."}
                </p>
                <CopyPdfSlots
                  bookId={id}
                  count={slotCount}
                  existing={existingCopies}
                  pending={copyFiles}
                  onPick={handleCopyPick}
                  onClear={clearCopyPick}
                  onDelete={setPdfToDelete}
                  onUploadNow={uploadCopiesNow}
                  canUploadNow={canUploadNow}
                  uploading={uploadingCopies}
                />
                {uploadableNow.length > 1 && (
                  <button
                    type="button"
                    onClick={() => uploadCopiesNow(uploadableNow)}
                    disabled={uploadingCopies !== null}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-base font-bold transition disabled:opacity-60"
                  >
                    <FiUploadCloud size={18} />
                    {uploadingCopies === "all" ? "جارٍ الرفع..." : `رفع كل الملفات المختارة (${uploadableNow.length})`}
                  </button>
                )}
              </FormField>
            )}
          </>
        )}

        {(!form.has_copies || generalPdfs.length > 0 || newPdfs.length > 0) && (
          <FormField
            label={
              <>
                {form.has_copies ? "ملفات PDF أخرى" : "ملفات PDF"}{" "}
                <span className="text-sm font-semibold text-slate-400">(اختياري)</span>
              </>
            }
          >
            {!form.has_copies && (
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
            )}

            {generalPdfs.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {generalPdfs.map((p) => (
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
        )}

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
            disabled={saving || uploadingCopies !== null}
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
