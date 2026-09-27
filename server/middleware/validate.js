// Middleware عام للتحقق من صحة بيانات الطلب باستخدام Zod
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        message: firstIssue?.message || 'بيانات الطلب غير صالحة',
        errors: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;
