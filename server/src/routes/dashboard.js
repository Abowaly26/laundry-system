// مسارات لوحة التحكم - Dashboard Routes
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تطبيق المصادقة على جميع المسارات
router.use(authMiddleware);

/**
 * GET /api/dashboard/stats
 * إحصائيات اليوم (عدد الطلبات، الإيرادات، الحالات)
 */
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // إحصائيات طلبات اليوم
    const todayOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ? AND status != 'cancelled'
    `).get(today).count;

    // عدد الطلبات حسب الحالة (إجمالي)
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders GROUP BY status
    `).all();

    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s.status] = s.count; });

    // إيرادات اليوم من المدفوعات الفعلية
    const todayPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(created_at) = ?
    `).get(today).total;

    // أحدث 5 طلبات
    const recentOrders = db.prepare(`
      SELECT o.id, o.status, o.total_amount, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all().map(order => {
      const items = db.prepare('SELECT id FROM order_items WHERE order_id = ?').all(order.id);
      return {
        id: order.id,
        status: order.status,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        customer: { name: order.customer_name },
        items: items
      };
    });

    // إجمالي الإيرادات والديون التاريخية
    const allRevenue = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(paid_amount), 0) as paid FROM orders WHERE status != \'cancelled\'').get();

    res.json({
      success: true,
      todayOrders,
      todayRevenue: todayPayments,
      processingOrders: statusMap['processing'] || 0,
      readyOrders: statusMap['ready'] || 0,
      deliveredOrders: statusMap['delivered'] || 0,
      total_revenue: allRevenue.paid,
      total_remaining: allRevenue.total - allRevenue.paid,
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
router.get('/revenue', (req, res) => {
  try {
    const { period = 'daily' } = req.query;

    let revenueData;

    if (period === 'daily') {
      // آخر 7 أيام
      revenueData = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE created_at >= datetime('now', '-7 days', 'localtime')
          AND status != 'cancelled'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `).all();
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
router.get('/popular-services', (req, res) => {
  try {
    const services = db.prepare(`
      SELECT 
        s.name_ar as name,
        COUNT(oi.id) as count
      FROM services s
      LEFT JOIN order_items oi ON s.id = oi.service_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Popular services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الخدمات الشائعة' });
  }
});

/**
 * GET /api/dashboard/overdue
 * الطلبات المتأخرة
 */
router.get('/overdue', (req, res) => {
  try {
    const overdueOrders = db.prepare(`
      SELECT o.id, o.expected_delivery_at,
        c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.expected_delivery_at < datetime('now', 'localtime')
        AND o.status NOT IN ('delivered', 'cancelled')
      ORDER BY o.expected_delivery_at ASC
    `).all().map(order => ({
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
