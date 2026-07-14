// مسارات الخدمات - Service Routes (Multi-Laundry)
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

/**
 * GET /api/services
 * عرض الخدمات مفلترة بالمغسلة
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { all } = req.query;
    const isSuperOwner = req.user.role === 'super_owner';
    const isAdmin = req.user.role === 'admin';
    const laundryId = req.user.laundry_id;

    let result;
    const showAll = all === 'true' && (isAdmin || isSuperOwner);

    if (isSuperOwner) {
      // super_owner يرى كل الخدمات
      result = await query('SELECT * FROM services ORDER BY laundry_id, name_ar ASC');
    } else if (showAll) {
      // admin يرى كل خدمات مغسلته
      result = await query('SELECT * FROM services WHERE laundry_id = $1 ORDER BY created_at DESC', [laundryId]);
    } else {
      // الباقي يرون الخدمات النشطة لمغسلتهم
      result = await query('SELECT * FROM services WHERE is_active = true AND laundry_id = $1 ORDER BY name_ar ASC', [laundryId]);
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمات' });
  }
});

/**
 * GET /api/services/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const isSuperOwner = req.user.role === 'super_owner';
    let result;

    if (isSuperOwner) {
      result = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    } else {
      result = await query('SELECT * FROM services WHERE id = $1 AND laundry_id = $2', [req.params.id, req.user.laundry_id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمة' });
  }
});

/**
 * POST /api/services
 * إنشاء خدمة (المدير فقط) - مرتبطة بمغسلته
 */
router.post('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, name_ar, price, unit, estimated_hours } = req.body;

    if (!name || !name_ar || price === undefined) {
      return res.status(400).json({ success: false, message: 'اسم الخدمة والسعر مطلوبان' });
    }

    const result = await query(
      'INSERT INTO services (name, name_ar, price, unit, estimated_hours, laundry_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, name_ar, price, unit || 'piece', estimated_hours || 24, req.user.laundry_id]
    );

    res.status(201).json({ success: true, message: 'تم إنشاء الخدمة بنجاح', data: result.rows[0] });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الخدمة' });
  }
});

/**
 * PUT /api/services/:id
 */
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, price, unit, estimated_hours, is_active } = req.body;

    let existingResult;
    if (req.user.role === 'super_owner') {
      existingResult = await query('SELECT * FROM services WHERE id = $1', [id]);
    } else {
      existingResult = await query('SELECT * FROM services WHERE id = $1 AND laundry_id = $2', [id, req.user.laundry_id]);
    }

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }

    const existing = existingResult.rows[0];
    await query(`
      UPDATE services 
      SET name = $1, name_ar = $2, price = $3, unit = $4, estimated_hours = $5, is_active = $6
      WHERE id = $7
    `, [
      name || existing.name, name_ar || existing.name_ar,
      price !== undefined ? price : existing.price,
      unit || existing.unit, estimated_hours || existing.estimated_hours,
      is_active !== undefined ? is_active : existing.is_active, id
    ]);

    const serviceResult = await query('SELECT * FROM services WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم تحديث الخدمة بنجاح', data: serviceResult.rows[0] });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الخدمة' });
  }
});

/**
 * DELETE /api/services/:id
 */
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    let existingResult;
    if (req.user.role === 'super_owner') {
      existingResult = await query('SELECT * FROM services WHERE id = $1', [id]);
    } else {
      existingResult = await query('SELECT * FROM services WHERE id = $1 AND laundry_id = $2', [id, req.user.laundry_id]);
    }

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }

    await query('UPDATE services SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم تعطيل الخدمة بنجاح' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعطيل الخدمة' });
  }
});

module.exports = router;
