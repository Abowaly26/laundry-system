// مسارات المصادقة - Authentication Routes (PostgreSQL) - Multi-Laundry
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET key environment variable is not defined!');
}

/**
 * POST /api/auth/login
 * تسجيل الدخول بالبريد وكلمة المرور
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // التحقق من البيانات المطلوبة
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // البحث عن المستخدم مع بيانات المغسلة
    const result = await query(
      `SELECT u.*, l.name as laundry_name, l.phone as laundry_phone, l.address as laundry_address, l.currency as laundry_currency, l.language as laundry_language, l.is_active as laundry_active, l.latitude as laundry_lat, l.longitude as laundry_lng, l.tax_number as laundry_tax_number, l.vat_percent as laundry_vat_percent, l.country_code as laundry_country_code, l.plan_type as laundry_plan_type, l.subscription_start_date as laundry_subscription_start_date, l.subscription_end_date as laundry_subscription_end_date
       FROM users u 
       LEFT JOIN laundries l ON u.laundry_id = l.id 
       WHERE u.email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // التحقق من أن الحساب نشط
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'الحساب معطل - تواصل مع المدير'
      });
    }

    // التحقق من أن المغسلة نشطة (إذا لم يكن صاحب النظام)
    if (user.role !== 'super_owner' && user.laundry_id && !user.laundry_active) {
      return res.status(403).json({
        success: false,
        message: 'المغسلة التابع لها هذا الحساب معطلة حالياً. يرجى التواصل مع الإدارة'
      });
    }

    // التحقق من كلمة المرور
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // إنشاء توكن JWT (يتضمن laundry_id)
    const token = jwt.sign(
      { userId: user.id, role: user.role, laundry_id: user.laundry_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          laundry_id: user.laundry_id,
          laundry_name: user.laundry_name,
          laundry_phone: user.laundry_phone,
          laundry_address: user.laundry_address,
          laundry_currency: user.laundry_currency,
          laundry_language: user.laundry_language || 'ar',
          laundry_lat: user.laundry_lat,
          laundry_lng: user.laundry_lng,
          laundry_tax_number: user.laundry_tax_number,
          laundry_vat_percent: user.laundry_vat_percent,
          laundry_country_code: user.laundry_country_code,
          laundry_plan_type: user.laundry_plan_type,
          laundry_subscription_start_date: user.laundry_subscription_start_date,
          laundry_subscription_end_date: user.laundry_subscription_end_date
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/auth/me
 * الحصول على بيانات المستخدم الحالي
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    // إرجاع بيانات المستخدم مع laundry_id و laundry_name
    res.json({
      success: true,
      data: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        laundry_id: req.user.laundry_id,
        laundry_name: req.user.laundry_name,
        laundry_phone: req.user.laundry_phone,
        laundry_address: req.user.laundry_address,
        laundry_currency: req.user.laundry_currency,
        laundry_language: req.user.laundry_language || 'ar',
        laundry_lat: req.user.laundry_lat,
        laundry_lng: req.user.laundry_lng,
        laundry_tax_number: req.user.laundry_tax_number,
        laundry_vat_percent: req.user.laundry_vat_percent,
        laundry_country_code: req.user.laundry_country_code,
        laundry_plan_type: req.user.laundry_plan_type,
        laundry_subscription_start_date: req.user.laundry_subscription_start_date,
        laundry_subscription_end_date: req.user.laundry_subscription_end_date
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * PUT /api/auth/update-profile
 * تحديث بيانات الملف الشخصي مباشرة (بدون OTP)
 */
router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newName, newEmail, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ success: false, errorField: 'currentPassword', message: 'كلمة المرور الحالية مطلوبة' });
    }

    // التحقق من المستخدم
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // التحقق من كلمة المرور الحالية
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, errorField: 'currentPassword', message: 'كلمة المرور الحالية غير صحيحة' });
    }

    // التحقق من البريد الجديد إذا تم تغييره
    if (newEmail && newEmail !== user.email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, user.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, errorField: 'email', message: 'البريد الإلكتروني الجديد مستخدم بالفعل' });
      }
    }

    // تطبيق التغييرات
    const finalName = newName || user.name;
    const finalEmail = newEmail || user.email;
    
    let finalPassword = user.password_hash;
    if (newPassword) {
      finalPassword = await bcrypt.hash(newPassword, 10);
    }

    const result = await query(
      `UPDATE users SET 
        name = $1,
        email = $2,
        password_hash = $3,
        otp_code = NULL,
        otp_expiry = NULL,
        pending_email = NULL,
        pending_password = NULL,
        pending_name = NULL
       WHERE id = $4 RETURNING id, name, email, role, laundry_id`,
      [finalName, finalEmail, finalPassword, user.id]
    );

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      data: result.rows[0],
      requireRelogin: !!newPassword
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
  }
});

module.exports = router;
