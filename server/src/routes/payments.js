// مسارات المدفوعات - Payment Routes (PostgreSQL)
const express = require('express');
const { query, transaction } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authMiddleware);

/**
 * GET /api/payments
 * عرض جميع المدفوعات مع فلاتر
 */
router.get('/', async (req, res) => {
  try {
    const { order_id, method, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramCount = 1;

    if (order_id) {
      conditions.push(`p.order_id = $${paramCount++}`);
      params.push(order_id);
    }
    if (method) {
      conditions.push(`p.method = $${paramCount++}`);
      params.push(method);
    }
    if (date_from) {
      conditions.push(`p.created_at >= $${paramCount++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`p.created_at <= $${paramCount++}`);
      params.push(date_to + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalResult = await query(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].total);

    const paymentsResult = await query(`
      SELECT p.*, 
        o.total_amount as order_total,
        c.name as customer_name, c.phone as customer_phone,
        u.name as created_by_name
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: paymentsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المدفوعات' });
  }
});

/**
 * GET /api/payments/order/:orderId
 * عرض مدفوعات طلب محدد
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderResult = await query(
      'SELECT id, total_amount, paid_amount, remaining_amount FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    const order = orderResult.rows[0];

    const paymentsResult = await query(`
      SELECT p.*, u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.order_id = $1
      ORDER BY p.created_at DESC
    `, [orderId]);

    res.json({
      success: true,
      data: {
        order_summary: order,
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get order payments error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب مدفوعات الطلب' });
  }
});

/**
 * POST /api/payments
 * إنشاء دفعة جديدة لطلب
 */
router.post('/', async (req, res) => {
  try {
    const { order_id, amount, method, type } = req.body;

    if (!order_id || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'رقم الطلب والمبلغ مطلوبان'
      });
    }

    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    const order = orderResult.rows[0];

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إضافة دفعة لطلب ملغي'
      });
    }

    // التحقق من عدم تجاوز المبلغ الإجمالي
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > parseFloat(order.remaining_amount)) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المتبقي هو ${order.remaining_amount} ر.س فقط`
      });
    }

    // تحديد نوع الدفعة تلقائياً
    let paymentType = type || 'balance';
    const newPaidAmount = parseFloat(order.paid_amount) + parsedAmount;
    if (newPaidAmount >= parseFloat(order.total_amount)) {
      paymentType = parseFloat(order.paid_amount) === 0 ? 'full' : 'balance';
    } else if (parseFloat(order.paid_amount) === 0) {
      paymentType = 'deposit';
    }

    // إنشاء الدفعة وتحديث الطلب داخل معاملة
    const result = await transaction(async (client) => {
      const paymentResult = await client.query(`
        INSERT INTO payments (order_id, amount, method, type, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [order_id, parsedAmount, method || 'cash', paymentType, req.user.id]);

      const paymentId = paymentResult.rows[0].id;

      // تحديث المبالغ في الطلب
      const newRemaining = parseFloat(order.total_amount) - newPaidAmount;
      await client.query(
        'UPDATE orders SET paid_amount = $1, remaining_amount = $2 WHERE id = $3',
        [newPaidAmount, newRemaining, order_id]
      );

      return paymentId;
    });

    const paymentResult = await query(`
      SELECT p.*, u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [result]);

    const updatedOrderResult = await query(
      'SELECT total_amount, paid_amount, remaining_amount FROM orders WHERE id = $1',
      [order_id]
    );

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      data: {
        payment: paymentResult.rows[0],
        order_summary: updatedOrderResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الدفعة' });
  }
});

module.exports = router;
