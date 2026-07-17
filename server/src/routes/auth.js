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
      `SELECT u.*, l.name as laundry_name, l.phone as laundry_phone, l.address as laundry_address, l.currency as laundry_currency, l.language as laundry_language, l.is_active as laundry_active, l.latitude as laundry_lat, l.longitude as laundry_lng, l.tax_number as laundry_tax_number, l.vat_percent as laundry_vat_percent, l.country_code as laundry_country_code
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
          laundry_country_code: user.laundry_country_code
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
        laundry_country_code: req.user.laundry_country_code
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
 * POST /api/auth/request-profile-otp
 * طلب تحديث البيانات (يرسل رمز OTP)
 */
router.post('/request-profile-otp', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword, newName } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية مطلوبة' });
    }

    // التحقق من المستخدم
    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // التحقق من كلمة المرور
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    // إنشاء كود OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // تشفير كلمة المرور الجديدة إذا تم تقديمها
    let hashedNewPassword = null;
    if (newPassword) {
      hashedNewPassword = await bcrypt.hash(newPassword, 10);
    }

    // حفظ بيانات الطلب والـ OTP في قاعدة البيانات
    await query(
      `UPDATE users SET 
        otp_code = $1, 
        otp_expiry = $2, 
        pending_email = $3, 
        pending_password = $4,
        pending_name = $5
       WHERE id = $6`,
      [otpCode, otpExpiry, newEmail || null, hashedNewPassword, newName || null, req.user.id]
    );

    // إرسال البريد الإلكتروني (نرسله للبريد الجديد إذا وجد، أو للبريد الحالي)
    const targetEmail = newEmail || user.email;
    const { sendOTPEmail } = require('../config/email');
    
    const isDev = !process.env.SMTP_EMAIL;
    let emailSent = false;
    
    if (!isDev) {
      try {
        await sendOTPEmail(targetEmail, otpCode, user.name);
        emailSent = true;
      } catch (emailError) {
        console.error('SMTP Email sending failed, using fallback code:', emailError);
      }
    }

    res.json({
      success: true,
      message: isDev 
        ? 'تم توليد الرمز بنجاح (بيئة تطويرية)' 
        : (emailSent 
            ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' 
            : 'تنبيه: فشل إرسال البريد الإلكتروني بسبب قيود السيرفر (Railway Trial / Google Blocks). تم توفير الرمز هنا لتستطيع إكمال العملية.'),
      devOtp: (isDev || !emailSent) ? otpCode : undefined
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة الطلب' });
  }
});

/**
 * PUT /api/auth/update-profile
 * تأكيد الـ OTP وتحديث البيانات
 */
router.put('/update-profile', authMiddleware, async (req, res) => {
  try {
    const { otpCode } = req.body;

    if (!otpCode) {
      return res.status(400).json({ success: false, message: 'رمز التحقق مطلوب' });
    }

    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // التحقق من الـ OTP
    if (!user.otp_code || user.otp_code !== otpCode) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ success: false, message: 'رمز التحقق منتهي الصلاحية' });
    }

    // التحقق من البريد الجديد إذا تم تغييره
    if (user.pending_email && user.pending_email !== user.email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [user.pending_email, user.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني الجديد مستخدم بالفعل' });
      }
    }

    // تطبيق التغييرات
    const finalName = user.pending_name || user.name;
    const finalEmail = user.pending_email || user.email;
    const finalPassword = user.pending_password || user.password_hash;

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
      requireRelogin: !!user.pending_password // إذا تم تغيير الباسورد يحتاج تسجيل دخول
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
  }
});

module.exports = router;
