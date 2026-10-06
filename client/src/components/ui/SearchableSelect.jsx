import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { DropdownSearchBox, NoResults, matchesSearch } from "./DropdownSearch";

// قائمة منسدلة لاختيار عنصر واحد مع مربع بحث (بديل لعنصر <select>)
// options: [{ id, name }]  — value: معرّف العنصر المختار أو "" — emptyLabel: نص خيار "بدون"
export default function SearchableSelect({ options, value, onChange, emptyLabel, searchPlaceholder }) {
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

  const selected = options.find((o) => String(o.id) === String(value));
  const filtered = options.filter((o) => matchesSearch(o.name, query));

  function choose(id) {
    onChange(id === "" ? "" : String(id));
    setOpen(false);
  }

  const itemClass = (active) =>
    `w-full flex items-center justify-between gap-2 px-4 py-2 text-right text-base transition ${
      active
        ? "bg-primary-50 text-primary-700 font-bold dark:bg-primary-900/30 dark:text-primary-300"
        : "text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50"
    }`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-2 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition"
      >
        <span className={`truncate ${selected ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
          {selected ? selected.name : emptyLabel}
        </span>
        <FiChevronDown className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
          <DropdownSearchBox
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
            onEnter={() => filtered[0] && choose(filtered[0].id)}
            onEscape={() => setOpen(false)}
          />
          <div className="py-1.5">
            {!query && (
              <button type="button" onClick={() => choose("")} className={itemClass(!selected)}>
                {emptyLabel}
                {!selected && <FiCheck className="shrink-0" size={16} />}
              </button>
            )}
            {filtered.map((o) => {
              const active = String(o.id) === String(value);
              return (
                <button key={o.id} type="button" onClick={() => choose(o.id)} className={itemClass(active)}>
                  <span className="truncate">{o.name}</span>
                  {active && <FiCheck className="shrink-0" size={16} />}
                </button>
              );
            })}
            {query && filtered.length === 0 && <NoResults />}
          </div>
        </div>
      )}
    </div>
  );
}
