// مسارات المصادقة - Authentication Routes (PostgreSQL) - Multi-Laundry
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'laundry_smart_secret_key_2024';

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
      `SELECT u.*, l.name as laundry_name, l.currency as laundry_currency, l.is_active as laundry_active
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
          laundry_currency: user.laundry_currency
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
        laundry_currency: req.user.laundry_currency
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

module.exports = router;
