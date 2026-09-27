export function FormField({ label, required, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-base font-bold text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-sm font-semibold mt-1">{error}</p>}
    </div>
  );
}

const baseInput =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed";

export function TextInput(props) {
  return <input {...props} className={`${baseInput} ${props.className || ""}`} />;
}

export function TextArea(props) {
  return <textarea {...props} rows={props.rows || 4} className={`${baseInput} resize-none ${props.className || ""}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${baseInput} ${props.className || ""}`}>
      {children}
    </select>
  );
}
