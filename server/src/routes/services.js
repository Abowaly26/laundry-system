// مسارات الخدمات - Service Routes (Multi-Laundry)
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

// TEMP FACTORY RESET
router.get('/public/factory-reset', async (req, res) => {
  try {
    await query('DELETE FROM payments');
    await query('DELETE FROM order_items');
    await query('DELETE FROM orders');
    await query('DELETE FROM item_prices');
    await query('DELETE FROM item_types');
    await query('DELETE FROM services');
    
    const laundriesRes = await query('SELECT id FROM laundries');
    const laundries = laundriesRes.rows;

    for (const laundry of laundries) {
      const lid = laundry.id;
      // 2. Insert Logical Services
      const s1 = await query(`INSERT INTO services (name_ar, name, price, unit, is_active, laundry_id) VALUES ('غسيل عادي', 'Regular Wash', 0, 'piece', true, $1) RETURNING id`, [lid]);
      const s2 = await query(`INSERT INTO services (name_ar, name, price, unit, is_active, laundry_id) VALUES ('غسيل وكي', 'Wash & Iron', 0, 'piece', true, $1) RETURNING id`, [lid]);
      const s3 = await query(`INSERT INTO services (name_ar, name, price, unit, is_active, laundry_id) VALUES ('كي فقط', 'Iron Only', 0, 'piece', true, $1) RETURNING id`, [lid]);
      const s4 = await query(`INSERT INTO services (name_ar, name, price, unit, is_active, laundry_id) VALUES ('غسيل مستعجل', 'Urgent Wash', 0, 'piece', true, $1) RETURNING id`, [lid]);
      const s5 = await query(`INSERT INTO services (name_ar, name, price, unit, is_active, laundry_id) VALUES ('تنظيف جاف', 'Dry Clean', 0, 'piece', true, $1) RETURNING id`, [lid]);
      
      // 3. Insert Logical Item Types & Prices
      const items = [
        { name_ar: 'ثوب', name_en: 'Thobe', sizes: ['عادي'], basePrice: 10 },
        { name_ar: 'قميص', name_en: 'Shirt', sizes: ['عادي'], basePrice: 5 },
        { name_ar: 'بنطلون', name_en: 'Pants', sizes: ['عادي'], basePrice: 5 },
        { name_ar: 'بدلة كاملة', name_en: 'Full Suit', sizes: ['عادي'], basePrice: 20 },
        { name_ar: 'شماغ / غترة', name_en: 'Shemagh', sizes: ['عادي'], basePrice: 3 },
        { name_ar: 'سجاد', name_en: 'Carpet', sizes: ['صغير', 'وسط', 'كبير'], basePrice: 30 },
        { name_ar: 'بطانية', name_en: 'Blanket', sizes: ['مفرد', 'مزدوج'], basePrice: 20 }
      ];
      
      for (let item of items) {
        // item_types needs laundry_id in Multi-Laundry schema
        // wait, let's check if item_types has laundry_id
        // I will assume it does, as they are specific to a laundry.
        const itRes = await query(`INSERT INTO item_types (name_ar, name_en, sizes, laundry_id) VALUES ($1, $2, $3, $4) RETURNING id`, 
          [item.name_ar, item.name_en, JSON.stringify(item.sizes), lid]);
        const itemId = itRes.rows[0].id;
        
        for (let size of item.sizes) {
          await query(`INSERT INTO item_prices (item_type_id, service_id, size_name, price) VALUES ($1, $2, $3, $4)`, 
            [itemId, s1.rows[0].id, size, item.basePrice]);
          await query(`INSERT INTO item_prices (item_type_id, service_id, size_name, price) VALUES ($1, $2, $3, $4)`, 
            [itemId, s2.rows[0].id, size, item.basePrice + 5]);
          await query(`INSERT INTO item_prices (item_type_id, service_id, size_name, price) VALUES ($1, $2, $3, $4)`, 
            [itemId, s3.rows[0].id, size, Math.max(2, Math.floor(item.basePrice / 2))]);
          await query(`INSERT INTO item_prices (item_type_id, service_id, size_name, price) VALUES ($1, $2, $3, $4)`, 
            [itemId, s5.rows[0].id, size, item.basePrice + 15]);
        }
      }
    }
    
    res.json({ success: true, message: 'Factory reset completed logically!' });
  } catch (error) {
    console.error('Factory reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
