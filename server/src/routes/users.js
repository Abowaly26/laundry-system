// مسارات إدارة المستخدمين - User Management Routes (Admin Only)
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

// تطبيق المصادقة وصلاحية المدير على جميع المسارات
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

/**
 * GET /api/users
 * عرض جميع المستخدمين
 */
router.get('/', (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    ).all();

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستخدمين' });
  }
});

/**
 * POST /api/users
 * إنشاء مستخدم جديد
 */
router.post('/', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (الاسم، البريد، كلمة المرور، الدور)'
      });
    }

    // التحقق من الدور
    if (!['admin', 'cashier', 'worker'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'الدور يجب أن يكون: admin, cashier, أو worker'
      });
    }

    // التحقق من عدم وجود البريد مسبقاً
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل بالفعل'
      });
    }

    // تشفير كلمة المرور
    const password_hash = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, password_hash, role);

    const user = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المستخدم' });
  }
});

/**
 * PUT /api/users/:id
 * تحديث بيانات المستخدم
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;

    const existing = db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // التحقق من عدم تكرار البريد
    if (email && email !== existing.email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل بالفعل'
        });
      }
    }

    // بناء استعلام التحديث
    const updateFields = [];
    const updateParams = [];

    if (name) { updateFields.push('name = ?'); updateParams.push(name); }
    if (email) { updateFields.push('email = ?'); updateParams.push(email); }
    if (role) { updateFields.push('role = ?'); updateParams.push(role); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); updateParams.push(is_active ? 1 : 0); }
    if (password) {
      updateFields.push('password_hash = ?');
      updateParams.push(bcrypt.hashSync(password, 10));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    updateParams.push(id);
    db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

    const user = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المستخدم' });
  }
});

/**
 * DELETE /api/users/:id
 * تعطيل المستخدم (حذف ناعم)
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // منع حذف المستخدم لنفسه
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك تعطيل حسابك الخاص'
      });
    }

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'تم تعطيل المستخدم بنجاح'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعطيل المستخدم' });
  }
});

module.exports = router;
