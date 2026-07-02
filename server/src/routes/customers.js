// مسارات العملاء - Customer Routes
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع مسارات العملاء
router.use(authMiddleware);

/**
 * GET /api/customers/search?q=
 * البحث التلقائي عن العملاء (autocomplete)
 * يجب أن يكون قبل /:id لتجنب التعارض
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const customers = db.prepare(`
      SELECT id, name, phone, address
      FROM customers
      WHERE name LIKE ? OR phone LIKE ?
      ORDER BY name ASC
      LIMIT 10
    `).all(searchTerm, searchTerm);

    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({ success: false, message: 'خطأ في البحث عن العملاء' });
  }
});

/**
 * GET /api/customers
 * عرض جميع العملاء مع إمكانية البحث
 */
router.get('/', (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM customers';
    let countQuery = 'SELECT COUNT(*) as total FROM customers';
    const params = [];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const whereClause = ' WHERE name LIKE ? OR phone LIKE ?';
      query += whereClause;
      countQuery += whereClause;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const total = db.prepare(countQuery).get(...params).total;
    const customers = db.prepare(query).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: customers,
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
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    // جلب طلبات العميل
    const orders = db.prepare(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `).all(id);

    res.json({
      success: true,
      data: { ...customer, orders }
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
router.post('/', (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'الاسم ورقم الهاتف مطلوبان'
      });
    }

    const result = db.prepare(
      'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)'
    ).run(name, phone, address || '');

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

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
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    db.prepare(
      'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?'
    ).run(
      name || existing.name,
      phone || existing.phone,
      address !== undefined ? address : existing.address,
      id
    );

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

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
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    // التحقق من عدم وجود طلبات نشطة
    const activeOrders = db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE customer_id = ? AND status NOT IN ('delivered', 'cancelled')"
    ).get(id);

    if (activeOrders.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف العميل لوجود طلبات نشطة'
      });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);

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
