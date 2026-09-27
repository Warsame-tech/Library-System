import { useEffect, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import PdfActions from "../../components/ui/PdfActions";

const columns = ["الكتاب", "المؤلف", "دار النشر", "الفن", "عدد المجلدات", "الرف رقم", "ملف PDF"];

export default function AllBooksReport() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/books", { params: { search, page, limit: 12 } });
      setBooks(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || "تعذّر إنشاء التقرير");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="تقرير جميع الكتاب"
        subtitle="عرض شامل لكل بيانات الكتاب المسجّلة في المكتبة"
        search={search}
        onSearchChange={handleSearch}
        searchPlaceholder="ابحث باسم الكتاب، المؤلف، دار النشر أو الفن..."
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : books.length === 0 ? (
          <EmptyState icon={FiBookOpen} title="لا توجد بيانات" message="لا توجد كتاب مطابقة لمعايير البحث." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-primary-800 dark:text-primary-200 bg-primary-50/80 dark:bg-primary-950/50 border-b border-slate-100 dark:border-slate-700">
                  {columns.map((col) => (
                    <th key={col} className="text-right font-bold py-3 px-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/20"
                  >
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-lg text-slate-700 dark:text-slate-200 line-clamp-2 min-w-[130px] inline-block">
                        {b.title}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 min-w-[7rem]">
                      {b.authors.map((a) => a.name).join("، ") || "—"}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 min-w-[6rem]">{b.publisher_name || "—"}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 min-w-[5rem]">{b.art_name || "—"}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{b.volume_count || "—"}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{b.shelf_number || "—"}</td>
                    <td className="py-3 px-3">
                      <PdfActions bookId={b.id} pdfs={b.pdfs} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && books.length > 0 && (
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
