export default function Spinner({ size = 24, className = "" }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-emerald-600 dark:text-emerald-400 ${className}`}
      style={{ width: size, height: size }}
      role="status"
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size={36} />
    </div>
  );
}
