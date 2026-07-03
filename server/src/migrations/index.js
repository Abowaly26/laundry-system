// Migration Manager - إدارة احترافية للـ migrations
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

// إنشاء جدول migrations لتتبع المُنفذ
async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// الحصول على قائمة الـ migrations المُنفذة
async function getExecutedMigrations() {
  const result = await query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

// تسجيل migration كمُنفذ
async function recordMigration(name) {
  await query('INSERT INTO migrations (name) VALUES ($1)', [name]);
}

// حذف تسجيل migration
async function removeMigration(name) {
  await query('DELETE FROM migrations WHERE name = $1', [name]);
}

// تنفيذ جميع الـ migrations المعلقة
async function runPendingMigrations() {
  console.log('🔄 Checking for pending migrations...');

  try {
    // إنشاء جدول migrations إذا لم يكن موجوداً
    await createMigrationsTable();

    // الحصول على الـ migrations المُنفذة
    const executed = await getExecutedMigrations();

    // قراءة جميع ملفات الـ migrations
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js') && f !== 'index.js')
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    // تنفيذ الـ migrations المعلقة
    let executed_count = 0;
    for (const file of files) {
      const name = path.basename(file, '.js');
      
      if (executed.includes(name)) {
        console.log(`⏭️  Skipping (already executed): ${name}`);
        continue;
      }

      console.log(`🔄 Running migration: ${name}`);
      const migration = require(path.join(migrationsDir, file));
      
      await migration.up();
      await recordMigration(name);
      
      console.log(`✅ Completed: ${name}`);
      executed_count++;
    }

    if (executed_count === 0) {
      console.log('✅ Database is up to date. No migrations to run.');
    } else {
      console.log(`✅ Successfully executed ${executed_count} migration(s)`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// التراجع عن آخر migration
async function rollbackLastMigration() {
  console.log('🔄 Rolling back last migration...');

  try {
    await createMigrationsTable();
    
    const result = await query(
      'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No migrations to rollback');
      return;
    }

    const name = result.rows[0].name;
    console.log(`🔄 Rolling back: ${name}`);

    const migrationsDir = __dirname;
    const migration = require(path.join(migrationsDir, `${name}.js`));
    
    await migration.down();
    await removeMigration(name);
    
    console.log(`✅ Rolled back: ${name}`);

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = {
  runPendingMigrations,
  rollbackLastMigration
};
