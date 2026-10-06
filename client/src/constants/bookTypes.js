// أنواع الكتب: القيمة المخزّنة في قاعدة البيانات ← الاسم المعروض (مطابقة لـ server/schemas/bookSchema.js)
export const BOOK_TYPES = [
  { value: "risala", label: "الرسالة" },
  { value: "mujallad", label: "المجلد" },
];

export function bookTypeLabel(value) {
  return BOOK_TYPES.find((t) => t.value === value)?.label || "غير محدد";
}

// عدد المجلدات يُعرض فقط للمجلد (الرسالة ليس لها مجلدات)
export function volumesLabel(book) {
  if (book.book_type === "risala") return "—";
  return book.volume_count || "—";
}
