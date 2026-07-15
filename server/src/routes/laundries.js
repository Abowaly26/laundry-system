// مسارات إدارة المغاسل - Laundries Management Routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authMiddleware);

/**
 * GET /api/laundries
 * عرض جميع المغاسل (super_owner فقط)
 */
router.get('/', authorizeRoles('super_owner'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        l.*,
        (SELECT COUNT(*) FROM users u WHERE u.laundry_id = l.id AND u.is_active = true AND u.role = 'admin') as admin_count,
        (SELECT COUNT(*) FROM users u WHERE u.laundry_id = l.id AND u.is_active = true AND u.role != 'admin' AND u.role != 'super_owner') as staff_count,
        (SELECT COUNT(*) FROM customers c WHERE c.laundry_id = l.id) as customers_count,
        (SELECT COUNT(*) FROM orders o WHERE o.laundry_id = l.id AND o.status NOT IN ('delivered', 'cancelled')) as active_orders_count,
        COALESCE((SELECT SUM(o.total_amount) FROM orders o WHERE o.laundry_id = l.id AND o.status != 'cancelled'), 0) as total_revenue,
        (SELECT u.email FROM users u WHERE u.laundry_id = l.id AND u.role = 'admin' ORDER BY u.created_at ASC LIMIT 1) as admin_email,
        (SELECT u.name FROM users u WHERE u.laundry_id = l.id AND u.role = 'admin' ORDER BY u.created_at ASC LIMIT 1) as admin_name
      FROM laundries l
      ORDER BY l.created_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List laundries error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المغاسل' });
  }
});

/**
 * GET /api/laundries/:id
 * عرض تفاصيل مغسلة واحدة
 */
router.get('/:id', authorizeRoles('super_owner'), async (req, res) => {
  try {
    const { id } = req.params;

    const laundryResult = await query('SELECT * FROM laundries WHERE id = $1', [id]);
    if (laundryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المغسلة غير موجودة' });
    }

    // جلب موظفي المغسلة
    const usersResult = await query(
      `SELECT id, name, email, role, is_active, created_at FROM users 
       WHERE laundry_id = $1 ORDER BY role, name`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...laundryResult.rows[0],
        users: usersResult.rows
      }
    });
  } catch (error) {
    console.error('Get laundry error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات المغسلة' });
  }
});

/**
 * POST /api/laundries
 * إنشاء مغسلة جديدة مع مدير لها (super_owner فقط)
 */
router.post('/', authorizeRoles('super_owner'), async (req, res) => {
  try {
    const {
      name, address, phone, currency, language,
      admin_name, admin_email, admin_password,
      plan_type, subscription_start_date, subscription_end_date, payment_status
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم المغسلة مطلوب' });
    }
    if (!admin_name || !admin_email || !admin_password) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المدير مطلوبة (الاسم، البريد، كلمة المرور)'
      });
    }

    // التحقق من عدم وجود البريد الإلكتروني مسبقاً
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [admin_email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر'
      });
    }

    // إنشاء المغسلة
    const laundryResult = await query(
      `INSERT INTO laundries (name, address, phone, currency, language, plan_type, subscription_start_date, subscription_end_date, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        name, 
        address || '', 
        phone || '', 
        currency || 'ر.س', 
        language || 'ar',
        plan_type || 'lifetime',
        subscription_start_date || null,
        subscription_end_date || null,
        payment_status || 'paid'
      ]
    );
    const laundry = laundryResult.rows[0];

    // إنشاء حساب المدير
    const passwordHash = await bcrypt.hash(admin_password, 10);
    const adminResult = await query(
      `INSERT INTO users (name, email, password_hash, role, laundry_id, is_active)
       VALUES ($1, $2, $3, 'admin', $4, true)
       RETURNING id, name, email, role, laundry_id, is_active, created_at`,
      [admin_name, admin_email, passwordHash, laundry.id]
    );

    res.status(201).json({
      success: true,
      message: `تم إنشاء مغسلة "${name}" بنجاح مع حساب المدير`,
      data: {
        laundry,
        admin: adminResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Create laundry error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المغسلة' });
  }
});

/**
 * PUT /api/laundries/:id
 * تحديث بيانات مغسلة (super_owner فقط)
 */
router.put('/:id', authorizeRoles('super_owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, address, phone, currency, language, is_active, 
      admin_email, admin_password,
      plan_type, subscription_start_date, subscription_end_date, payment_status,
      latitude, longitude
    } = req.body;

    const existing = await query('SELECT * FROM laundries WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المغسلة غير موجودة' });
    }

    const updateFields = [];
    const updateParams = [];
    let paramCount = 1;

    if (name !== undefined) { updateFields.push(`name = $${paramCount++}`); updateParams.push(name); }
    if (address !== undefined) { updateFields.push(`address = $${paramCount++}`); updateParams.push(address); }
    if (phone !== undefined) { updateFields.push(`phone = $${paramCount++}`); updateParams.push(phone); }
    if (currency !== undefined) { updateFields.push(`currency = $${paramCount++}`); updateParams.push(currency); }
    if (language !== undefined) { updateFields.push(`language = $${paramCount++}`); updateParams.push(language); }
    if (is_active !== undefined) { updateFields.push(`is_active = $${paramCount++}`); updateParams.push(is_active); }
    if (plan_type !== undefined) { updateFields.push(`plan_type = $${paramCount++}`); updateParams.push(plan_type); }
    if (subscription_start_date !== undefined) { updateFields.push(`subscription_start_date = $${paramCount++}`); updateParams.push(subscription_start_date); }
    if (subscription_end_date !== undefined) { updateFields.push(`subscription_end_date = $${paramCount++}`); updateParams.push(subscription_end_date); }
    if (payment_status !== undefined) { updateFields.push(`payment_status = $${paramCount++}`); updateParams.push(payment_status); }
    if (latitude !== undefined) { updateFields.push(`latitude = $${paramCount++}`); updateParams.push(latitude !== '' && latitude !== null ? parseFloat(latitude) : null); }
    if (longitude !== undefined) { updateFields.push(`longitude = $${paramCount++}`); updateParams.push(longitude !== '' && longitude !== null ? parseFloat(longitude) : null); }

    let laundryResult;
    if (updateFields.length > 0) {
      updateParams.push(id);
      laundryResult = await query(
        `UPDATE laundries SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        updateParams
      );
    } else {
      laundryResult = await query('SELECT * FROM laundries WHERE id = $1', [id]);
    }

    // تحديث بيانات حساب المدير إن طُلب
    if (admin_email || admin_password) {
      const adminRes = await query(
        `SELECT id FROM users WHERE laundry_id = $1 AND role = 'admin' ORDER BY created_at ASC LIMIT 1`,
        [id]
      );
      if (adminRes.rows.length > 0) {
        const adminId = adminRes.rows[0].id;
        const adminUpdateFields = [];
        const adminUpdateParams = [];
        let ap = 1;

        if (admin_email) {
          // Check email uniqueness
          const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [admin_email, adminId]);
          if (emailCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم من قِبَل مستخدم آخر' });
          }
          adminUpdateFields.push(`email = $${ap++}`);
          adminUpdateParams.push(admin_email);
        }
        if (admin_password) {
          const bcrypt = require('bcryptjs');
          const passwordHash = await bcrypt.hash(admin_password, 10);
          adminUpdateFields.push(`password_hash = $${ap++}`);
          adminUpdateParams.push(passwordHash);
        }

        if (adminUpdateFields.length > 0) {
          adminUpdateParams.push(adminId);
          await query(
            `UPDATE users SET ${adminUpdateFields.join(', ')} WHERE id = $${ap}`,
            adminUpdateParams
          );
        }
      }
    }

    res.json({ success: true, message: 'تم تحديث المغسلة بنجاح', data: laundryResult.rows[0] });
  } catch (error) {
    console.error('Update laundry error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المغسلة' });
  }
});

router.delete('/:id', authorizeRoles('super_owner'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM laundries WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المغسلة غير موجودة' });
    }

    // تعطيل المغسلة وموظفيها بدلاً من الحذف الكلي
    await query('UPDATE laundries SET is_active = false WHERE id = $1', [id]);
    await query('UPDATE users SET is_active = false WHERE laundry_id = $1', [id]);

    res.json({ success: true, message: 'تم تعطيل المغسلة وجميع موظفيها بنجاح' });
  } catch (error) {
    console.error('Delete laundry error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعطيل المغسلة' });
  }
});

/**
 * GET /api/laundries/:id/stats
 * إحصائيات مغسلة معينة (super_owner فقط)
 */
router.get('/:id/stats', authorizeRoles('super_owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const statsResult = await query(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE laundry_id = $1 AND DATE(created_at) = $2 AND status != 'cancelled') as today_orders,
        (SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN orders o ON p.order_id = o.id WHERE o.laundry_id = $1 AND DATE(p.created_at) = $2) as today_revenue,
        (SELECT COUNT(*) FROM orders WHERE laundry_id = $1 AND status NOT IN ('delivered', 'cancelled')) as active_orders,
        (SELECT COUNT(*) FROM customers WHERE laundry_id = $1) as total_customers,
        (SELECT COUNT(*) FROM users WHERE laundry_id = $1 AND is_active = true) as staff_count
    `, [id, today]);

    res.json({ success: true, data: statsResult.rows[0] });
  } catch (error) {
    console.error('Laundry stats error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات المغسلة' });
  }
});

module.exports = router;
