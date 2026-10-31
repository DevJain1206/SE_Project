# -*- coding: utf-8 -*-
"""
Cafe Management System — Backend
=================================
Flask REST API backend with SQLite database persistence.
Student: Dev Jain | Roll: 44 | Section: A4 | Batch: B3

Run:
  python app.py
Open:
  http://localhost:5000
"""

import os
import sys
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

app = Flask(__name__, static_folder='.')

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cafe.db')


# ══════════════════════════════════════════════════════════════
#  DATABASE INITIALIZATION & HELPERS
# ══════════════════════════════════════════════════════════════

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Menu items table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            available INTEGER NOT NULL DEFAULT 1
        )
    """)

    # Orders table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_date TEXT NOT NULL,
            customer_name TEXT NOT NULL DEFAULT 'Customer',
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            payment_status TEXT NOT NULL DEFAULT 'Unpaid',
            payment_method TEXT DEFAULT 'Cash'
        )
    """)

    # Order items table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_item_id INTEGER,
            item_name TEXT NOT NULL,
            category TEXT,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    """)

    # Seed initial menu items if table is empty
    cursor.execute("SELECT COUNT(*) AS cnt FROM menu_items")
    if cursor.fetchone()['cnt'] == 0:
        sample_menu = [
            ('Espresso', 'Coffee', 80.0, 'Strong single-shot dark espresso.', 1),
            ('Cappuccino', 'Coffee', 120.0, 'Espresso with rich velvety steamed milk foam.', 1),
            ('Cafe Latte', 'Coffee', 130.0, 'Smooth espresso balanced with fresh steamed milk.', 1),
            ('Cold Coffee', 'Cold Drinks', 150.0, 'Chilled artisan blend with vanilla ice cream.', 1),
            ('Masala Chai', 'Tea', 60.0, 'Traditional spiced Indian tea with cardamom & ginger.', 1),
            ('Green Tea', 'Tea', 80.0, 'Light, soothing organic herbal green tea.', 1),
            ('Chocolate Cake', 'Desserts', 180.0, 'Decadent rich dark chocolate truffle slice.', 1),
            ('Croissant', 'Bakery', 110.0, 'Freshly baked flaky, buttery French pastry.', 1),
            ('Veg Grilled Sandwich', 'Snacks', 90.0, 'Toasted artisan bread with spiced veggies & mint.', 1),
            ('French Fries', 'Snacks', 100.0, 'Golden crispy potato fries with peri-peri seasoning.', 1),
            ('Fluffy Pancakes', 'Breakfast', 140.0, 'Triple stacked warm pancakes with maple syrup.', 1),
            ('Mango Smoothie', 'Cold Drinks', 160.0, 'Alphonso mangoes blended with rich greek yogurt.', 1),
        ]
        cursor.executemany("""
            INSERT INTO menu_items (name, category, price, description, available)
            VALUES (?, ?, ?, ?, ?)
        """, sample_menu)

    # Seed sample live orders if orders table is empty
    cursor.execute("SELECT COUNT(*) AS cnt FROM orders")
    if cursor.fetchone()['cnt'] == 0:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO orders (order_date, customer_name, subtotal, tax, total, status, payment_status, payment_method)
            VALUES (?, 'Dev Jain', 200.0, 10.0, 210.0, 'Preparing', 'Paid', 'UPI')
        """, (now_str,))
        order_id1 = cursor.lastrowid
        cursor.execute("""
            INSERT INTO order_items (order_id, menu_item_id, item_name, category, quantity, unit_price, subtotal)
            VALUES (?, 2, 'Cappuccino', 'Coffee', 1, 120.0, 120.0)
        """, (order_id1,))
        cursor.execute("""
            INSERT INTO order_items (order_id, menu_item_id, item_name, category, quantity, unit_price, subtotal)
            VALUES (?, 6, 'Green Tea', 'Tea', 1, 80.0, 80.0)
        """, (order_id1,))

        cursor.execute("""
            INSERT INTO orders (order_date, customer_name, subtotal, tax, total, status, payment_status, payment_method)
            VALUES (?, 'Table 4', 270.0, 13.5, 283.5, 'Pending', 'Unpaid', 'Cash')
        """, (now_str,))
        order_id2 = cursor.lastrowid
        cursor.execute("""
            INSERT INTO order_items (order_id, menu_item_id, item_name, category, quantity, unit_price, subtotal)
            VALUES (?, 7, 'Chocolate Cake', 'Desserts', 1, 180.0, 180.0)
        """, (order_id2,))
        cursor.execute("""
            INSERT INTO order_items (order_id, menu_item_id, item_name, category, quantity, unit_price, subtotal)
            VALUES (?, 9, 'Veg Grilled Sandwich', 'Snacks', 1, 90.0, 90.0)
        """, (order_id2,))

    conn.commit()
    conn.close()


# ══════════════════════════════════════════════════════════════
#  CORS HEADERS
# ══════════════════════════════════════════════════════════════

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


# ══════════════════════════════════════════════════════════════
#  STATIC ROUTING (Serves the Web Interface)
# ══════════════════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


# ══════════════════════════════════════════════════════════════
#  REST API: MENU ITEMS
# ══════════════════════════════════════════════════════════════

@app.route('/api/menu', methods=['GET'])
def get_menu():
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip()
    available_only = request.args.get('available_only', 'false').lower() == 'true'

    query = "SELECT * FROM menu_items WHERE 1=1"
    params = []

    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (name LIKE ? OR description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    if available_only:
        query += " AND available = 1"

    query += " ORDER BY category ASC, name ASC"

    conn = get_db()
    items = conn.execute(query, params).fetchall()
    conn.close()

    result = [
        {
            'id': row['id'],
            'name': row['name'],
            'category': row['category'],
            'price': float(row['price']),
            'description': row['description'] or '',
            'available': bool(row['available'])
        }
        for row in items
    ]
    return jsonify(result)


@app.route('/api/menu/<int:item_id>', methods=['GET'])
def get_menu_item(item_id):
    conn = get_db()
    item = conn.execute("SELECT * FROM menu_items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    return jsonify({
        'id': item['id'],
        'name': item['name'],
        'category': item['category'],
        'price': float(item['price']),
        'description': item['description'] or '',
        'available': bool(item['available'])
    })


@app.route('/api/menu', methods=['POST'])
def add_menu_item():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    category = (data.get('category') or '').strip()
    description = (data.get('description') or '').strip()
    price = data.get('price')
    available = 1 if data.get('available', True) else 0

    if not name:
        return jsonify({'error': 'Item name is required'}), 400
    if not category:
        return jsonify({'error': 'Category is required'}), 400
    try:
        price = float(price)
        if price <= 0:
            return jsonify({'error': 'Price must be greater than 0'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid price format'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO menu_items (name, category, price, description, available)
            VALUES (?, ?, ?, ?, ?)
        """, (name, category, round(price, 2), description, available))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': new_id, 'message': f'"{name}" added to menu successfully'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': f'An item named "{name}" already exists'}), 409


@app.route('/api/menu/<int:item_id>', methods=['PUT'])
def update_menu_item(item_id):
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    category = (data.get('category') or '').strip()
    description = (data.get('description') or '').strip()
    price = data.get('price')
    available = 1 if data.get('available', True) else 0

    if not name:
        return jsonify({'error': 'Item name is required'}), 400
    if not category:
        return jsonify({'error': 'Category is required'}), 400
    try:
        price = float(price)
        if price <= 0:
            return jsonify({'error': 'Price must be greater than 0'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid price format'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE menu_items
            SET name = ?, category = ?, price = ?, description = ?, available = ?
            WHERE id = ?
        """, (name, category, round(price, 2), description, available, item_id))
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        conn.commit()
        conn.close()
        return jsonify({'message': f'Item updated successfully'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': f'An item named "{name}" already exists'}), 409


@app.route('/api/menu/<int:item_id>/price', methods=['PATCH'])
def update_item_price(item_id):
    data = request.get_json() or {}
    price = data.get('price')
    try:
        price = float(price)
        if price <= 0:
            return jsonify({'error': 'Price must be greater than 0'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid price format'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE menu_items SET price = ? WHERE id = ?", (round(price, 2), item_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Item not found'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': f'Price updated to ₹{price:.2f}'})


@app.route('/api/menu/<int:item_id>/toggle', methods=['PATCH'])
def toggle_item_availability(item_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE menu_items SET available = CASE WHEN available = 1 THEN 0 ELSE 1 END WHERE id = ?", (item_id,))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Item not found'}), 404
    conn.commit()
    item = conn.execute("SELECT available FROM menu_items WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return jsonify({'available': bool(item['available']), 'message': 'Availability status updated'})


@app.route('/api/menu/<int:item_id>', methods=['DELETE'])
def delete_menu_item(item_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM menu_items WHERE id = ?", (item_id,))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Item not found'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': 'Menu item deleted successfully'})


# ══════════════════════════════════════════════════════════════
#  REST API: ORDERS
# ══════════════════════════════════════════════════════════════

@app.route('/api/orders', methods=['GET'])
def get_orders():
    status = request.args.get('status', '').strip()
    payment = request.args.get('payment', '').strip()

    query = "SELECT * FROM orders WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if payment:
        query += " AND payment_status = ?"
        params.append(payment)

    query += " ORDER BY id DESC"

    conn = get_db()
    orders = conn.execute(query, params).fetchall()

    result = []
    for o in orders:
        items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (o['id'],)).fetchall()
        result.append({
            'id': o['id'],
            'order_date': o['order_date'],
            'customer_name': o['customer_name'],
            'subtotal': float(o['subtotal']),
            'tax': float(o['tax']),
            'total': float(o['total']),
            'status': o['status'],
            'payment_status': o['payment_status'],
            'payment_method': o['payment_method'],
            'items': [
                {
                    'id': it['id'],
                    'menu_item_id': it['menu_item_id'],
                    'item_name': it['item_name'],
                    'category': it['category'],
                    'quantity': it['quantity'],
                    'unit_price': float(it['unit_price']),
                    'subtotal': float(it['subtotal'])
                }
                for it in items
            ]
        })
    conn.close()
    return jsonify(result)


@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    conn = get_db()
    order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if not order:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404

    items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,)).fetchall()
    conn.close()

    return jsonify({
        'id': order['id'],
        'order_date': order['order_date'],
        'customer_name': order['customer_name'],
        'subtotal': float(order['subtotal']),
        'tax': float(order['tax']),
        'total': float(order['total']),
        'status': order['status'],
        'payment_status': order['payment_status'],
        'payment_method': order['payment_method'],
        'items': [
            {
                'id': it['id'],
                'menu_item_id': it['menu_item_id'],
                'item_name': it['item_name'],
                'category': it['category'],
                'quantity': it['quantity'],
                'unit_price': float(it['unit_price']),
                'subtotal': float(it['subtotal'])
            }
            for it in items
        ]
    })


@app.route('/api/orders', methods=['POST'])
def place_order():
    data = request.get_json() or {}
    items = data.get('items', [])
    customer_name = (data.get('customer_name') or 'Customer').strip()
    payment_method = data.get('payment_method') or 'Cash'

    if not items or not isinstance(items, list):
        return jsonify({'error': 'Order must contain at least one item'}), 400

    subtotal = 0.0
    verified_items = []

    for it in items:
        name = (it.get('name') or it.get('item_name') or '').strip()
        cat = (it.get('category') or '').strip()
        try:
            qty = int(it.get('quantity') or it.get('qty') or 0)
            price = float(it.get('price') or it.get('unit_price') or 0)
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid quantity or price for item "{name}"'}), 400

        if qty <= 0:
            return jsonify({'error': f'Quantity for "{name}" must be greater than 0'}), 400
        if price <= 0:
            return jsonify({'error': f'Price for "{name}" must be greater than 0'}), 400

        item_subtotal = round(qty * price, 2)
        subtotal += item_subtotal
        verified_items.append({
            'menu_item_id': it.get('id') or it.get('menu_item_id'),
            'name': name,
            'category': cat,
            'quantity': qty,
            'unit_price': price,
            'subtotal': item_subtotal
        })

    subtotal = round(subtotal, 2)
    tax = round(subtotal * 0.05, 2)  # 5% GST
    total = round(subtotal + tax, 2)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO orders (order_date, customer_name, subtotal, tax, total, status, payment_status, payment_method)
        VALUES (?, ?, ?, ?, ?, 'Pending', 'Unpaid', ?)
    """, (now_str, customer_name, subtotal, tax, total, payment_method))
    order_id = cursor.lastrowid

    for vi in verified_items:
        cursor.execute("""
            INSERT INTO order_items (order_id, menu_item_id, item_name, category, quantity, unit_price, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (order_id, vi['menu_item_id'], vi['name'], vi['category'], vi['quantity'], vi['unit_price'], vi['subtotal']))

    conn.commit()
    conn.close()

    return jsonify({
        'order_id': order_id,
        'order_date': now_str,
        'customer_name': customer_name,
        'subtotal': subtotal,
        'tax': tax,
        'total': total,
        'status': 'Pending',
        'payment_status': 'Unpaid',
        'message': f'Order #{order_id} placed successfully!'
    }), 201


@app.route('/api/orders/<int:order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    data = request.get_json() or {}
    new_status = data.get('status', '').strip()
    valid_statuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled']

    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Allowed: {valid_statuses}'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404
    conn.commit()
    conn.close()
    return jsonify({'order_id': order_id, 'status': new_status, 'message': f'Order #{order_id} status updated to {new_status}'})


@app.route('/api/orders/<int:order_id>/payment', methods=['PATCH'])
def update_order_payment(order_id):
    data = request.get_json() or {}
    new_payment = data.get('payment_status', '').strip()

    conn = get_db()
    cursor = conn.cursor()

    if not new_payment:
        # Toggle mode
        cursor.execute("""
            UPDATE orders
            SET payment_status = CASE WHEN payment_status = 'Paid' THEN 'Unpaid' ELSE 'Paid' END
            WHERE id = ?
        """, (order_id,))
    else:
        if new_payment not in ['Paid', 'Unpaid']:
            conn.close()
            return jsonify({'error': 'Payment status must be Paid or Unpaid'}), 400
        cursor.execute("UPDATE orders SET payment_status = ? WHERE id = ?", (new_payment, order_id))

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404
    conn.commit()

    order = conn.execute("SELECT payment_status FROM orders WHERE id = ?", (order_id,)).fetchone()
    conn.close()
    return jsonify({
        'order_id': order_id,
        'payment_status': order['payment_status'],
        'message': f'Order #{order_id} marked as {order["payment_status"]}'
    })


# ══════════════════════════════════════════════════════════════
#  REST API: DASHBOARD STATS
# ══════════════════════════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    total_menu = conn.execute("SELECT COUNT(*) AS c FROM menu_items").fetchone()['c']
    total_orders = conn.execute("SELECT COUNT(*) AS c FROM orders").fetchone()['c']
    live_orders = conn.execute("SELECT COUNT(*) AS c FROM orders WHERE status IN ('Pending', 'Preparing', 'Ready')").fetchone()['c']
    unpaid_orders = conn.execute("SELECT COUNT(*) AS c FROM orders WHERE payment_status = 'Unpaid'").fetchone()['c']
    revenue_row = conn.execute("SELECT SUM(total) AS rev FROM orders WHERE payment_status = 'Paid'").fetchone()
    total_revenue = float(revenue_row['rev'] or 0.0)
    conn.close()

    return jsonify({
        'menu_items': total_menu,
        'total_orders': total_orders,
        'live_orders': live_orders,
        'unpaid_orders': unpaid_orders,
        'total_revenue': round(total_revenue, 2)
    })


if __name__ == '__main__':
    init_db()
    print("=" * 60)
    print("Cafe Management System - Python Backend")
    print("Student: Dev Jain | Roll: 44 | Section: A4 | Batch: B3")
    print("Server running at: http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
