const express = require('express');
const { query, transaction } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');

const router = express.Router();

// Apply auth middleware globally
router.use(authMiddleware);

/**
 * GET /api/item-types
 * جلب جميع أنواع القطع مع أحجامها وأسعارها
 */
router.get('/', async (req, res) => {
  try {
    // 1. جلب أنواع القطع
    const typesRes = await query('SELECT * FROM item_types ORDER BY name_ar ASC');
    const itemTypes = typesRes.rows;

    // 2. جلب جميع الأحجام
    const sizesRes = await query('SELECT * FROM item_sizes ORDER BY id ASC');
    const itemSizes = sizesRes.rows;

    // 3. جلب الأسعار للمغسلة الحالية فقط
    let pricesQuery = 'SELECT p.* FROM item_size_prices p';
    let pricesParams = [];
    if (req.user.role !== 'super_owner' && req.user.laundry_id) {
      pricesQuery += ' JOIN services s ON p.service_id = s.id WHERE s.laundry_id = $1';
      pricesParams.push(req.user.laundry_id);
    }
    pricesQuery += ' ORDER BY p.id ASC';
    const pricesRes = await query(pricesQuery, pricesParams);
    const sizePrices = pricesRes.rows;

    // تجميع البيانات بشكل شجري احترافي
    const result = itemTypes.map(type => {
      const typeSizes = itemSizes
        .filter(size => size.item_type_id === type.id)
        .map(size => {
          const prices = sizePrices
            .filter(price => price.item_size_id === size.id)
            .map(price => ({
              service_id: price.service_id,
              price: parseFloat(price.price)
            }));

          return {
            id: size.id,
            size_name: size.size_name,
            prices
          };
        });

      return {
        id: type.id,
        name_ar: type.name_ar,
        name_en: type.name_en,
        sizes: typeSizes
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    // إذا كانت الجداول غير موجودة بعد (migration لم يُنفَّذ)، نُرجع قائمة فارغة
    if (error.code === '42P01') { // PostgreSQL: table does not exist
      console.warn('⚠️  item_types tables not found - migration may be pending');
      return res.json({ success: true, data: [] });
    }
    console.error('Get item types error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب أنواع القطع والأسعار' });
  }
});

/**
 * POST /api/item-types
 * إضافة نوع قطعة جديد مع الأحجام وأسعار الخدمات (المدير فقط)
 */
router.post('/', authorizeRoles('super_owner', 'admin'), async (req, res) => {
  try {
    const { name_ar, name_en, sizes, prices } = req.body;

    if (!name_ar || !sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال اسم القطعة باللغة العربية وتحديد حجم واحد على الأقل'
      });
    }

    const newType = await transaction(async (client) => {
      // 1. إدخال نوع القطعة
      const typeInsert = await client.query(
        'INSERT INTO item_types (name_ar, name_en) VALUES ($1, $2) RETURNING *',
        [name_ar, name_en || '']
      );
      const itemType = typeInsert.rows[0];

      // 2. إدخال الأحجام وأسعارها
      const itemSizesList = [];
      for (const sizeName of sizes) {
        const sizeInsert = await client.query(
          'INSERT INTO item_sizes (item_type_id, size_name) VALUES ($1, $2) RETURNING *',
          [itemType.id, sizeName]
        );
        const sizeObj = sizeInsert.rows[0];
        const pricesList = [];

        // إدخال أسعار الخدمات لهذا الحجم
        const sizePricesObj = prices && prices[sizeName] ? prices[sizeName] : {};
        for (const serviceId of Object.keys(sizePricesObj)) {
          const priceVal = parseFloat(sizePricesObj[serviceId]) || 0.00;
          const priceInsert = await client.query(
            'INSERT INTO item_size_prices (item_size_id, service_id, price) VALUES ($1, $2, $3) RETURNING *',
            [sizeObj.id, parseInt(serviceId), priceVal]
          );
          pricesList.push({
            service_id: parseInt(serviceId),
            price: parseFloat(priceInsert.rows[0].price)
          });
        }

        itemSizesList.push({
          id: sizeObj.id,
          size_name: sizeObj.size_name,
          prices: pricesList
        });
      }

      return {
        ...itemType,
        sizes: itemSizesList
      };
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة نوع القطعة وشبكة الأسعار بنجاح',
      data: newType
    });
  } catch (error) {
    console.error('Create item type error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء نوع القطعة' });
  }
});

/**
 * PUT /api/item-types/:id
 * تعديل اسم نوع القطعة، أحجامها وأسعارها (المدير فقط)
 */
router.put('/:id', authorizeRoles('super_owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name_ar, name_en, sizes, prices } = req.body;

    if (!name_ar || !sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال اسم القطعة وتحديد حجم واحد على الأقل'
      });
    }

    const updatedType = await transaction(async (client) => {
      // 1. تحديث اسم القطعة
      await client.query(
        'UPDATE item_types SET name_ar = $1, name_en = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [name_ar, name_en || '', id]
      );

      // 2. جلب الأحجام الحالية في قاعدة البيانات
      const currentSizesRes = await client.query(
        'SELECT * FROM item_sizes WHERE item_type_id = $1',
        [id]
      );
      const currentSizes = currentSizesRes.rows;

      // 3. تحديد الأحجام المراد حذفها (التي ليست في القائمة الجديدة)
      const sizesToDelete = currentSizes.filter(cs => !sizes.includes(cs.size_name));
      for (const sizeToDelete of sizesToDelete) {
        await client.query('DELETE FROM item_sizes WHERE id = $1', [sizeToDelete.id]);
      }

      const itemSizesList = [];
      
      // 4. معالجة الأحجام الجديدة والحالية
      for (const sizeName of sizes) {
        let sizeObj;
        const existingSize = currentSizes.find(cs => cs.size_name === sizeName);

        if (existingSize) {
          sizeObj = existingSize;
        } else {
          // حجم جديد
          const sizeInsert = await client.query(
            'INSERT INTO item_sizes (item_type_id, size_name) VALUES ($1, $2) RETURNING *',
            [id, sizeName]
          );
          sizeObj = sizeInsert.rows[0];
        }

        // مسح الأسعار القديمة لهذا الحجم وإعادة كتابتها للتسهيل والموثوقية
        await client.query('DELETE FROM item_size_prices WHERE item_size_id = $1', [sizeObj.id]);

        const pricesList = [];
        const sizePricesObj = prices && prices[sizeName] ? prices[sizeName] : {};
        
        for (const serviceId of Object.keys(sizePricesObj)) {
          const priceVal = parseFloat(sizePricesObj[serviceId]) || 0.00;
          const priceInsert = await client.query(
            'INSERT INTO item_size_prices (item_size_id, service_id, price) VALUES ($1, $2, $3) RETURNING *',
            [sizeObj.id, parseInt(serviceId), priceVal]
          );
          pricesList.push({
            service_id: parseInt(serviceId),
            price: parseFloat(priceInsert.rows[0].price)
          });
        }

        itemSizesList.push({
          id: sizeObj.id,
          size_name: sizeObj.size_name,
          prices: pricesList
        });
      }

      // جلب الكائن المحدث
      const typeRes = await client.query('SELECT * FROM item_types WHERE id = $1', [id]);
      
      return {
        ...typeRes.rows[0],
        sizes: itemSizesList
      };
    });

    res.json({
      success: true,
      message: 'تم تحديث نوع القطعة وشبكة الأسعار بنجاح',
      data: updatedType
    });
  } catch (error) {
    console.error('Update item type error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعديل نوع القطعة' });
  }
});

/**
 * DELETE /api/item-types/:id
 * حذف نوع قطعة بالكامل (المدير فقط)
 */
router.delete('/:id', authorizeRoles('super_owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM item_types WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'نوع القطعة غير موجود' });
    }

    res.json({
      success: true,
      message: 'تم حذف نوع القطعة بنجاح'
    });
  } catch (error) {
    console.error('Delete item type error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف نوع القطعة' });
  }
});

module.exports = router;
