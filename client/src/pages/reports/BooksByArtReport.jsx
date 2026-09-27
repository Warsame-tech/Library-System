import { useEffect, useMemo, useState } from "react";
import { FiEye, FiDownload, FiFile, FiTag, FiBookOpen } from "react-icons/fi";
import api, { fileUrl } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import PageHeader from "../../components/ui/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

const UNASSIGNED = "__unassigned__";

function groupByArt(books) {
  const groups = new Map();
  for (const book of books) {
    const key = book.art_id ?? UNASSIGNED;
    if (!groups.has(key)) {
      groups.set(key, { name: book.art_name || "بدون فن", books: [] });
    }
    groups.get(key).books.push(book);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.name === "بدون فن") return 1;
    if (b.name === "بدون فن") return -1;
    return a.name.localeCompare(b.name, "ar");
  });
}

export default function BooksByArtReport() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const toast = useToast();

  function load() {
    setLoading(true);
    api
      .get("/books", { params: { search, limit: 1000, sort_by: "title", sort_dir: "ASC" } })
      .then(({ data }) => setBooks(data.data))
      .catch((err) => toast.error(err.response?.data?.message || "تعذّر إنشاء التقرير"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const groups = useMemo(() => groupByArt(books), [books]);

  return (
    <div>
      <PageHeader
        title="تقرير الكتاب حسب الفنون"
        subtitle="عرض الكتاب مجمّعة حسب كل فن/تصنيف"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث باسم الكتاب أو اسم الفن..."
      />

      {loading ? (
        <PageSpinner />
      ) : books.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <EmptyState icon={FiBookOpen} title="لا توجد بيانات" message="لا توجد كتاب مطابقة لمعايير البحث." />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div
              key={group.name}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center">
                    <FiTag size={16} />
                  </div>
                  <h2 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 min-w-0 break-words">{group.name}</h2>
                </div>
                <span className="shrink-0 whitespace-nowrap text-sm font-bold bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-2.5 py-1 rounded-full">
                  {group.books.length} كتاب
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {group.books.map((b) => (
                  <div key={b.id} className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 sm:px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 line-clamp-2 sm:line-clamp-1 break-words">
                        {b.title}
                      </h3>
                      <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 sm:line-clamp-1 break-words">
                        {b.authors.map((a) => a.name).join("، ") || "بدون مؤلف"}
                        {b.publisher_name && ` · ${b.publisher_name}`}
                        {b.shelf_number && ` · الرف ${b.shelf_number}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap min-w-0 lg:shrink-0 lg:max-w-[50%]">
                      {b.pdfs.length === 0 ? (
                        <span className="text-sm font-semibold text-slate-400">لا توجد ملفات PDF</span>
                      ) : (
                        b.pdfs.map((pdf) => (
                          <div key={pdf.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg px-2.5 py-1.5">
                            <FiFile className="text-rose-500 dark:text-rose-400" size={14} />
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-[110px] truncate">
                              {pdf.original_name}
                            </span>
                            <a
                              href={fileUrl(`/api/books/${b.id}/pdfs/${pdf.id}/view`)}
                              target="_blank"
                              rel="noreferrer"
                              title="قراءة"
                              className="p-1 rounded text-primary-600 hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-primary-900/40 transition"
                            >
                              <FiEye size={14} />
                            </a>
                            <a
                              href={fileUrl(`/api/books/${b.id}/pdfs/${pdf.id}/download`)}
                              title="تحميل"
                              className="p-1 rounded text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/40 transition"
                            >
                              <FiDownload size={14} />
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
