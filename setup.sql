-- =============================================================
--  Cafe Management System — Database Setup Script
--  Run this script ONCE to create the database and all tables.
--  Compatible with MySQL 8.0+
-- =============================================================

-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS cafe_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cafe_management;

-- Step 2: categories table
--   Stores the different menu categories (e.g., Coffee, Snacks, Desserts).
--   Must exist before menu_items because menu_items has a FK to it.
CREATE TABLE IF NOT EXISTS categories (
    category_id   INT           NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(100)  NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_categories PRIMARY KEY (category_id),
    CONSTRAINT uq_category_name UNIQUE (category_name)
) ENGINE=InnoDB;

-- Step 3: menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    item_id      INT            NOT NULL AUTO_INCREMENT,
    item_name    VARCHAR(150)   NOT NULL,
    category_id  INT            NOT NULL,
    description  TEXT,
    price        DECIMAL(10, 2) NOT NULL,
    is_available TINYINT(1)     NOT NULL DEFAULT 1,
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_menu_items  PRIMARY KEY (item_id),
    CONSTRAINT uq_item_name   UNIQUE (item_name),
    CONSTRAINT fk_item_cat    FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_price      CHECK (price > 0)
) ENGINE=InnoDB;

-- Index: speed up searches by category
CREATE INDEX IF NOT EXISTS idx_item_category ON menu_items(category_id);
-- Index: speed up availability filter queries
CREATE INDEX IF NOT EXISTS idx_item_available ON menu_items(is_available);

-- Step 4: orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id     INT            NOT NULL AUTO_INCREMENT,
    order_date   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status       ENUM(
                    'Pending',
                    'Preparing',
                    'Ready',
                    'Completed',
                    'Cancelled'
                 )              NOT NULL DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes        TEXT,

    CONSTRAINT pk_orders PRIMARY KEY (order_id)
) ENGINE=InnoDB;

-- Index: speed up queries filtered by status
CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
-- Index: speed up date-range queries
CREATE INDEX IF NOT EXISTS idx_order_date   ON orders(order_date);

-- Step 5: order_items table
--   Each row = one line item in an order.
--   unit_price is stored at order time so that future price changes
--   do NOT retroactively alter old bill amounts (audit integrity).
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT            NOT NULL AUTO_INCREMENT,
    order_id      INT            NOT NULL,
    item_id       INT            NOT NULL,
    quantity      INT            NOT NULL,
    unit_price    DECIMAL(10, 2) NOT NULL,
    subtotal      DECIMAL(10, 2) NOT NULL,

    CONSTRAINT pk_order_items PRIMARY KEY (order_item_id),
    CONSTRAINT fk_oi_order    FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,      -- deleting an order removes its line items
    CONSTRAINT fk_oi_item     FOREIGN KEY (item_id)
        REFERENCES menu_items(item_id)
        ON DELETE RESTRICT,     -- cannot delete a menu item that has order history
    CONSTRAINT chk_qty        CHECK (quantity > 0),
    CONSTRAINT chk_subtotal   CHECK (subtotal >= 0)
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_oi_order ON order_items(order_id);

-- =============================================================
--  Step 6: Seed default categories
--  These give the user something to start with immediately.
-- =============================================================
INSERT IGNORE INTO categories (category_name) VALUES
    ('Coffee'),
    ('Tea'),
    ('Cold Drinks'),
    ('Snacks'),
    ('Desserts'),
    ('Bakery'),
    ('Breakfast');

-- =============================================================
--  Step 7: Seed sample menu items (for demo/testing only)
-- =============================================================
INSERT IGNORE INTO menu_items (item_name, category_id, description, price, is_available) VALUES
    ('Espresso',         1, 'Strong single-shot espresso.',             80.00,  1),
    ('Cappuccino',       1, 'Espresso with steamed milk foam.',        120.00,  1),
    ('Cafe Latte',       1, 'Espresso with lots of steamed milk.',     130.00,  1),
    ('Cold Coffee',      3, 'Chilled coffee with ice cream.',          150.00,  1),
    ('Masala Chai',      2, 'Spiced Indian milk tea.',                  60.00,  1),
    ('Green Tea',        2, 'Light and healthy green tea.',             80.00,  1),
    ('Chocolate Cake',   5, 'Rich dark chocolate slice.',              180.00,  1),
    ('Croissant',        6, 'Flaky buttery French croissant.',         110.00,  1),
    ('Veg Sandwich',     4, 'Fresh vegetable sandwich on wheat bread.',  90.00, 1),
    ('French Fries',     4, 'Crispy golden fries with seasoning.',     100.00,  1);

-- =============================================================
--  Verification: Show row counts after setup
-- =============================================================
SELECT 'categories' AS table_name, COUNT(*) AS rows FROM categories
UNION ALL
SELECT 'menu_items',               COUNT(*)          FROM menu_items
UNION ALL
SELECT 'orders',                   COUNT(*)          FROM orders
UNION ALL
SELECT 'order_items',              COUNT(*)          FROM order_items;
