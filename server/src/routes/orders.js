// مسارات الطلبات - Order Routes
const express = require('express');
const QRCode = require('qrcode');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// خريطة البادئات لأنواع القطع - Item type prefixes for QR codes
const ITEM_TYPE_PREFIXES = {
  'shirt': 'SHIRT',
  'قميص': 'SHIRT',
  'pants': 'PANTS',
  'بنطلون': 'PANTS',
  'dress': 'DRESS',
  'فستان': 'DRESS',
  'jacket': 'JACKET',
  'جاكيت': 'JACKET',
  'blanket': 'BLANKET',
  'بطانية': 'BLANKET',
  'carpet': 'CARPET',
  'سجاد': 'CARPET',
  'suit': 'SUIT',
  'بدلة': 'SUIT',
  'abaya': 'ABAYA',
  'عباية': 'ABAYA',
  'thobe': 'THOBE',
  'ثوب': 'THOBE',
  'curtain': 'CURTAIN',
  'ستارة': 'CURTAIN',
  'default': 'ITEM'
};

/**
 * الحصول على البادئة المناسبة لنوع القطعة
 */
function getItemPrefix(itemType) {
  const normalized = (itemType || '').toLowerCase().trim();
  return ITEM_TYPE_PREFIXES[normalized] || ITEM_TYPE_PREFIXES['default'];
}

/**
 * توليد رمز QR فريد
 */
function generateQRCode(itemType) {
  const prefix = getItemPrefix(itemType);
  
  // الحصول على آخر رقم مستخدم لهذا النوع
  const lastItem = db.prepare(
    "SELECT qr_code FROM order_items WHERE qr_code LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}-%`);

  let nextNum = 1;
  if (lastItem && lastItem.qr_code) {
    const parts = lastItem.qr_code.split('-');
    nextNum = parseInt(parts[1]) + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET /api/orders/track/:orderIdOrPhone
 * تتبع الطلب بواسطة رقم الطلب أو رقم الهاتف (نقطة عامة)
 */
router.get('/track/:orderIdOrPhone', (req, res) => {
  try {
    const { orderIdOrPhone } = req.params;
    let orders;

    // محاولة البحث كرقم طلب أولاً
    if (/^\d+$/.test(orderIdOrPhone)) {
      const order = db.prepare(`
        SELECT o.*, c.name as customer_name, c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
      `).get(orderIdOrPhone);

      if (order) {
        const items = db.prepare(`
          SELECT oi.*, s.name_ar as service_name
          FROM order_items oi
          JOIN services s ON oi.service_id = s.id
          WHERE oi.order_id = ?
        `).all(order.id);
        orders = [{ ...order, items }];
      }
    }

    // البحث برقم الهاتف إذا لم يُعثر عليه
    if (!orders || orders.length === 0) {
      const customer = db.prepare(
        'SELECT id FROM customers WHERE phone = ?'
      ).get(orderIdOrPhone);

      if (customer) {
        const customerOrders = db.prepare(`
          SELECT o.*, c.name as customer_name, c.phone as customer_phone
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          WHERE o.customer_id = ? AND o.status NOT IN ('cancelled')
          ORDER BY o.created_at DESC
          LIMIT 5
        `).all(customer.id);

        orders = customerOrders.map(order => {
          const items = db.prepare(`
            SELECT oi.*, s.name_ar as service_name
            FROM order_items oi
            JOIN services s ON oi.service_id = s.id
            WHERE oi.order_id = ?
          `).all(order.id);
          return { ...order, items };
        });
      }
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على طلبات'
      });
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تتبع الطلب' });
  }
});

/**
 * GET /api/orders
 * عرض جميع الطلبات مع فلاتر
 */
router.get('/', authMiddleware, (req, res) => {
  try {
    const { status, customer_id, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    if (customer_id) {
      conditions.push('o.customer_id = ?');
      params.push(customer_id);
    }
    if (date_from) {
      conditions.push('o.created_at >= ?');
      params.push(date_from);
    }
    if (date_to) {
      conditions.push('o.created_at <= ?');
      params.push(date_to + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = db.prepare(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`
    ).get(...params).total;

    const orders = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
  }
});

/**
 * GET /api/orders/:id
 * عرض تفاصيل طلب واحد مع القطع والمدفوعات
 */
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    // جلب القطع
    const items = db.prepare(`
      SELECT oi.*, s.name_ar as service_name, s.name as service_name_en
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `).all(order.id);

    // جلب المدفوعات
    const payments = db.prepare(`
      SELECT p.*, u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.order_id = ?
      ORDER BY p.created_at DESC
    `).all(order.id);

    res.json({
      success: true,
      data: { ...order, items, payments }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الطلب' });
  }
});

/**
 * POST /api/orders
 * إنشاء طلب جديد مع القطع وتوليد QR codes
 */
router.post('/', authMiddleware, (req, res) => {
  try {
    const { customer_id, items, notes, paid_amount, payment_method } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل وعناصر الطلب مطلوبة'
      });
    }

    // التحقق من وجود العميل
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    // حساب الإجمالي وأقصى مدة تسليم
    let totalAmount = 0;
    let maxEstimatedHours = 0;

    const itemsWithPrices = items.map(item => {
      const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(item.service_id);
      if (!service) {
        throw new Error(`الخدمة رقم ${item.service_id} غير موجودة أو معطلة`);
      }
      const quantity = item.quantity || 1;
      const itemPrice = service.price * quantity;
      totalAmount += itemPrice;
      if (service.estimated_hours > maxEstimatedHours) {
        maxEstimatedHours = service.estimated_hours;
      }
      return { ...item, service, price: service.price, quantity };
    });

    const paidAmount = parseFloat(paid_amount) || 0;
    const remainingAmount = totalAmount - paidAmount;

    // تاريخ التسليم المتوقع
    const expectedDelivery = new Date();
    expectedDelivery.setHours(expectedDelivery.getHours() + maxEstimatedHours);
    const expectedDeliveryStr = expectedDelivery.toISOString().replace('T', ' ').substring(0, 19);

    // إنشاء الطلب والقطع داخل معاملة واحدة
    const createOrder = db.transaction(() => {
      // إنشاء الطلب
      const orderResult = db.prepare(`
        INSERT INTO orders (customer_id, status, total_amount, paid_amount, remaining_amount, expected_delivery_at, notes)
        VALUES (?, 'pending', ?, ?, ?, ?, ?)
      `).run(customer_id, totalAmount, paidAmount, remainingAmount, expectedDeliveryStr, notes || '');

      const orderId = orderResult.lastInsertRowid;
      const createdItems = [];

      // إنشاء القطع وتوليد QR codes
      for (const item of itemsWithPrices) {
        const quantity = item.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          const qrCode = generateQRCode(item.item_type || item.service.name);
          
          const itemResult = db.prepare(`
            INSERT INTO order_items (order_id, service_id, item_type, qr_code, status, notes, price)
            VALUES (?, ?, ?, ?, 'received', ?, ?)
          `).run(orderId, item.service_id, item.item_type || item.service.name, qrCode, item.notes || '', item.price);

          // تسجيل الحالة الأولية
          db.prepare(`
            INSERT INTO item_status_log (item_id, old_status, new_status, updated_by)
            VALUES (?, NULL, 'received', ?)
          `).run(itemResult.lastInsertRowid, req.user.id);

          createdItems.push({
            id: itemResult.lastInsertRowid,
            qr_code: qrCode,
            item_type: item.item_type || item.service.name,
            service_name: item.service.name_ar,
            status: 'received',
            price: item.price,
            // بيانات QR code
            qr_data: JSON.stringify({
              itemId: itemResult.lastInsertRowid,
              orderId: orderId,
              qrCode: qrCode,
              service: item.service.name_ar
            })
          });
        }
      }

      // تسجيل الدفعة إذا وجدت
      if (paidAmount > 0) {
        const paymentType = paidAmount >= totalAmount ? 'full' : 'deposit';
        db.prepare(`
          INSERT INTO payments (order_id, amount, method, type, created_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(orderId, paidAmount, payment_method || 'cash', paymentType, req.user.id);
      }

      return { orderId, createdItems };
    });

    const result = createOrder();

    // جلب الطلب الكامل
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(result.orderId);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: {
        ...order,
        items: result.createdItems
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في إنشاء الطلب'
    });
  }
});

/**
 * PUT /api/orders/:id
 * تحديث الطلب
 */
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, expected_delivery_at } = req.body;

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const updateFields = [];
    const updateParams = [];

    if (status) {
      updateFields.push('status = ?');
      updateParams.push(status);
      if (status === 'delivered') {
        updateFields.push("delivered_at = datetime('now', 'localtime')");
      }
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
    }
    if (expected_delivery_at) {
      updateFields.push('expected_delivery_at = ?');
      updateParams.push(expected_delivery_at);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    updateParams.push(id);
    db.prepare(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'تم تحديث الطلب بنجاح',
      data: order
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الطلب' });
  }
});

/**
 * DELETE /api/orders/:id
 * إلغاء الطلب
 */
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    if (existing.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء طلب تم تسليمه'
      });
    }

    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);

    res.json({
      success: true,
      message: 'تم إلغاء الطلب بنجاح'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الطلب' });
  }
});

module.exports = router;
