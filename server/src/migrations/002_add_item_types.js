const { query } = require('../config/database');

async function up() {
  console.log('🔄 Running migration: 002_add_item_types');

  try {
    // 1. Create item_types table
    await query(`
      CREATE TABLE IF NOT EXISTS item_types (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created: item_types');

    // 2. Create item_sizes table
    await query(`
      CREATE TABLE IF NOT EXISTS item_sizes (
        id SERIAL PRIMARY KEY,
        item_type_id INTEGER NOT NULL REFERENCES item_types(id) ON DELETE CASCADE,
        size_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created: item_sizes');

    // 3. Create item_size_prices table
    await query(`
      CREATE TABLE IF NOT EXISTS item_size_prices (
        id SERIAL PRIMARY KEY,
        item_size_id INTEGER NOT NULL REFERENCES item_sizes(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_size_id, service_id)
      )
    `);
    console.log('✅ Table created: item_size_prices');

    // 4. Alter order_items table to link size
    await query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS size_id INTEGER REFERENCES item_sizes(id) ON DELETE SET NULL
    `);
    console.log('✅ Altered table: order_items (added size_id)');

    // 5. Seed initial data
    const servicesRes = await query('SELECT id, name_ar, price FROM services');
    const services = servicesRes.rows;

    const defaultItems = [
      { name_ar: 'قميص / تيشرت', name_en: 'Shirt / T-Shirt', sizes: ['عادي'] },
      { name_ar: 'بنطلون / جينز', name_en: 'Pants / Jeans', sizes: ['عادي'] },
      { name_ar: 'ثوب', name_en: 'Thobe', sizes: ['عادي'] },
      { name_ar: 'فستان', name_en: 'Dress', sizes: ['عادي', 'سهرة'] },
      { name_ar: 'بدلة كاملة', name_en: 'Full Suit', sizes: ['عادي'] },
      { name_ar: 'جاكيت / معطف', name_en: 'Jacket / Coat', sizes: ['عادي'] },
      { name_ar: 'بطانية', name_en: 'Blanket', sizes: ['صغير', 'وسط', 'كبير'] },
      { name_ar: 'سجادة', name_en: 'Carpet', sizes: ['صغير (2x3)', 'كبير (3x4)', 'متر مربع'] },
      { name_ar: 'أخرى', name_en: 'Other', sizes: ['عادي'] }
    ];

    for (const item of defaultItems) {
      // Insert item type
      const itemTypeRes = await query(
        'INSERT INTO item_types (name_ar, name_en) VALUES ($1, $2) RETURNING id',
        [item.name_ar, item.name_en]
      );
      const itemTypeId = itemTypeRes.rows[0].id;

      for (const sizeName of item.sizes) {
        // Insert size
        const sizeRes = await query(
          'INSERT INTO item_sizes (item_type_id, size_name) VALUES ($1, $2) RETURNING id',
          [itemTypeId, sizeName]
        );
        const sizeId = sizeRes.rows[0].id;

        // Add prices for all seeded services
        for (const service of services) {
          let multiplier = 1.0;
          
          if (sizeName === 'صغير' || sizeName.includes('صغير')) {
            multiplier = 0.8;
          } else if (sizeName === 'كبير' || sizeName.includes('كبير')) {
            multiplier = 1.4;
          } else if (sizeName === 'سهرة') {
            multiplier = 1.8;
          }

          let basePrice = parseFloat(service.price);
          
          // Custom override logic to make default prices realistic
          if (item.name_ar === 'سجادة' && service.name_ar.includes('سجاد')) {
            if (sizeName.includes('2x3')) basePrice = 30.0;
            else if (sizeName.includes('3x4')) basePrice = 60.0;
            else basePrice = 15.0; // square meter
          } else if (item.name_ar === 'بطانية' && service.name_ar.includes('بطاني')) {
            if (sizeName === 'صغير') basePrice = 20.0;
            else if (sizeName === 'وسط') basePrice = 30.0;
            else basePrice = 40.0;
          } else {
            // Non-matching general cleaning services
            if (service.name_ar.includes('سجاد') || service.name_ar.includes('بطاني')) {
              basePrice = 0.0; // not applicable for shirts/pants
            } else {
              basePrice = basePrice * multiplier;
            }
          }

          await query(
            'INSERT INTO item_size_prices (item_size_id, service_id, price) VALUES ($1, $2, $3)',
            [sizeId, service.id, Math.round(basePrice * 2) / 2] // round to nearest 0.5
          );
        }
      }
    }
    console.log('✅ Seeded default item types, sizes, and price matrix successfully!');

  } catch (error) {
    console.error('❌ Migration 002_add_item_types failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back migration: 002_add_item_types');
  try {
    await query('ALTER TABLE order_items DROP COLUMN IF EXISTS size_id');
    await query('DROP TABLE IF EXISTS item_size_prices CASCADE');
    await query('DROP TABLE IF EXISTS item_sizes CASCADE');
    await query('DROP TABLE IF EXISTS item_types CASCADE');
    console.log('✅ Database rolled back successfully (002_add_item_types)');
  } catch (error) {
    console.error('❌ Rollback 002_add_item_types failed:', error);
    throw error;
  }
}

module.exports = { up, down };
