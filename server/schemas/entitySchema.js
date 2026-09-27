const { z } = require('zod');

// يُستخدم للفنون والمؤلفين ودور النشر (id, name فقط)
const entityNameSchema = z.object({
  name: z.string().trim().min(1, 'الاسم مطلوب').max(150, 'الاسم طويل جداً (150 حرف كحد أقصى)'),
});

module.exports = { entityNameSchema };
