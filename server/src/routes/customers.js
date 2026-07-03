// مسارات العملاء - Customer Routes
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع مسارات العملاء
router.use(authMiddleware);

/**
 * GET /api/customers/search?q=
 * البحث التلقائي عن العملاء (autocomplete)
 * يجب أن يكون قبل /:id لتجنب التعارض
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const result = await query(`
      SELECT id, name, phone, address
      FROM customers
      WHERE name LIKE $1 OR phone LIKE $2
      ORDER BY name ASC
      LIMIT 10
    `, [searchTerm, searchTerm]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({ success: false, message: 'خطأ في البحث عن العملاء' });
  }
});

/**
 * GET /api/customers
 * عرض جميع العملاء مع إمكانية البحث
 */
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sqlQuery = 'SELECT * FROM customers';
    let countQuery = 'SELECT COUNT(*) as total FROM customers';
    const params = [];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const whereClause = ' WHERE name LIKE $1 OR phone LIKE $2';
      sqlQuery += whereClause;
      countQuery += whereClause;
      params.push(searchTerm, searchTerm);
    }

    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    sqlQuery += ` ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;

    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    const customersResult = await query(sqlQuery, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: customersResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب العملاء' });
  }
});

/**
 * GET /api/customers/:id
 * عرض عميل واحد مع سجل طلباته
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }
    const customer = customerResult.rows[0];

    // جلب طلبات العميل
    const ordersResult = await query(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: { ...customer, orders: ordersResult.rows }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات العميل' });
  }
});

/**
 * POST /api/customers
 * إنشاء عميل جديد
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'الاسم ورقم الهاتف مطلوبان'
      });
    }

    const result = await query(
      'INSERT INTO customers (name, phone, address) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, address || '']
    );

    const customer = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'تم إنشاء العميل بنجاح',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء العميل' });
  }
});

/**
 * PUT /api/customers/:id
 * تحديث بيانات العميل
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;

    const existingResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }
    const existing = existingResult.rows[0];

    await query(
      'UPDATE customers SET name = $1, phone = $2, address = $3 WHERE id = $4',
      [
        name || existing.name,
        phone || existing.phone,
        address !== undefined ? address : existing.address,
        id
      ]
    );

    const customerResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    const customer = customerResult.rows[0];

    res.json({
      success: true,
      message: 'تم تحديث العميل بنجاح',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث العميل' });
  }
});

/**
 * DELETE /api/customers/:id
 * حذف العميل
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    // التحقق من عدم وجود طلبات نشطة
    const activeOrdersResult = await query(
      "SELECT COUNT(*) as count FROM orders WHERE customer_id = $1 AND status NOT IN ('delivered', 'cancelled')",
      [id]
    );

    if (parseInt(activeOrdersResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف العميل لوجود طلبات نشطة'
      });
    }

    await query('DELETE FROM customers WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'تم حذف العميل بنجاح'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف العميل' });
  }
});

module.exports = router;
