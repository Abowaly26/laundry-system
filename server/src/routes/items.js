// مسارات إدارة القطع - Item Status Management Routes (PostgreSQL)
const express = require('express');
const { query, transaction } = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// تسلسل حالات القطعة - Status workflow
const STATUS_FLOW = ['pending', 'processing', 'ready', 'delivered'];

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
 */
async function syncOrderStatus(orderId, client = null) {
  const executor = client || query;
  
  const itemsResult = await (client 
    ? client.query('SELECT status FROM order_items WHERE order_id = $1', [orderId])
    : query('SELECT status FROM order_items WHERE order_id = $1', [orderId])
  );

  if (itemsResult.rows.length === 0) return;

  const items = itemsResult.rows;
  const allDelivered = items.every(i => i.status === 'delivered');
  const allReady = items.every(i => i.status === 'ready' || i.status === 'delivered');
  const allReceived = items.every(i => i.status === 'received');

  let targetStatus = 'processing';
  if (allDelivered) {
    targetStatus = 'delivered';
  } else if (allReady) {
    targetStatus = 'ready';
  } else if (allReceived) {
    targetStatus = 'pending';
  }

  if (targetStatus === 'delivered') {
    await (client
      ? client.query(
          "UPDATE orders SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE id = $2 AND status != $1",
          [targetStatus, orderId]
        )
      : query(
          "UPDATE orders SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE id = $2 AND status != $1",
          [targetStatus, orderId]
        )
    );
  } else {
    await (client
      ? client.query(
          "UPDATE orders SET status = $1, delivered_at = NULL WHERE id = $2 AND status != $1",
          [targetStatus, orderId]
        )
      : query(
          "UPDATE orders SET status = $1, delivered_at = NULL WHERE id = $2 AND status != $1",
          [targetStatus, orderId]
        )
    );
  }
}

/**
 * GET /api/items/scan/:qrCode
 * جلب قطعة بواسطة رمز QR
 */
router.get('/scan/:qrCode', authMiddleware, async (req, res) => {
  try {
    const { qrCode } = req.params;

    const itemResult = await query(`
      SELECT oi.*, 
        s.name_ar as service_name, s.name as service_name_en,
        sz.size_name,
        o.id as order_id, o.status as order_status,
        c.name as customer_name, c.phone as customer_phone
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN item_sizes sz ON oi.size_id = sz.id
      WHERE oi.qr_code = $1
    `, [qrCode]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }
    const item = itemResult.rows[0];

    // جلب سجل الحالات
    const statusLogResult = await query(`
      SELECT isl.*, u.name as updated_by_name
      FROM item_status_log isl
      LEFT JOIN users u ON isl.updated_by = u.id
      WHERE isl.item_id = $1
      ORDER BY isl.created_at DESC
    `, [item.id]);

    const nextStatus = getNextStatus(item.status);

    res.json({
      success: true,
      data: {
        ...item,
        next_status: nextStatus,
        status_log: statusLogResult.rows
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
router.put('/scan/:qrCode/advance', authMiddleware, async (req, res) => {
  try {
    const { qrCode } = req.params;

    const itemResult = await query(
      'SELECT * FROM order_items WHERE qr_code = $1',
      [qrCode]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }
    const item = itemResult.rows[0];

    const nextStatus = getNextStatus(item.status);
    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message: 'القطعة في آخر مرحلة بالفعل'
      });
    }

    // تحديث الحالة داخل معاملة
    await transaction(async (client) => {
      // تحديث حالة القطعة
      await client.query(
        "UPDATE order_items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [nextStatus, item.id]
      );

      // تسجيل التغيير
      await client.query(
        'INSERT INTO item_status_log (item_id, old_status, new_status, updated_by) VALUES ($1, $2, $3, $4)',
        [item.id, item.status, nextStatus, req.user.id]
      );

      // مزامنة حالة الطلب
      await syncOrderStatus(item.order_id, client);
    });

    // جلب البيانات المحدثة
    const updatedItemResult = await query(`
      SELECT oi.*, s.name_ar as service_name,
        sz.size_name,
        o.status as order_status, c.name as customer_name
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN item_sizes sz ON oi.size_id = sz.id
      WHERE oi.id = $1
    `, [item.id]);

    res.json({
      success: true,
      message: `تم تحديث الحالة إلى: ${nextStatus}`,
      data: {
        ...updatedItemResult.rows[0],
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
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const itemResult = await query(`
      SELECT oi.*, 
        s.name_ar as service_name, s.name as service_name_en,
        sz.size_name,
        o.id as order_id, o.status as order_status,
        c.name as customer_name, c.phone as customer_phone
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN item_sizes sz ON oi.size_id = sz.id
      WHERE oi.id = $1
    `, [req.params.id]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }
    const item = itemResult.rows[0];

    // جلب سجل الحالات
    const statusLogResult = await query(`
      SELECT isl.*, u.name as updated_by_name
      FROM item_status_log isl
      LEFT JOIN users u ON isl.updated_by = u.id
      WHERE isl.item_id = $1
      ORDER BY isl.created_at DESC
    `, [item.id]);

    const nextStatus = getNextStatus(item.status);

    res.json({
      success: true,
      data: {
        ...item,
        next_status: nextStatus,
        status_log: statusLogResult.rows
      }
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات القطعة' });
  }
});

/**
 * PUT /api/items/:id/status
 * تحديث حالة القطعة
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const itemResult = await query('SELECT * FROM order_items WHERE id = $1', [id]);
    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }
    const item = itemResult.rows[0];

    // التحقق من أن الحالة الجديدة صحيحة
    let newStatus = status;
    if (!newStatus) {
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
    await transaction(async (client) => {
      await client.query(
        "UPDATE order_items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newStatus, id]
      );

      // تسجيل التغيير
      await client.query(
        'INSERT INTO item_status_log (item_id, old_status, new_status, updated_by) VALUES ($1, $2, $3, $4)',
        [id, item.status, newStatus, req.user.id]
      );

      // مزامنة حالة الطلب
      await syncOrderStatus(item.order_id, client);
    });

    const updatedItemResult = await query(`
      SELECT oi.*, s.name_ar as service_name,
        o.status as order_status
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = $1
    `, [id]);

    res.json({
      success: true,
      message: `تم تحديث الحالة من ${item.status} إلى ${newStatus}`,
      data: {
        ...updatedItemResult.rows[0],
        previous_status: item.status,
        next_status: getNextStatus(newStatus)
      }
    });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث حالة القطعة' });
  }
});

/**
 * PUT /api/items/:id/advance
 * تقديم حالة القطعة للخطوة التالية بواسطة المعرف
 */
router.put('/:id/advance', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const itemResult = await query(
      'SELECT * FROM order_items WHERE id = $1',
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'القطعة غير موجودة'
      });
    }
    const item = itemResult.rows[0];

    const nextStatus = getNextStatus(item.status);
    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message: 'القطعة في آخر مرحلة بالفعل'
      });
    }

    // تحديث الحالة داخل معاملة
    await transaction(async (client) => {
      // تحديث حالة القطعة
      await client.query(
        "UPDATE order_items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [nextStatus, item.id]
      );

      // تسجيل التغيير
      await client.query(
        'INSERT INTO item_status_log (item_id, old_status, new_status, updated_by) VALUES ($1, $2, $3, $4)',
        [item.id, item.status, nextStatus, req.user.id]
      );

      // مزامنة حالة الطلب
      await syncOrderStatus(item.order_id, client);
    });

    // جلب البيانات المحدثة
    const updatedItemResult = await query(`
      SELECT oi.*, s.name_ar as service_name,
        o.status as order_status, c.name as customer_name
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      JOIN orders o ON oi.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE oi.id = $1
    `, [item.id]);

    res.json({
      success: true,
      message: `تم تحديث الحالة إلى: ${nextStatus}`,
      data: {
        ...updatedItemResult.rows[0],
        previous_status: item.status,
        next_status: getNextStatus(nextStatus)
      }
    });
  } catch (error) {
    console.error('Advance item by ID error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تقديم حالة القطعة' });
  }
});

module.exports = router;
