// التحقق من المصادقة - JWT Authentication Middleware (PostgreSQL)
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'laundry_smart_secret_key_2024';

/**
 * التحقق من توكن JWT وإرفاق بيانات المستخدم بالطلب
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يرجى تسجيل الدخول'
      });
    }

    const token = authHeader.split(' ')[1];

    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, JWT_SECRET);

    // التحقق من وجود المستخدم وأنه نشط
    const result = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'الحساب معطل - تواصل مع المدير'
      });
    }

    // إرفاق بيانات المستخدم بالطلب
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'توكن غير صالح'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة'
    });
  }
}

module.exports = authMiddleware;
