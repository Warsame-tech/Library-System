const { z } = require('zod');

// أنواع الكتب: القيمة المخزّنة في قاعدة البيانات ← الاسم المعروض
const BOOK_TYPES = { risala: 'الرسالة', mujallad: 'المجلد' };

// بيانات نموذج الكتاب تصل كسلاسل نصية (multipart/form-data عبر multer)
const optionalNumericId = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+$/.test(v), 'قيمة غير صالحة')
  .optional();

const bookSchema = z
  .object({
    title: z.string().trim().min(1, 'اسم الكتاب مطلوب').max(255, 'اسم الكتاب طويل جداً'),
    publisher_id: optionalNumericId,
    art_id: optionalNumericId,
    book_type: z.enum(Object.keys(BOOK_TYPES), { error: 'نوع الكتب مطلوب (الرسالة أو المجلد)' }),
    volume_count: z.string().trim().optional(),
    shelf_number: z.string().trim().max(50, 'رقم الرف طويل جداً').optional(),
    author_ids: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.book_type !== 'mujallad') return;
    const v = data.volume_count || '';
    if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 100000) {
      ctx.addIssue({ code: 'custom', path: ['volume_count'], message: 'عدد المجلدات مطلوب للمجلد ويجب أن يكون رقماً صحيحاً أكبر من صفر' });
    }
  })
  // عدد المجلدات يُحفظ فقط للمجلد؛ للرسالة تُحفظ NULL مهما كانت القيمة المرسلة
  .transform((data) => ({
    ...data,
    volume_count: data.book_type === 'mujallad' ? Number(data.volume_count) : null,
  }));

module.exports = { bookSchema, BOOK_TYPES };
