// التحقق من الصلاحيات - Role-Based Access Control Middleware

/**
 * التحقق من أن دور المستخدم ضمن الأدوار المسموحة
 * @param {string[]} allowedRoles - مصفوفة الأدوار المسموحة مثل ['admin', 'cashier']
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
