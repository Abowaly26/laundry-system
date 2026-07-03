// مسارات الخدمات - Service Routes
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

/**
 * GET /api/services
 * عرض جميع الخدمات النشطة
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { all } = req.query;
    
    // إذا طلب المدير عرض الكل بما فيها غير النشطة
    let result;
    if (all === 'true' && req.user.role === 'admin') {
      result = await query('SELECT * FROM services ORDER BY created_at DESC');
    } else {
      result = await query('SELECT * FROM services WHERE is_active = true ORDER BY name_ar ASC');
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمات' });
  }
});

/**
 * GET /api/services/:id
 * عرض خدمة واحدة
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
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
 * إنشاء خدمة جديدة (المدير فقط)
 */
router.post('/', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, name_ar, price, unit, estimated_hours } = req.body;

    if (!name || !name_ar || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'اسم الخدمة والسعر مطلوبان'
      });
    }

    const result = await query(
      'INSERT INTO services (name, name_ar, price, unit, estimated_hours) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, name_ar, price, unit || 'piece', estimated_hours || 24]
    );

    const service = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الخدمة بنجاح',
      data: service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الخدمة' });
  }
});

/**
 * PUT /api/services/:id
 * تحديث خدمة (المدير فقط)
 */
router.put('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, price, unit, estimated_hours, is_active } = req.body;

    const existingResult = await query('SELECT * FROM services WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }
    const existing = existingResult.rows[0];

    await query(`
      UPDATE services 
      SET name = $1, name_ar = $2, price = $3, unit = $4, estimated_hours = $5, is_active = $6
      WHERE id = $7
    `, [
      name || existing.name,
      name_ar || existing.name_ar,
      price !== undefined ? price : existing.price,
      unit || existing.unit,
      estimated_hours || existing.estimated_hours,
      is_active !== undefined ? is_active : existing.is_active,
      id
    ]);

    const serviceResult = await query('SELECT * FROM services WHERE id = $1', [id]);
    const service = serviceResult.rows[0];

    res.json({
      success: true,
      message: 'تم تحديث الخدمة بنجاح',
      data: service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الخدمة' });
  }
});

/**
 * DELETE /api/services/:id
 * حذف ناعم للخدمة (تعطيل) - المدير فقط
 */
router.delete('/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await query('SELECT * FROM services WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }

    // حذف ناعم - تعطيل الخدمة فقط
    await query('UPDATE services SET is_active = false WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'تم تعطيل الخدمة بنجاح'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعطيل الخدمة' });
  }
});

module.exports = router;
