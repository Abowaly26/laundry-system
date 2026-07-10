// مسارات إدارة المستخدمين - User Management Routes (PostgreSQL) - Multi-Laundry
const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authMiddleware);
// فقط admin و super_owner يمكنهم الوصول
router.use(authorizeRoles('admin', 'super_owner'));

/**
 * GET /api/users
 * عرض المستخدمين:
 * - super_owner: يرى الكل + فلتر اختياري بـ laundry_id
 * - admin: يرى موظفي مغسلته فقط
 */
router.get('/', async (req, res) => {
  try {
    const { laundry_id } = req.query;

    let sqlQuery;
    let params = [];

    if (req.user.role === 'super_owner') {
      // super_owner يرى الكل (مع فلتر اختياري)
      if (laundry_id) {
        sqlQuery = `
          SELECT u.id, u.name, u.email, u.role, u.is_active, u.laundry_id, u.created_at,
                 l.name as laundry_name
          FROM users u
          LEFT JOIN laundries l ON u.laundry_id = l.id
          WHERE u.laundry_id = $1 AND u.role != 'super_owner'
          ORDER BY u.created_at DESC
        `;
        params = [laundry_id];
      } else {
        sqlQuery = `
          SELECT u.id, u.name, u.email, u.role, u.is_active, u.laundry_id, u.created_at,
                 l.name as laundry_name
          FROM users u
          LEFT JOIN laundries l ON u.laundry_id = l.id
          WHERE u.role != 'super_owner'
          ORDER BY l.name NULLS LAST, u.created_at DESC
        `;
      }
    } else {
      // admin يرى موظفي مغسلته فقط (وليس super_owner ولا admin مغاسل أخرى)
      sqlQuery = `
        SELECT u.id, u.name, u.email, u.role, u.is_active, u.laundry_id, u.created_at,
               l.name as laundry_name
        FROM users u
        LEFT JOIN laundries l ON u.laundry_id = l.id
        WHERE u.laundry_id = $1 AND u.role != 'super_owner'
        ORDER BY u.created_at DESC
      `;
      params = [req.user.laundry_id];
    }

    const result = await query(sqlQuery, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستخدمين' });
  }
});

/**
 * POST /api/users
 * إنشاء مستخدم جديد:
 * - super_owner: يمكنه إنشاء أي دور في أي مغسلة
 * - admin: يمكنه إنشاء cashier/worker في مغسلته فقط
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, laundry_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (الاسم، البريد، كلمة المرور، الدور)'
      });
    }

    // تحديد المغسلة
    let targetLaundryId;
    if (req.user.role === 'super_owner') {
      // super_owner يمكنه تحديد المغسلة
      targetLaundryId = laundry_id || null;

      // التحقق من الدور
      if (!['admin', 'cashier', 'worker'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'الدور يجب أن يكون: admin, cashier, أو worker'
        });
      }
    } else {
      // admin يضيف موظفين لمغسلته فقط
      targetLaundryId = req.user.laundry_id;

      // admin لا يمكنه إنشاء admin آخر أو super_owner
      if (!['cashier', 'worker'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'كمدير، يمكنك فقط إضافة موظف استقبال أو عامل تشغيل'
        });
      }
    }

    // التحقق من عدم وجود البريد مسبقاً
    const existingResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل بالفعل' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, laundry_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, laundry_id, is_active, created_at`,
      [name, email, password_hash, role, targetLaundryId]
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
 * تحديث بيانات المستخدم (مع التحقق من صلاحيات المغسلة)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;

    const existingResult = await query(
      'SELECT u.*, l.name as laundry_name FROM users u LEFT JOIN laundries l ON u.laundry_id = l.id WHERE u.id = $1',
      [id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const existing = existingResult.rows[0];

    // التحقق من الصلاحية: admin يعدل موظفي مغسلته فقط
    if (req.user.role === 'admin') {
      if (existing.laundry_id !== req.user.laundry_id) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكنك تعديل موظفين من مغاسل أخرى'
        });
      }
      // admin لا يمكنه تغيير دوره لـ admin أو super_owner
      if (role && !['cashier', 'worker'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكنك تعيين هذا الدور'
        });
      }
    }

    // التحقق من عدم تكرار البريد
    if (email && email !== existing.email) {
      const emailExistsResult = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailExistsResult.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل بالفعل' });
      }
    }

    const updateFields = [];
    const updateParams = [];
    let paramCount = 1;

    if (name) { updateFields.push(`name = $${paramCount++}`); updateParams.push(name); }
    if (email) { updateFields.push(`email = $${paramCount++}`); updateParams.push(email); }
    if (role) { updateFields.push(`role = $${paramCount++}`); updateParams.push(role); }
    if (is_active !== undefined) { updateFields.push(`is_active = $${paramCount++}`); updateParams.push(is_active); }
    if (password) {
      updateFields.push(`password_hash = $${paramCount++}`);
      updateParams.push(await bcrypt.hash(password, 10));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    updateParams.push(id);
    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, email, role, laundry_id, is_active, created_at`,
      updateParams
    );

    res.json({ success: true, message: 'تم تحديث المستخدم بنجاح', data: result.rows[0] });
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

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تعطيل حسابك الخاص' });
    }

    const existingResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const existing = existingResult.rows[0];

    // admin يعطل موظفي مغسلته فقط
    if (req.user.role === 'admin' && existing.laundry_id !== req.user.laundry_id) {
      return res.status(403).json({
        success: false,
        message: 'لا يمكنك تعطيل موظفين من مغاسل أخرى'
      });
    }

    await query('UPDATE users SET is_active = false WHERE id = $1', [id]);

    res.json({ success: true, message: 'تم تعطيل المستخدم بنجاح' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعطيل المستخدم' });
  }
});

module.exports = router;
