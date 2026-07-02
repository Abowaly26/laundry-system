// مسارات إدارة القطع - Item Status Management Routes
const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تسلسل حالات القطعة - Status workflow
const STATUS_FLOW = ['received', 'washing', 'drying', 'ironing', 'ready', 'delivered'];

/**
 * الحصول على الحالة التالية في التسلسل
 */
function getNextStatus(currentStatus) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) {
    return null;
  }
  return STATUS_FLOW[currentIndex + 1];
}

/**
 * تحديث حالة الطلب بناءً على حالات القطع
 * عندما تصبح جميع القطع 'ready' -> الطلب 'ready'
 * عندما تصبح جميع القطع 'delivered' -> الطلب 'delivered'
 */
function syncOrderStatus(orderId) {
  const items = db.prepare(
    'SELECT status FROM order_items WHERE order_id = ?'
  ).all(orderId);

  if (items.length === 0) return;

  const allReady = items.every(i => i.status === 'ready' || i.status === 'delivered');
  const allDelivered = items.every(i => i.status === 'delivered');

  if (allDelivered) {
    db.prepare(
      "UPDATE orders SET status = 'delivered', delivered_at = datetime('now', 'localtime') WHERE id = ? AND status != 'delivered'"
    ).run(orderId);
  } else if (allReady) {
    db.prepare(
      "UPDATE orders SET status = 'ready' WHERE id = ? AND status NOT IN ('ready', 'delivered')"
    ).run(orderId);
  } else {
    // إذا كانت بعض القطع قيد المعالجة
    db.prepare(
      "UPDATE orders SET status = 'processing' WHERE id = ? AND status = 'pending'"
    ).run(orderId);
  }
}

/**
 * GET /api/items/scan/:qrCode
 * جلب قطعة بواسطة رمز QR
 */
router.get('/scan/:qrCode', authMiddleware, (req, res) => {
  try {
    const { qrCode } = req.params;

    const item = db.prepare(`
      SELECT oi.*, 
        s.name_ar as service_name, s.name as service_name_en,
        o.id as order_id, o.status as order_status,
        c.name as customer_name, c.phone as customer_phone
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE oi.qr_code = ?
    `).get(qrCode);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }

    // جلب سجل الحالات
    const statusLog = db.prepare(`
      SELECT isl.*, u.name as updated_by_name
      FROM item_status_log isl
      LEFT JOIN users u ON isl.updated_by = u.id
      WHERE isl.item_id = ?
      ORDER BY isl.created_at DESC
    `).all(item.id);

    const nextStatus = getNextStatus(item.status);

    res.json({
      success: true,
      data: {
        ...item,
        next_status: nextStatus,
        status_log: statusLog
      }
    });
  } catch (error) {
    console.error('Scan item error:', error);
    res.status(500).json({ success: false, message: 'خطأ في قراءة رمز QR' });
  }
});

/**
 * PUT /api/items/scan/:qrCode/advance
 * تقديم حالة القطعة للخطوة التالية عبر QR
 */
router.put('/scan/:qrCode/advance', authMiddleware, (req, res) => {
  try {
    const { qrCode } = req.params;

    const item = db.prepare(
      'SELECT * FROM order_items WHERE qr_code = ?'
    ).get(qrCode);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }

    const nextStatus = getNextStatus(item.status);
    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message: 'القطعة في آخر مرحلة بالفعل'
      });
    }

    // تحديث الحالة داخل معاملة
    const advanceItem = db.transaction(() => {
      // تحديث حالة القطعة
      db.prepare(
        "UPDATE order_items SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
      ).run(nextStatus, item.id);

      // تسجيل التغيير
      db.prepare(
        'INSERT INTO item_status_log (item_id, old_status, new_status, updated_by) VALUES (?, ?, ?, ?)'
      ).run(item.id, item.status, nextStatus, req.user.id);

      // مزامنة حالة الطلب
      syncOrderStatus(item.order_id);
    });

    advanceItem();

    // جلب البيانات المحدثة
    const updatedItem = db.prepare(`
      SELECT oi.*, s.name_ar as service_name,
        o.status as order_status, c.name as customer_name
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE oi.id = ?
    `).get(item.id);

    res.json({
      success: true,
      message: `تم تحديث الحالة إلى: ${nextStatus}`,
      data: {
        ...updatedItem,
        previous_status: item.status,
        next_status: getNextStatus(nextStatus)
      }
    });
  } catch (error) {
    console.error('Advance item error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تقديم حالة القطعة' });
  }
});

/**
 * GET /api/items/:id
 * جلب تفاصيل قطعة واحدة
 */
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const item = db.prepare(`
      SELECT oi.*, 
        s.name_ar as service_name, s.name as service_name_en,
        o.id as order_id, o.status as order_status,
        c.name as customer_name, c.phone as customer_phone
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE oi.id = ?
    `).get(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }

    // جلب سجل الحالات
    const statusLog = db.prepare(`
      SELECT isl.*, u.name as updated_by_name
      FROM item_status_log isl
      LEFT JOIN users u ON isl.updated_by = u.id
      WHERE isl.item_id = ?
      ORDER BY isl.created_at DESC
    `).all(item.id);

    const nextStatus = getNextStatus(item.status);

    res.json({
      success: true,
      data: {
        ...item,
        next_status: nextStatus,
        status_log: statusLog
      }
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات القطعة' });
  }
});

/**
 * PUT /api/items/:id/status
 * تحديث حالة القطعة (الخطوة التالية في سير العمل)
 */
router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }

    // التحقق من أن الحالة الجديدة صحيحة
    let newStatus = status;
    if (!newStatus) {
      // إذا لم يتم تحديد حالة، انتقل للخطوة التالية
      newStatus = getNextStatus(item.status);
      if (!newStatus) {
        return res.status(400).json({
          success: false,
          message: 'القطعة في آخر مرحلة بالفعل'
        });
      }
    }

    if (!STATUS_FLOW.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صالحة'
      });
    }

    // تحديث الحالة داخل معاملة
    const updateStatus = db.transaction(() => {
      db.prepare(
        "UPDATE order_items SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
      ).run(newStatus, id);

      // تسجيل التغيير
      db.prepare(
        'INSERT INTO item_status_log (item_id, old_status, new_status, updated_by) VALUES (?, ?, ?, ?)'
      ).run(id, item.status, newStatus, req.user.id);

      // مزامنة حالة الطلب
      syncOrderStatus(item.order_id);
    });

    updateStatus();

    const updatedItem = db.prepare(`
      SELECT oi.*, s.name_ar as service_name,
        o.status as order_status
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = ?
    `).get(id);

    res.json({
      success: true,
      message: `تم تحديث الحالة من ${item.status} إلى ${newStatus}`,
      data: {
        ...updatedItem,
        previous_status: item.status,
        next_status: getNextStatus(newStatus)
      }
    });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث حالة القطعة' });
  }
});

module.exports = router;
