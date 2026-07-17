// مسارات لوحة التحكم - Dashboard Routes (Multi-Laundry)
const express = require('express');
const { query } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/dashboard/stats
 * إحصائيات اليوم - مفلترة بالمغسلة
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const isSuperOwner = req.user.role === 'super_owner';
    const laundryId = req.user.laundry_id;

    // إحصائيات طلبات اليوم
    const todayOrdersParams = [today];
    const todayOrdersFilter = isSuperOwner ? '' : `AND laundry_id = $${todayOrdersParams.push(laundryId)}`;
    const todayOrdersResult = await query(`
      SELECT COUNT(*) as count FROM orders 
      WHERE DATE(created_at) = $1 AND status != 'cancelled' ${todayOrdersFilter}
    `, todayOrdersParams);
    const todayOrders = parseInt(todayOrdersResult.rows[0].count);

    // عدد الطلبات حسب الحالة
    const statusParams = [];
    const statusFilter = isSuperOwner ? '' : `WHERE laundry_id = $${statusParams.push(laundryId)}`;
    const statusCountsResult = await query(`
      SELECT status, COUNT(*) as count FROM orders 
      ${statusFilter}
      GROUP BY status
    `, statusParams);
    const statusMap = {};
    statusCountsResult.rows.forEach(s => { statusMap[s.status] = parseInt(s.count); });

    // إيرادات اليوم
    const todayPayParams = [today];
    const todayPayFilter = isSuperOwner ? '' : `AND o.laundry_id = $${todayPayParams.push(laundryId)}`;
    const todayPaymentsResult = await query(`
      SELECT COALESCE(SUM(p.amount), 0) as total 
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE DATE(p.created_at) = $1 ${todayPayFilter}
    `, todayPayParams);
    const todayPayments = parseFloat(todayPaymentsResult.rows[0].total);

    // أحدث 5 طلبات
    const recentParams = [];
    const recentFilter = isSuperOwner ? '' : `AND o.laundry_id = $${recentParams.push(laundryId)}`;
    const recentOrdersResult = await query(`
      SELECT o.id, o.status, o.total_amount, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE 1=1 ${recentFilter}
      ORDER BY o.created_at DESC
      LIMIT 5
    `, recentParams);

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

    // إجمالي الإيرادات
    const allRevParams = [];
    const allRevFilter = isSuperOwner ? '' : `AND laundry_id = $${allRevParams.push(laundryId)}`;
    const allRevenueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(paid_amount), 0) as paid 
       FROM orders WHERE status != 'cancelled' ${allRevFilter}`,
      allRevParams
    );
    const allRevenue = allRevenueResult.rows[0];

    // إحصائيات super_owner الإضافية
    let superOwnerStats = {};
    if (isSuperOwner) {
      const laundriesCountResult = await query('SELECT COUNT(*) as count FROM laundries WHERE is_active = true');
      superOwnerStats.total_laundries = parseInt(laundriesCountResult.rows[0].count);
    }

    res.json({
      success: true,
      todayOrders,
      todayRevenue: todayPayments,
      processingOrders: statusMap['processing'] || 0,
      readyOrders: statusMap['ready'] || 0,
      deliveredOrders: statusMap['delivered'] || 0,
      total_revenue: parseFloat(allRevenue.paid),
      total_remaining: parseFloat(allRevenue.total) - parseFloat(allRevenue.paid),
      recentOrders,
      ...superOwnerStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

/**
 * GET /api/dashboard/revenue
 */
router.get('/revenue', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const isSuperOwner = req.user.role === 'super_owner';

    let revenueData = [];

    // intervalQuery is a safe, hardcoded SQL expression — not user input
    let intervalQuery = "CURRENT_TIMESTAMP - INTERVAL '7 days'";
    if (period === '14days') {
      intervalQuery = "CURRENT_TIMESTAMP - INTERVAL '14 days'";
    } else if (period === 'this_month') {
      intervalQuery = "DATE_TRUNC('month', CURRENT_TIMESTAMP)";
    }

    const revenueParams = [];
    const laundryFilter = isSuperOwner ? '' : `AND laundry_id = $${revenueParams.push(req.user.laundry_id)}`;

    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE created_at >= ${intervalQuery}
        AND status != 'cancelled' ${laundryFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, revenueParams);

    revenueData = result.rows;

    res.json({ success: true, data: revenueData });
  } catch (error) {
    console.error('Revenue data error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الإيرادات' });
  }
});

/**
 * GET /api/dashboard/popular-services
 */
router.get('/popular-services', async (req, res) => {
  try {
    const isSuperOwner = req.user.role === 'super_owner';
    const popularParams = [];
    const laundryFilter = isSuperOwner ? '' : `AND s.laundry_id = $${popularParams.push(req.user.laundry_id)}`;

    const result = await query(`
      SELECT 
        s.name_ar as name,
        COUNT(oi.id) as count
      FROM services s
      LEFT JOIN order_items oi ON s.id = oi.service_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      WHERE s.is_active = true ${laundryFilter}
      GROUP BY s.name_ar
      ORDER BY count DESC
      LIMIT 10
    `, popularParams);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Popular services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمات الشائعة' });
  }
});

/**
 * GET /api/dashboard/overdue
 */
router.get('/overdue', async (req, res) => {
  try {
    const isSuperOwner = req.user.role === 'super_owner';
    const overdueParams = [];
    const laundryFilter = isSuperOwner ? '' : `AND o.laundry_id = $${overdueParams.push(req.user.laundry_id)}`;

    const result = await query(`
      SELECT o.id, o.expected_delivery_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.expected_delivery_at < CURRENT_TIMESTAMP
        AND o.status NOT IN ('delivered', 'cancelled') ${laundryFilter}
      ORDER BY o.expected_delivery_at ASC
    `, overdueParams);

    const overdueOrders = result.rows.map(order => ({
      id: order.id,
      customer: { name: order.customer_name },
      expected_delivery_at: order.expected_delivery_at
    }));

    res.json({ success: true, data: overdueOrders });
  } catch (error) {
    console.error('Overdue orders error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات المتأخرة' });
  }
});

module.exports = router;
