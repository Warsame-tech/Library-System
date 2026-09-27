import { FiInbox } from "react-icons/fi";

export default function EmptyState({ title = "لا توجد بيانات", message = "لم يتم العثور على أي عناصر لعرضها هنا.", icon: Icon = FiInbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
        <Icon size={28} />
      </div>
      <h3 className="text-slate-700 dark:text-slate-200 font-extrabold text-lg mb-1">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-base font-semibold max-w-sm">{message}</p>
    </div>
  );
}
