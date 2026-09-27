import { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { FormField, TextInput } from "../../components/ui/FormField";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";

const emptyForm = { name: "" };

export default function EntityListPage({ apiPath, entityLabel, sectionLabel, icon: Icon }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(apiPath, { params: { search, page, limit: 10 } });
      setItems(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || `تعذّر جلب ${entityLabel}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("الاسم مطلوب");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = { name: form.name.trim() };
      if (editing) {
        await api.put(`${apiPath}/${editing.id}`, payload);
        toast.success(`تم تحديث ${entityLabel} بنجاح`);
      } else {
        await api.post(apiPath, payload);
        toast.success(`تمت إضافة ${entityLabel} بنجاح`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`${apiPath}/${deleteTarget.id}`);
      toast.success(`تم حذف ${entityLabel} بنجاح`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || `تعذّر حذف ${entityLabel}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={sectionLabel}
        subtitle={`إدارة بيانات ${entityLabel} في المكتبة`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`بحث في ${sectionLabel}...`}
        onAdd={openAdd}
        addLabel="إضافة"
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={`لا توجد بيانات ${sectionLabel}`}
            message="لم يتم العثور على أي عناصر. جرّب إضافة عنصر جديد."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-right font-extrabold text-base sm:text-lg py-3 px-3 sm:px-4 whitespace-nowrap">الاسم</th>
                  <th className="text-right font-extrabold text-base sm:text-lg py-3 px-3 sm:px-4 whitespace-nowrap w-px">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                    <td className="py-3 px-3 sm:px-4 font-extrabold text-slate-700 dark:text-slate-200 break-words">{item.name}</td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          title="تعديل"
                          className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/30 transition"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="حذف"
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && items.length > 0 && (
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `تعديل ${entityLabel}` : `إضافة ${entityLabel}`} size="sm">
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-base font-semibold border border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900">
              {formError}
            </div>
          )}
          <FormField label="الاسم" required>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`أدخل اسم ${entityLabel}`}
              autoFocus
            />
          </FormField>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`حذف ${entityLabel}`}
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </div>
  );
}
