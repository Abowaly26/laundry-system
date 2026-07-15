// Migration 010: إضافة إحداثيات الموقع (Latitude & Longitude) للعملاء والمغاسل والطلبات الخرائط التفاعلية
const { query } = require('../config/database');

async function up() {
  console.log('  → Adding latitude and longitude columns to customers table...');
  await query(`
    ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
  `);

  console.log('  → Adding latitude and longitude columns to laundries table...');
  await query(`
    ALTER TABLE laundries 
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
  `);

  console.log('  → Adding delivery location columns to orders table...');
  await query(`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS delivery_address TEXT,
    ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION
  `);

  console.log('  → Creating indexes for coordinates...');
  await query(`
    CREATE INDEX IF NOT EXISTS idx_customers_coords ON customers(latitude, longitude);
  `);
}

module.exports = { up };
