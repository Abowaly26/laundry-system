// مسارات العملاء - Customer Routes (Multi-Laundry)
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();
router.use(authMiddleware);

/**
 * مساعد: بناء شرط laundry_id للـ query
 * super_owner بدون فلتر يرى الكل
 */
function getLaundryCondition(user, existingParams = []) {
  if (user.role === 'super_owner') {
    return { condition: '', params: existingParams };
  }
  const paramIndex = existingParams.length + 1;
  return {
    condition: ` AND laundry_id = $${paramIndex}`,
    params: [...existingParams, user.laundry_id]
  };
}

/**
 * GET /api/customers/search?q=
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    let sqlQuery, params;

    if (req.user.role === 'super_owner') {
      sqlQuery = `SELECT id, name, phone, address FROM customers WHERE (name LIKE $1 OR phone LIKE $2) ORDER BY name ASC LIMIT 10`;
      params = [searchTerm, searchTerm];
    } else {
      sqlQuery = `SELECT id, name, phone, address FROM customers WHERE (name LIKE $1 OR phone LIKE $2) AND laundry_id = $3 ORDER BY name ASC LIMIT 10`;
      params = [searchTerm, searchTerm, req.user.laundry_id];
    }

    const result = await query(sqlQuery, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({ success: false, message: 'خطأ في البحث عن العملاء' });
  }
});

/**
 * GET /api/customers
 */
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = req.user.role === 'super_owner' ? 'WHERE 1=1' : 'WHERE laundry_id = $1';
    let params = req.user.role === 'super_owner' ? [] : [req.user.laundry_id];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const paramIdx = params.length + 1;
      whereClause += ` AND (name LIKE $${paramIdx} OR phone LIKE $${paramIdx + 1})`;
      params.push(searchTerm, searchTerm);
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM customers ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const customersResult = await query(
      `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, parseInt(limit), offset]
    );

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
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let customerResult;

    if (req.user.role === 'super_owner') {
      customerResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    } else {
      customerResult = await query('SELECT * FROM customers WHERE id = $1 AND laundry_id = $2', [id, req.user.laundry_id]);
    }

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const customer = customerResult.rows[0];
    const ordersResult = await query(`
      SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o WHERE o.customer_id = $1 ORDER BY o.created_at DESC
    `, [id]);

    res.json({ success: true, data: { ...customer, orders: ordersResult.rows } });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات العميل' });
  }
});

/**
 * POST /api/customers
 */
router.post('/', authorizeRoles('admin', 'cashier', 'super_owner'), async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'الاسم ورقم الهاتف مطلوبان' });
    }

    // super_owner لا يضيف عملاء مباشرة بدون مغسلة
    if (!req.user.laundry_id && req.user.role !== 'super_owner') {
      return res.status(400).json({ success: false, message: 'لم يتم تحديد المغسلة' });
    }

    const laundryId = req.user.laundry_id;

    const result = await query(
      'INSERT INTO customers (name, phone, address, laundry_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, address || '', laundryId]
    );

    res.status(201).json({ success: true, message: 'تم إنشاء العميل بنجاح', data: result.rows[0] });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء العميل' });
  }
});

/**
 * PUT /api/customers/:id
 */
router.put('/:id', authorizeRoles('admin', 'cashier', 'super_owner'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;

    let existingResult;
    if (req.user.role === 'super_owner') {
      existingResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    } else {
      existingResult = await query('SELECT * FROM customers WHERE id = $1 AND laundry_id = $2', [id, req.user.laundry_id]);
    }

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const existing = existingResult.rows[0];
    await query(
      'UPDATE customers SET name = $1, phone = $2, address = $3 WHERE id = $4',
      [name || existing.name, phone || existing.phone, address !== undefined ? address : existing.address, id]
    );

    const customerResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم تحديث العميل بنجاح', data: customerResult.rows[0] });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث العميل' });
  }
});

/**
 * DELETE /api/customers/:id
 */
router.delete('/:id', authorizeRoles('admin', 'cashier', 'super_owner'), async (req, res) => {
  try {
    const { id } = req.params;

    let existingResult;
    if (req.user.role === 'super_owner') {
      existingResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    } else {
      existingResult = await query('SELECT * FROM customers WHERE id = $1 AND laundry_id = $2', [id, req.user.laundry_id]);
    }

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const activeOrdersResult = await query(
      "SELECT COUNT(*) as count FROM orders WHERE customer_id = $1 AND status NOT IN ('delivered', 'cancelled')",
      [id]
    );

    if (parseInt(activeOrdersResult.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف العميل لوجود طلبات نشطة' });
    }

    await query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف العميل' });
  }
});

module.exports = router;
