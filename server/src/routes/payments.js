// مسارات المدفوعات - Payment Routes
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authMiddleware);

/**
 * GET /api/payments
 * عرض جميع المدفوعات مع فلاتر
 */
router.get('/', (req, res) => {
  try {
    const { order_id, method, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];

    if (order_id) {
      conditions.push('p.order_id = ?');
      params.push(order_id);
    }
    if (method) {
      conditions.push('p.method = ?');
      params.push(method);
    }
    if (date_from) {
      conditions.push('p.created_at >= ?');
      params.push(date_from);
    }
    if (date_to) {
      conditions.push('p.created_at <= ?');
      params.push(date_to + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = db.prepare(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`
    ).get(...params).total;

    const payments = db.prepare(`
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
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: payments,
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
router.get('/order/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;

    const order = db.prepare(
      'SELECT id, total_amount, paid_amount, remaining_amount FROM orders WHERE id = ?'
    ).get(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const payments = db.prepare(`
      SELECT p.*, u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.order_id = ?
      ORDER BY p.created_at DESC
    `).all(orderId);

    res.json({
      success: true,
      data: {
        order_summary: order,
        payments
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
router.post('/', (req, res) => {
  try {
    const { order_id, amount, method, type } = req.body;

    if (!order_id || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'رقم الطلب والمبلغ مطلوبان'
      });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إضافة دفعة لطلب ملغي'
      });
    }

    // التحقق من عدم تجاوز المبلغ الإجمالي
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > order.remaining_amount) {
      return res.status(400).json({
        success: false,
        message: `المبلغ المتبقي هو ${order.remaining_amount} ر.س فقط`
      });
    }

    // تحديد نوع الدفعة تلقائياً
    let paymentType = type || 'balance';
    const newPaidAmount = order.paid_amount + parsedAmount;
    if (newPaidAmount >= order.total_amount) {
      paymentType = order.paid_amount === 0 ? 'full' : 'balance';
    } else if (order.paid_amount === 0) {
      paymentType = 'deposit';
    }

    // إنشاء الدفعة وتحديث الطلب داخل معاملة
    const createPayment = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO payments (order_id, amount, method, type, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(order_id, parsedAmount, method || 'cash', paymentType, req.user.id);

      // تحديث المبالغ في الطلب
      const newRemaining = order.total_amount - newPaidAmount;
      db.prepare(
        'UPDATE orders SET paid_amount = ?, remaining_amount = ? WHERE id = ?'
      ).run(newPaidAmount, newRemaining, order_id);

      return result.lastInsertRowid;
    });

    const paymentId = createPayment();

    const payment = db.prepare(`
      SELECT p.*, u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(paymentId);

    const updatedOrder = db.prepare(
      'SELECT total_amount, paid_amount, remaining_amount FROM orders WHERE id = ?'
    ).get(order_id);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      data: {
        payment,
        order_summary: updatedOrder
      }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الدفعة' });
  }
});

module.exports = router;
