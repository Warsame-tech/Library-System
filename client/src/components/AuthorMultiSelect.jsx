import { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiX } from "react-icons/fi";
import { DropdownSearchBox, NoResults, matchesSearch } from "./ui/DropdownSearch";

export default function AuthorMultiSelect({ authors, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selected = authors.filter((a) => value.includes(a.id));
  const filtered = authors.filter((a) => matchesSearch(a.name, query));

  function toggle(id) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[46px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center flex-wrap gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
      >
        {selected.length === 0 && <span className="text-slate-400 font-semibold px-1">اختر مؤلفاً واحداً أو أكثر</span>}
        {selected.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1 max-w-full break-all bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 text-sm font-semibold px-2.5 py-1 rounded-full"
          >
            {a.name}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                toggle(a.id);
              }}
              className="hover:text-red-500"
            >
              <FiX size={12} />
            </span>
          </span>
        ))}
        <FiChevronDown className={`mr-auto text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
          {authors.length > 0 && (
            <DropdownSearchBox
              value={query}
              onChange={setQuery}
              placeholder="ابحث عن مؤلف..."
              onEnter={() => filtered[0] && toggle(filtered[0].id)}
              onEscape={() => setOpen(false)}
            />
          )}
          <div className="py-1.5">
          {authors.length === 0 && (
            <p className="px-4 py-3 text-base font-semibold text-slate-400">لا يوجد مؤلفون مسجّلون بعد</p>
          )}
          {filtered.map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-2.5 px-4 py-2 text-base hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(a.id)}
                onChange={() => toggle(a.id)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-slate-700 dark:text-slate-200 font-bold">{a.name}</span>
            </label>
          ))}
          {query && filtered.length === 0 && <NoResults />}
          </div>
        </div>
      )}
    </div>
  );
}
