// التحقق من الصلاحيات - Role-Based Access Control Middleware

/**
 * التحقق من أن دور المستخدم ضمن الأدوار المسموحة
 * @param {string[]} allowedRoles - مصفوفة الأدوار المسموحة مثل ['admin', 'cashier']
 * ملاحظة: super_owner يتجاوز جميع القيود تلقائياً
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // التأكد من وجود بيانات المستخدم (يجب أن يكون middleware المصادقة قد عمل أولاً)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يرجى تسجيل الدخول أولاً'
      });
    }

    // super_owner يملك صلاحيات كاملة دون قيود
    if (req.user.role === 'super_owner') {
      return next();
    }

    // التحقق من أن دور المستخدم ضمن الأدوار المسموحة
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا المورد'
      });
    }

    next();
  };
}

module.exports = authorizeRoles;

