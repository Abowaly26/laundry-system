// مسارات الطلبات - Order Routes (PostgreSQL)
const express = require('express');
const QRCode = require('qrcode');
const { query, transaction } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

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
async function generateQRCode(itemType) {
  const prefix = getItemPrefix(itemType);
  
  // الحصول على آخر رقم مستخدم لهذا النوع
  const result = await query(
    "SELECT qr_code FROM order_items WHERE qr_code LIKE $1 ORDER BY id DESC LIMIT 1",
    [`${prefix}-%`]
  );

  let nextNum = 1;
  if (result.rows.length > 0 && result.rows[0].qr_code) {
    const parts = result.rows[0].qr_code.split('-');
    nextNum = parseInt(parts[1]) + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET /api/orders/track/:orderIdOrPhone
 * تتبع الطلب بواسطة رقم الطلب أو رقم الهاتف (نقطة عامة)
 */
router.get('/track/:orderIdOrPhone', async (req, res) => {
  try {
    const { orderIdOrPhone } = req.params;
    let orders;

    // محاولة البحث كرقم طلب أولاً
    if (/^\d+$/.test(orderIdOrPhone)) {
      const orderResult = await query(`
        SELECT o.*, c.name as customer_name, c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `, [orderIdOrPhone]);

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        const itemsResult = await query(`
          SELECT oi.*, s.name_ar as service_name, sz.size_name
          FROM order_items oi
          JOIN services s ON oi.service_id = s.id
          LEFT JOIN item_sizes sz ON oi.size_id = sz.id
          WHERE oi.order_id = $1
        `, [order.id]);
        orders = [{ ...order, items: itemsResult.rows }];
      }
    }

    // البحث برقم الهاتف إذا لم يُعثر عليه
    if (!orders || orders.length === 0) {
      const customerResult = await query(
        'SELECT id FROM customers WHERE phone = $1',
        [orderIdOrPhone]
      );

      if (customerResult.rows.length > 0) {
        const customerIds = customerResult.rows.map(row => row.id);
        const placeholders = customerIds.map((_, i) => `$${i + 1}`).join(',');
        const customerOrdersResult = await query(`
          SELECT o.*, c.name as customer_name, c.phone as customer_phone
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          WHERE o.customer_id IN (${placeholders}) AND o.status NOT IN ('cancelled')
          ORDER BY o.created_at DESC
          LIMIT 10
        `, customerIds);

        orders = await Promise.all(customerOrdersResult.rows.map(async order => {
          const itemsResult = await query(`
            SELECT oi.*, s.name_ar as service_name, sz.size_name
            FROM order_items oi
            JOIN services s ON oi.service_id = s.id
            LEFT JOIN item_sizes sz ON oi.size_id = sz.id
            WHERE oi.order_id = $1
          `, [order.id]);
          return { ...order, items: itemsResult.rows };
        }));
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, customer_id, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`o.status = $${paramCount++}`);
      params.push(status);
    }
    if (customer_id) {
      conditions.push(`o.customer_id = $${paramCount++}`);
      params.push(customer_id);
    }
    if (date_from) {
      conditions.push(`o.created_at >= $${paramCount++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`o.created_at <= $${paramCount++}`);
      params.push(date_to + ' 23:59:59');
    }

    // فلتر المغسلة: admin/cashier/worker يرون طلبات مغسلتهم فقط
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      conditions.push(`o.laundry_id = $${paramCount++}`);
      params.push(req.user.laundry_id);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalResult = await query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].total);

    const ordersResult = await query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: ordersResult.rows,
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
 * GET /api/orders/workload/status
 * جلب حالة ضغط العمل التقديرية في المغسلة
 */
router.get('/workload/status', authMiddleware, async (req, res) => {
  try {
    let laundryCheck = '';
    let queryParams = [];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      laundryCheck = 'AND o.laundry_id = $1';
      queryParams.push(req.user.laundry_id);
    }

    const itemsResult = await query(`
      SELECT oi.status, COUNT(*) as count 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.status IN ('pending', 'processing') ${laundryCheck}
      GROUP BY oi.status
    `, queryParams);

    const activeOrdersResult = await query(`
      SELECT COUNT(*) as count 
      FROM orders o
      WHERE o.status IN ('pending', 'processing') ${laundryCheck}
    `, queryParams);

    const stats = {
      pending: 0,
      processing: 0,
      total_active_items: 0,
      active_orders: parseInt(activeOrdersResult.rows[0].count) || 0
    };

    itemsResult.rows.forEach(row => {
      stats[row.status] = parseInt(row.count) || 0;
      stats.total_active_items += parseInt(row.count) || 0;
    });

    // Heuristic:
    // Capacity = 8 items per hour.
    // delay hours = Math.ceil(total_active_items / 8)
    const delayHours = Math.ceil(stats.total_active_items / 8);
    let workloadLevel = 'low';
    if (stats.total_active_items > 40) {
      workloadLevel = 'high';
    } else if (stats.total_active_items > 15) {
      workloadLevel = 'medium';
    }

    res.json({
      success: true,
      data: {
        ...stats,
        suggested_delay_hours: delayHours,
        workload_level: workloadLevel
      }
    });
  } catch (error) {
    console.error('Workload status error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حساب ضغط العمل' });
  }
});

/**
 * GET /api/orders/workload/timeline
 * جلب الطلبات النشطة لجدول خط التوقيت اليومي لليوم المحدد
 */
router.get('/workload/timeline', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    let targetDateStr;

    if (date) {
      targetDateStr = date;
    } else {
      const today = new Date();
      targetDateStr = today.toISOString().split('T')[0];
    }

    let laundryCheck = '';
    let queryParams = [targetDateStr];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      laundryCheck = 'AND o.laundry_id = $2';
      queryParams.push(req.user.laundry_id);
    }

    // جلب الطلبات النشطة التي موعد تسليمها المتوقع في اليوم المحدد
    // أو الطلبات المتأخرة بالكامل (يعني موعد تسليمها قبل اليوم ومستواها ليس delivered/cancelled)
    const timelineResult = await query(`
      SELECT o.id, o.expected_delivery_at, o.status as order_status,
             c.name as customer_name, c.phone as customer_phone,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND status = 'ready') as ready_items
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status NOT IN ('delivered', 'cancelled')
        AND (
          DATE(o.expected_delivery_at) = $1 
          OR DATE(o.expected_delivery_at) < $1
        ) ${laundryCheck}
      ORDER BY o.expected_delivery_at ASC
    `, queryParams);

    res.json({
      success: true,
      data: timelineResult.rows
    });
  } catch (error) {
    console.error('Workload timeline error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب خط التوقيت اليومي' });
  }
});

/**
 * GET /api/orders/workload/weekly
 * جلب ضغط العمل اليومي للأيام السبعة القادمة لتسهيل اتخاذ قرار موعد التسليم
 */
router.get('/workload/weekly', authMiddleware, async (req, res) => {
  try {
    let laundryCheck = '';
    let queryParams = [];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      laundryCheck = 'AND o.laundry_id = $1';
      queryParams.push(req.user.laundry_id);
    }

    // جلب مجموع القطع النشطة المجدولة لكل يوم خلال الـ 7 أيام القادمة
    const result = await query(`
      SELECT DATE(o.expected_delivery_at) as delivery_date, COUNT(oi.id) as items_count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status NOT IN ('delivered', 'cancelled')
        AND o.expected_delivery_at >= CURRENT_DATE
        AND o.expected_delivery_at < CURRENT_DATE + INTERVAL '7 days'
        ${laundryCheck}
      GROUP BY DATE(o.expected_delivery_at)
      ORDER BY delivery_date ASC
    `, queryParams);

    // إعداد هيكل البيانات للأيام السبعة القادمة مع تعبئة الأيام الفارغة بـ 0
    const weeklyData = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // ابحث عن اليوم في نتائج قاعدة البيانات
      const dbRow = result.rows.find(row => {
        const rowDateStr = new Date(row.delivery_date).toISOString().split('T')[0];
        return rowDateStr === dateStr;
      });
      
      const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      weeklyData.push({
        date: dateStr,
        dayName: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : dayNames[date.getDay()],
        count: dbRow ? parseInt(dbRow.items_count) || 0 : 0
      });
    }

    res.json({
      success: true,
      data: weeklyData
    });
  } catch (error) {
    console.error('Weekly workload error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب ضغط العمل الأسبوعي' });
  }
});

/**
 * GET /api/orders/:id
 * عرض تفاصيل طلب واحد مع القطع والمدفوعات
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    let laundryCheck = '';
    let queryParams = [req.params.id];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      laundryCheck = 'AND o.laundry_id = $2';
      queryParams.push(req.user.laundry_id);
    }

    const orderResult = await query(`
      SELECT o.*, 
        c.name as customer_name, 
        c.phone as customer_phone, 
        c.address as customer_address,
        c.latitude as customer_lat,
        c.longitude as customer_lng
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1 ${laundryCheck}
    `, queryParams);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    const order = orderResult.rows[0];

    // جلب القطع
    const itemsResult = await query(`
      SELECT oi.*, s.name_ar as service_name, s.name as service_name_en, sz.size_name
      FROM order_items oi
      JOIN services s ON oi.service_id = s.id
      LEFT JOIN item_sizes sz ON oi.size_id = sz.id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
    `, [order.id]);

    // جلب المدفوعات
    const paymentsResult = await query(`
      SELECT p.*, u.name as created_by_name
      FROM payments p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.order_id = $1
      ORDER BY p.created_at DESC
    `, [order.id]);

    res.json({
      success: true,
      data: { ...order, items: itemsResult.rows, payments: paymentsResult.rows }
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
router.post('/', authMiddleware, authorizeRoles('admin', 'cashier', 'super_owner', 'worker'), async (req, res) => {
  try {
    const { customer_id, items, notes, paid_amount, payment_method, expected_delivery_at, delivery_address, delivery_lat, delivery_lng } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل وعناصر الطلب مطلوبة'
      });
    }

    // التحقق من وجود العميل
    const customerResult = await query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    // حساب الإجمالي وأقصى مدة تسليم
    let totalAmount = 0;
    let maxEstimatedHours = 0;

    const itemsWithPrices = await Promise.all(items.map(async item => {
      const serviceResult = await query('SELECT * FROM services WHERE id = $1 AND is_active = true', [item.service_id]);
      if (serviceResult.rows.length === 0) {
        throw new Error(`الخدمة رقم ${item.service_id} غير موجودة أو معطلة`);
      }
      const service = serviceResult.rows[0];
      const quantity = item.quantity || 1;
      // Use the client-sent price (which may be size-specific); fall back to service base price
      const itemPrice = (item.price != null && parseFloat(item.price) > 0) 
        ? parseFloat(item.price) * quantity 
        : service.price * quantity;
      totalAmount += itemPrice;
      if (service.estimated_hours > maxEstimatedHours) {
        maxEstimatedHours = service.estimated_hours;
      }
      return { ...item, service, price: (item.price != null && parseFloat(item.price) > 0) ? parseFloat(item.price) : service.price, quantity };
    }));

    const paidAmount = parseFloat(paid_amount) || 0;
    const remainingAmount = totalAmount - paidAmount;

    // تاريخ التسليم المتوقع - إذا أرسل العميل تاريخاً نستخدمه، وإلا نحسب تلقائياً
    let expectedDeliveryStr;
    if (expected_delivery_at) {
      expectedDeliveryStr = new Date(expected_delivery_at).toISOString();
    } else {
      const expectedDelivery = new Date();
      expectedDelivery.setHours(expectedDelivery.getHours() + maxEstimatedHours);
      expectedDeliveryStr = expectedDelivery.toISOString();
    }

    // إنشاء الطلب والقطع داخل معاملة واحدة
    const result = await transaction(async (client) => {
      // إنشاء الطلب
      const orderResult = await client.query(`
        INSERT INTO orders (customer_id, status, total_amount, paid_amount, remaining_amount, expected_delivery_at, notes, laundry_id, delivery_address, delivery_lat, delivery_lng)
        VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        customer_id,
        totalAmount,
        paidAmount,
        remainingAmount,
        expectedDeliveryStr,
        notes || '',
        req.user.laundry_id,
        delivery_address || null,
        delivery_lat !== undefined && delivery_lat !== '' ? parseFloat(delivery_lat) : null,
        delivery_lng !== undefined && delivery_lng !== '' ? parseFloat(delivery_lng) : null
      ]);

      const orderId = orderResult.rows[0].id;
      const createdItems = [];

      // إنشاء القطع وتوليد QR codes
      for (const item of itemsWithPrices) {
        const quantity = item.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          const qrCode = await generateQRCode(item.item_type || item.service.name);
          
          let sizeId = null;
          if (item.size_name && item.item_type) {
            const sizeLookup = await client.query(`
              SELECT s.id 
              FROM item_sizes s
              JOIN item_types t ON s.item_type_id = t.id
              WHERE t.name_ar = $1 AND s.size_name = $2
              LIMIT 1
            `, [item.item_type, item.size_name]);
            if (sizeLookup.rows.length > 0) {
              sizeId = sizeLookup.rows[0].id;
            }
          }

          const itemResult = await client.query(`
            INSERT INTO order_items (order_id, service_id, item_type, size_id, qr_code, status, notes, price)
            VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
            RETURNING id
          `, [orderId, item.service_id, item.item_type || item.service.name, sizeId, qrCode, item.notes || '', item.price]);

          const itemId = itemResult.rows[0].id;

          // تسجيل الحالة الأولية
          await client.query(`
            INSERT INTO item_status_log (item_id, old_status, new_status, updated_by)
            VALUES ($1, NULL, 'pending', $2)
          `, [itemId, req.user.id]);

          createdItems.push({
            id: itemId,
            qr_code: qrCode,
            item_type: item.item_type || item.service.name,
            size_name: item.size_name || '',
            service_name: item.service.name_ar,
            status: 'pending',
            price: item.price,
            qr_data: JSON.stringify({
              itemId: itemId,
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
        await client.query(`
          INSERT INTO payments (order_id, amount, method, type, created_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [orderId, paidAmount, payment_method || 'cash', paymentType, req.user.id]);
      }

      return { orderId, createdItems };
    });

    // جلب الطلب الكامل
    const orderResult = await query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [result.orderId]);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الطلب بنجاح',
      data: {
        ...orderResult.rows[0],
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
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, expected_delivery_at } = req.body;

    let laundryCheck = '';
    let queryParams = [id];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      laundryCheck = 'AND laundry_id = $2';
      queryParams.push(req.user.laundry_id);
    }

    const existingResult = await query(`SELECT * FROM orders WHERE id = $1 ${laundryCheck}`, queryParams);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const updateFields = [];
    const updateParams = [];
    let paramCount = 1;

    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      updateParams.push(status);
      if (status === 'delivered') {
        updateFields.push(`delivered_at = CURRENT_TIMESTAMP`);
      }
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      updateParams.push(notes);
    }
    if (expected_delivery_at) {
      updateFields.push(`expected_delivery_at = $${paramCount++}`);
      updateParams.push(expected_delivery_at);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
    }

    updateParams.push(id);
    
    await transaction(async (client) => {
      await client.query(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${paramCount}`, updateParams);

      if (status === 'delivered') {
        // جلب جميع قطع الطلب
        const itemsResult = await client.query('SELECT id, status FROM order_items WHERE order_id = $1', [id]);
        
        // تحديث جميع القطع إلى حالة "تم التسليم"
        await client.query(
          "UPDATE order_items SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1", 
          [id]
        );

        // تسجيل تغيير الحالة لكل قطعة في السجل
        for (const item of itemsResult.rows) {
          if (item.status !== 'delivered') {
            await client.query(
              'INSERT INTO item_status_log (item_id, old_status, new_status, updated_by) VALUES ($1, $2, $3, $4)',
              [item.id, item.status, 'delivered', req.user.id]
            );
          }
        }
      }
    });

    const orderResult = await query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'تم تحديث الطلب بنجاح',
      data: orderResult.rows[0]
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
router.delete('/:id', authMiddleware, authorizeRoles('admin', 'cashier', 'super_owner'), async (req, res) => {
  try {
    const { id } = req.params;

    let laundryCheck = '';
    let queryParams = [id];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      laundryCheck = 'AND laundry_id = $2';
      queryParams.push(req.user.laundry_id);
    }

    const existingResult = await query(`SELECT * FROM orders WHERE id = $1 ${laundryCheck}`, queryParams);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }
    const existing = existingResult.rows[0];

    if (existing.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء طلب تم تسليمه'
      });
    }

    await query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [id]);

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
