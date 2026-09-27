const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب').max(100, 'اسم المستخدم طويل جداً'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(200, 'كلمة المرور طويلة جداً'),
});

module.exports = { loginSchema };
