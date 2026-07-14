require('dotenv').config();
const { query } = require('./src/config/database');

async function fix() {
  try {
    await query("UPDATE services SET name_ar='غسيل فقط', name='Wash Only' WHERE name_ar='غسيل عادي'");
    await query("UPDATE services SET name_ar='غسيل وكي', name='Wash & Iron' WHERE name_ar='تنظيف سجاد'");
    await query("UPDATE services SET name_ar='غسيل وكي مستعجل', name='Urgent Wash & Iron' WHERE name_ar='تنظيف بطانيات'");
    
    console.log("Services fixed successfully!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
