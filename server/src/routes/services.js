// مسارات الخدمات - Service Routes
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

/**
 * GET /api/services
 * عرض جميع الخدمات النشطة
 */
router.get('/', authMiddleware, (req, res) => {
  try {
    const { all } = req.query;
    
    // إذا طلب المدير عرض الكل بما فيها غير النشطة
    let services;
    if (all === 'true' && req.user.role === 'admin') {
      services = db.prepare('SELECT * FROM services ORDER BY created_at DESC').all();
    } else {
      services = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY name_ar ASC').all();
    }

    res.json({ success: true, data: services });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمات' });
  }
});

/**
 * GET /api/services/:id
 * عرض خدمة واحدة
 */
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمة' });
  }
});

/**
 * POST /api/services
 * إنشاء خدمة جديدة (المدير فقط)
 */
router.post('/', authMiddleware, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, name_ar, price, unit, estimated_hours } = req.body;

    if (!name || !name_ar || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'اسم الخدمة والسعر مطلوبان'
      });
    }

    const result = db.prepare(
      'INSERT INTO services (name, name_ar, price, unit, estimated_hours) VALUES (?, ?, ?, ?, ?)'
    ).run(name, name_ar, price, unit || 'piece', estimated_hours || 24);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);

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
router.put('/:id', authMiddleware, authorizeRoles('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, price, unit, estimated_hours, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }

    db.prepare(`
      UPDATE services 
      SET name = ?, name_ar = ?, price = ?, unit = ?, estimated_hours = ?, is_active = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      name_ar || existing.name_ar,
      price !== undefined ? price : existing.price,
      unit || existing.unit,
      estimated_hours || existing.estimated_hours,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      id
    );

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

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
router.delete('/:id', authMiddleware, authorizeRoles('admin'), (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    }

    // حذف ناعم - تعطيل الخدمة فقط
    db.prepare('UPDATE services SET is_active = 0 WHERE id = ?').run(id);

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
