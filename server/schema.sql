-- ===================================
-- Smart Laundry Management System
-- PostgreSQL Database Schema
-- ===================================

-- Drop existing tables (for clean installation)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ===================================
-- جدول المستخدمين (Users)
-- ===================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'cashier', 'worker')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ===================================
-- جدول العملاء (Customers)
-- ===================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);

-- ===================================
-- جدول الخدمات (Services)
-- ===================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'piece' CHECK (unit IN ('piece', 'kg', 'set')),
    estimated_hours INTEGER DEFAULT 24,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_active ON services(is_active);

-- ===================================
-- جدول الطلبات (Orders)
-- ===================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')),
    delivery_date TIMESTAMP,
    notes TEXT,
    tracking_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_tracking ON orders(tracking_code);
CREATE INDEX idx_orders_date ON orders(created_at);

-- ===================================
-- جدول عناصر الطلب (Order Items)
-- ===================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'washing', 'drying', 'ironing', 'ready')),
    qr_code VARCHAR(255) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_service ON order_items(service_id);
CREATE INDEX idx_order_items_qr ON order_items(qr_code);
CREATE INDEX idx_order_items_status ON order_items(status);

-- ===================================
-- جدول المدفوعات (Payments)
-- ===================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile')),
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_date ON payments(created_at);

-- ===================================
-- Views للإحصائيات
-- ===================================

-- عرض إحصائيات العملاء
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
    c.id,
    c.name,
    c.phone,
    COUNT(o.id) as orders_count,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    COALESCE(SUM(o.paid_amount), 0) as total_paid,
    COALESCE(SUM(o.remaining_amount), 0) as total_remaining,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.phone;

-- عرض الطلبات مع تفاصيل العميل
CREATE OR REPLACE VIEW orders_with_customer AS
SELECT 
    o.*,
    c.name as customer_name,
    c.phone as customer_phone,
    c.address as customer_address,
    u.name as created_by_user
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON o.user_id = u.id;

-- ===================================
-- Triggers لتحديث updated_at تلقائياً
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- تهيئة البيانات الأولية (سيتم تشغيلها من seed.js)
-- ===================================

-- نهاية الملف
