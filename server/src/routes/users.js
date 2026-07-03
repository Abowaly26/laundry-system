// مسارات إدارة المستخدمين - User Management Routes (PostgreSQL)
const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
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
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستخدمين' });
  }
});

/**
 * POST /api/users
 * إنشاء مستخدم جديد
 */
router.post('/', async (req, res) => {
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
    const existingResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل بالفعل'
      });
    }

    // تشفير كلمة المرور
    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active, created_at',
      [name, email, password_hash, role]
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: result.rows[0]
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;

    const existingResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const existing = existingResult.rows[0];

    // التحقق من عدم تكرار البريد
    if (email && email !== existing.email) {
      const emailExistsResult = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailExistsResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل بالفعل'
        });
      }
    }

    // بناء استعلام التحديث الديناميكي
    const updateFields = [];
    const updateParams = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      updateParams.push(name);
    }
    if (email) {
      updateFields.push(`email = $${paramCount++}`);
      updateParams.push(email);
    }
    if (role) {
      updateFields.push(`role = $${paramCount++}`);
      updateParams.push(role);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateParams.push(is_active);
    }
    if (password) {
      updateFields.push(`password_hash = $${paramCount++}`);
      const password_hash = await bcrypt.hash(password, 10);
      updateParams.push(password_hash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    updateParams.push(id);
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, name, email, role, is_active, created_at
    `;

    const result = await query(updateQuery, updateParams);

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: result.rows[0]
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // منع حذف المستخدم لنفسه
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك تعطيل حسابك الخاص'
      });
    }

    const existingResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await query('UPDATE users SET is_active = false WHERE id = $1', [id]);

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
