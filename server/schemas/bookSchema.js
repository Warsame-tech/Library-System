const { z } = require('zod');

// بيانات نموذج الكتاب تصل كسلاسل نصية (multipart/form-data عبر multer)
const optionalNumericId = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+$/.test(v), 'قيمة غير صالحة')
  .optional();

const bookSchema = z.object({
  title: z.string().trim().min(1, 'اسم الكتاب مطلوب').max(255, 'اسم الكتاب طويل جداً'),
  publisher_id: optionalNumericId,
  art_id: optionalNumericId,
  volume_count: optionalNumericId,
  shelf_number: z.string().trim().max(50, 'رقم الرف طويل جداً').optional(),
  author_ids: z.string().optional(),
});

module.exports = { bookSchema };
