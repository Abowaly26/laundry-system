// مسارات لوحة التحكم - Dashboard Routes
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authMiddleware);

/**
 * GET /api/dashboard/stats
 * إحصائيات اليوم (عدد الطلبات، الإيرادات، الحالات)
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // إحصائيات طلبات اليوم
    const todayOrdersResult = await query(`
      SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = $1 AND status != 'cancelled'
    `, [today]);
    const todayOrders = parseInt(todayOrdersResult.rows[0].count);

    // عدد الطلبات حسب الحالة (إجمالي)
    const statusCountsResult = await query(`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `);

    const statusMap = {};
    statusCountsResult.rows.forEach(s => { statusMap[s.status] = parseInt(s.count); });

    // إيرادات اليوم من المدفوعات الفعلية
    const todayPaymentsResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(created_at) = $1
    `, [today]);
    const todayPayments = parseFloat(todayPaymentsResult.rows[0].total);

    // أحدث 5 طلبات
    const recentOrdersResult = await query(`
      SELECT o.id, o.status, o.total_amount, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    const recentOrders = await Promise.all(recentOrdersResult.rows.map(async order => {
      const itemsResult = await query('SELECT id FROM order_items WHERE order_id = $1', [order.id]);
      return {
        id: order.id,
        status: order.status,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        customer: { name: order.customer_name },
        items: itemsResult.rows
      };
    }));

    // إجمالي الإيرادات والديون التاريخية
    const allRevenueResult = await query(
      "SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(paid_amount), 0) as paid FROM orders WHERE status != 'cancelled'"
    );
    const allRevenue = allRevenueResult.rows[0];

    res.json({
      success: true,
      todayOrders,
      todayRevenue: todayPayments,
      processingOrders: statusMap['processing'] || 0,
      readyOrders: statusMap['ready'] || 0,
      deliveredOrders: statusMap['delivered'] || 0,
      total_revenue: parseFloat(allRevenue.paid),
      total_remaining: parseFloat(allRevenue.total) - parseFloat(allRevenue.paid),
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

/**
 * GET /api/dashboard/revenue
 * بيانات الإيرادات للرسوم البيانية
 */
router.get('/revenue', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;

    let revenueData;

    if (period === 'daily') {
      // آخر 7 أيام
      const result = await query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
          AND status != 'cancelled'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      revenueData = result.rows;
    }

    res.json({ success: true, data: revenueData });
  } catch (error) {
    console.error('Revenue data error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الإيرادات' });
  }
});

/**
 * GET /api/dashboard/popular-services
 * الخدمات الأكثر شعبية
 */
router.get('/popular-services', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        s.name_ar as name,
        COUNT(oi.id) as count
      FROM services s
      LEFT JOIN order_items oi ON s.id = oi.service_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      WHERE s.is_active = true
      GROUP BY s.id, s.name_ar
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Popular services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمات الشائعة' });
  }
});

/**
 * GET /api/dashboard/overdue
 * الطلبات المتأخرة
 */
router.get('/overdue', async (req, res) => {
  try {
    const result = await query(`
      SELECT o.id, o.expected_delivery_at,
        c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.expected_delivery_at < CURRENT_TIMESTAMP
        AND o.status NOT IN ('delivered', 'cancelled')
      ORDER BY o.expected_delivery_at ASC
    `);

    const overdueOrders = result.rows.map(order => ({
      id: order.id,
      customer: { name: order.customer_name },
      expected_delivery_at: order.expected_delivery_at
    }));

    res.json({
      success: true,
      data: overdueOrders
    });
  } catch (error) {
    console.error('Overdue orders error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات المتأخرة' });
  }
});

module.exports = router;
