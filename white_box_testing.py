# -*- coding: utf-8 -*-
"""
white_box_testing.py
====================
White-box testing for Cafe Management System
Student: Dev Jain | Roll: 44 | Section: A4 | Batch: B3

Approach:
  The application logic lives in script.js. Python cannot import JS natively,
  so we use TWO strategies:
    1. Pure Python re-implementations of every validation / logic function
       (mirroring the exact same control-flow paths as script.js). This lets
       us test every branch, boundary value, and exception path directly.
    2. We document exactly which JS function each test corresponds to.

Run: python white_box_testing.py
Requires: Python 3.8+ (no third-party packages needed for tests themselves)
For HTML report: pip install pytest  then  pytest white_box_testing.py -v
"""

import sys
import math
import traceback
from typing import Any

# ─────────────────────────────────────────────────────────────────────
#  PYTHON MIRROR OF JS VALIDATION FUNCTIONS (exact same logic)
# ─────────────────────────────────────────────────────────────────────

def validate_item_name(name: Any) -> dict:
    """
    Mirrors JS: validateItemName(name)
    Control-flow paths:
      P1: None / empty / blank → fail
      P2: length < 2           → fail
      P3: length > 150         → fail
      P4: no alphanumeric      → fail
      P5: all conditions pass  → ok
    """
    if name is None or str(name).strip() == '':
        return {'ok': False, 'msg': 'Item name cannot be empty.'}
    t = str(name).strip()
    if len(t) < 2:
        return {'ok': False, 'msg': 'Item name must be at least 2 characters.'}
    if len(t) > 150:
        return {'ok': False, 'msg': 'Item name must not exceed 150 characters.'}
    import re
    if not re.search(r'[a-zA-Z0-9]', t):
        return {'ok': False, 'msg': 'Item name must contain at least one letter or digit.'}
    return {'ok': True, 'msg': ''}


def validate_price(val: Any) -> dict:
    """
    Mirrors JS: validatePrice(val)
    Control-flow paths:
      P1: empty / None         → fail
      P2: non-numeric string   → fail
      P3: value <= 0           → fail
      P4: value > 99999        → fail
      P5: 0 < value <= 99999   → ok
    """
    if val is None or str(val).strip() == '':
        return {'ok': False, 'msg': 'Price cannot be empty.'}
    try:
        n = float(str(val).strip())
    except ValueError:
        return {'ok': False, 'msg': 'Price must be a valid number.'}
    if n <= 0:
        return {'ok': False, 'msg': 'Price must be greater than zero.'}
    if n > 99999:
        return {'ok': False, 'msg': 'Price must not exceed ₹99,999.'}
    return {'ok': True, 'msg': ''}


def validate_category(cat: Any) -> dict:
    """
    Mirrors JS: validateCategory(cat)
    Control-flow paths:
      P1: falsy (empty / None) → fail
      P2: non-empty string     → ok
    """
    if not cat:
        return {'ok': False, 'msg': 'Please select a category.'}
    return {'ok': True, 'msg': ''}


def validate_quantity(qty: Any) -> dict:
    """
    Mirrors JS: validateQuantity(qty)
    Control-flow paths:
      P1: non-integer / NaN    → fail
      P2: < 1                  → fail
      P3: > 99                 → fail
      P4: 1 ≤ qty ≤ 99         → ok
    """
    try:
        n = int(str(qty).strip())
    except (ValueError, TypeError):
        return {'ok': False, 'msg': 'Quantity must be at least 1.'}
    if n < 1:
        return {'ok': False, 'msg': 'Quantity must be at least 1.'}
    if n > 99:
        return {'ok': False, 'msg': 'Quantity cannot exceed 99.'}
    return {'ok': True, 'msg': ''}


def validate_order_not_empty(cart: list) -> dict:
    """
    Mirrors JS: validateOrderNotEmpty(cart)
    Control-flow paths:
      P1: None or empty list   → fail
      P2: list with items      → ok
    """
    if not cart:
        return {'ok': False, 'msg': 'Cannot place an empty order. Add at least one item.'}
    return {'ok': True, 'msg': ''}


# ─────────────────────────────────────────────────────────────────────
#  BUSINESS LOGIC MIRRORS
# ─────────────────────────────────────────────────────────────────────

def cart_total(cart: list) -> float:
    """
    Mirrors JS: cartTotal()
    cart items: {'price': float, 'qty': int}
    """
    return sum(item['price'] * item['qty'] for item in cart)


def order_item_subtotal(price: float, qty: int) -> float:
    """
    Mirrors JS: c.price * c.qty
    Used in renderCart() and confirmOrder()
    """
    return round(price * qty, 2)


def add_to_cart(cart: list, menu_item: dict) -> tuple:
    """
    Mirrors JS: addToCart(itemId)
    Returns (updated_cart, message)
    Control-flow paths:
      P1: item not available   → no-op
      P2: item already in cart → increment qty (max 99)
      P3: qty already 99       → refuse
      P4: new item             → append
    """
    if not menu_item.get('available', False):
        return cart, 'item_unavailable'

    for entry in cart:
        if entry['itemId'] == menu_item['id']:
            if entry['qty'] >= 99:
                return cart, 'max_qty_reached'
            entry['qty'] += 1
            return cart, 'qty_incremented'

    cart.append({
        'itemId': menu_item['id'],
        'name':   menu_item['name'],
        'price':  menu_item['price'],
        'qty':    1
    })
    return cart, 'item_added'


def check_duplicate_name(menu_items: list, name: str, exclude_id=None) -> bool:
    """
    Mirrors JS duplicate check in saveItem()
    Returns True if a duplicate exists.
    """
    return any(
        item['name'].lower() == name.strip().lower() and
        item.get('id') != exclude_id
        for item in menu_items
    )


# ─────────────────────────────────────────────────────────────────────
#  TEST RUNNER
# ─────────────────────────────────────────────────────────────────────

PASS = '✅ PASS'
FAIL = '❌ FAIL'

results = []
test_num = [0]


def run_test(test_id: str, description: str, js_function: str, actual, expected, condition=None):
    """Records and prints one test result."""
    test_num[0] += 1
    if condition is None:
        passed = actual == expected
    else:
        passed = condition(actual)

    status = PASS if passed else FAIL
    results.append({'id': test_id, 'desc': description, 'passed': passed,
                    'actual': actual, 'expected': expected})
    print(f"  {status}  [{test_id}] {description}")
    if not passed:
        print(f"         Expected : {expected}")
        print(f"         Actual   : {actual}")


# ─────────────────────────────────────────────────────────────────────
#  TEST SUITE
# ─────────────────────────────────────────────────────────────────────

def test_validate_item_name():
    print("\n── validate_item_name() ─────────────────────────────────────")

    run_test('WB-01', 'Empty string → fail',              'validateItemName',
             validate_item_name(''),   {'ok': False, 'msg': 'Item name cannot be empty.'})

    run_test('WB-02', 'None → fail',                      'validateItemName',
             validate_item_name(None), {'ok': False, 'msg': 'Item name cannot be empty.'})

    run_test('WB-03', 'Whitespace-only → fail',           'validateItemName',
             validate_item_name('   '), {'ok': False, 'msg': 'Item name cannot be empty.'})

    run_test('WB-04', 'Single char → fail (< 2)',         'validateItemName',
             validate_item_name('A'), {'ok': False, 'msg': 'Item name must be at least 2 characters.'})

    run_test('WB-05', 'Two chars → pass (boundary)',      'validateItemName',
             validate_item_name('AB'), {'ok': True, 'msg': ''})

    run_test('WB-06', '150 chars → pass (boundary)',      'validateItemName',
             validate_item_name('A' * 150), {'ok': True, 'msg': ''})

    run_test('WB-07', '151 chars → fail (boundary)',      'validateItemName',
             validate_item_name('A' * 151), {'ok': False, 'msg': 'Item name must not exceed 150 characters.'})

    run_test('WB-08', 'Special chars only → fail',        'validateItemName',
             validate_item_name('!!!'), {'ok': False, 'msg': 'Item name must contain at least one letter or digit.'})

    run_test('WB-09', 'Valid name → pass',                'validateItemName',
             validate_item_name('Cappuccino'), {'ok': True, 'msg': ''})

    run_test('WB-10', 'Name with special chars + letters → pass', 'validateItemName',
             validate_item_name('Cafe #1 Special!'), {'ok': True, 'msg': ''})


def test_validate_price():
    print("\n── validate_price() ────────────────────────────────────────")

    run_test('WB-11', 'Empty string → fail',              'validatePrice',
             validate_price(''), {'ok': False, 'msg': 'Price cannot be empty.'})

    run_test('WB-12', 'None → fail',                      'validatePrice',
             validate_price(None), {'ok': False, 'msg': 'Price cannot be empty.'})

    run_test('WB-13', 'Non-numeric "abc" → fail',         'validatePrice',
             validate_price('abc'), {'ok': False, 'msg': 'Price must be a valid number.'})

    run_test('WB-14', 'Zero → fail',                      'validatePrice',
             validate_price(0), {'ok': False, 'msg': 'Price must be greater than zero.'})

    run_test('WB-15', 'Negative -1 → fail',               'validatePrice',
             validate_price(-1), {'ok': False, 'msg': 'Price must be greater than zero.'})

    run_test('WB-16', '0.01 → pass (boundary min)',       'validatePrice',
             validate_price(0.01), {'ok': True, 'msg': ''})

    run_test('WB-17', '99999 → pass (boundary max)',      'validatePrice',
             validate_price(99999), {'ok': True, 'msg': ''})

    run_test('WB-18', '99999.01 → fail (over max)',       'validatePrice',
             validate_price(99999.01), {'ok': False, 'msg': 'Price must not exceed ₹99,999.'})

    run_test('WB-19', '120.50 → pass (normal)',           'validatePrice',
             validate_price(120.50), {'ok': True, 'msg': ''})

    run_test('WB-20', '"  150  " (whitespace) → pass',   'validatePrice',
             validate_price('  150  '), {'ok': True, 'msg': ''})


def test_validate_category():
    print("\n── validate_category() ─────────────────────────────────────")

    run_test('WB-21', 'Empty string → fail',  'validateCategory',
             validate_category(''),  {'ok': False, 'msg': 'Please select a category.'})

    run_test('WB-22', 'None → fail',          'validateCategory',
             validate_category(None), {'ok': False, 'msg': 'Please select a category.'})

    run_test('WB-23', '"Coffee" → pass',      'validateCategory',
             validate_category('Coffee'), {'ok': True, 'msg': ''})


def test_validate_quantity():
    print("\n── validate_quantity() ─────────────────────────────────────")

    run_test('WB-24', '"abc" → fail',          'validateQuantity',
             validate_quantity('abc'), {'ok': False, 'msg': 'Quantity must be at least 1.'})

    run_test('WB-25', '0 → fail',              'validateQuantity',
             validate_quantity(0), {'ok': False, 'msg': 'Quantity must be at least 1.'})

    run_test('WB-26', '-1 → fail',             'validateQuantity',
             validate_quantity(-1), {'ok': False, 'msg': 'Quantity must be at least 1.'})

    run_test('WB-27', '1 → pass (boundary)',   'validateQuantity',
             validate_quantity(1), {'ok': True, 'msg': ''})

    run_test('WB-28', '99 → pass (boundary)',  'validateQuantity',
             validate_quantity(99), {'ok': True, 'msg': ''})

    run_test('WB-29', '100 → fail (over max)', 'validateQuantity',
             validate_quantity(100), {'ok': False, 'msg': 'Quantity cannot exceed 99.'})

    run_test('WB-30', '5 → pass (normal)',     'validateQuantity',
             validate_quantity(5), {'ok': True, 'msg': ''})


def test_validate_order_not_empty():
    print("\n── validate_order_not_empty() ──────────────────────────────")

    run_test('WB-31', 'Empty cart → fail',    'validateOrderNotEmpty',
             validate_order_not_empty([]),
             {'ok': False, 'msg': 'Cannot place an empty order. Add at least one item.'})

    run_test('WB-32', 'None → fail',          'validateOrderNotEmpty',
             validate_order_not_empty(None),
             {'ok': False, 'msg': 'Cannot place an empty order. Add at least one item.'})

    run_test('WB-33', '1 item cart → pass',   'validateOrderNotEmpty',
             validate_order_not_empty([{'itemId': 1, 'qty': 1}]),
             {'ok': True, 'msg': ''})


def test_cart_total():
    print("\n── cartTotal() ─────────────────────────────────────────────")

    run_test('WB-34', 'Empty cart total = 0',   'cartTotal',
             cart_total([]), 0)

    run_test('WB-35', 'Single item 80×1 = 80',  'cartTotal',
             cart_total([{'price': 80, 'qty': 1}]), 80)

    run_test('WB-36', 'Multiple items',          'cartTotal',
             cart_total([{'price': 120, 'qty': 2}, {'price': 50, 'qty': 3}]),
             390)

    run_test('WB-37', 'Floating-point prices',   'cartTotal',
             round(cart_total([{'price': 99.99, 'qty': 3}]), 2),
             299.97)


def test_add_to_cart():
    print("\n── addToCart() ─────────────────────────────────────────────")

    item_coffee = {'id': 1, 'name': 'Espresso', 'price': 80, 'available': True}
    item_unavail = {'id': 2, 'name': 'Old Item', 'price': 100, 'available': False}

    # New item
    c, msg = add_to_cart([], item_coffee)
    run_test('WB-38', 'Add new item to empty cart', 'addToCart',
             (len(c), c[0]['qty'], msg), (1, 1, 'item_added'))

    # Increment existing
    c, msg = add_to_cart([{'itemId': 1, 'name': 'Espresso', 'price': 80, 'qty': 2}], item_coffee)
    run_test('WB-39', 'Increment qty for existing item', 'addToCart',
             (c[0]['qty'], msg), (3, 'qty_incremented'))

    # Max qty
    c99 = [{'itemId': 1, 'name': 'Espresso', 'price': 80, 'qty': 99}]
    c, msg = add_to_cart(c99, item_coffee)
    run_test('WB-40', 'Max qty 99 — refuse increment', 'addToCart',
             (c[0]['qty'], msg), (99, 'max_qty_reached'))

    # Unavailable item
    c, msg = add_to_cart([], item_unavail)
    run_test('WB-41', 'Unavailable item not added', 'addToCart',
             (len(c), msg), (0, 'item_unavailable'))


def test_duplicate_check():
    print("\n── Duplicate name check (saveItem) ─────────────────────────")

    menu = [{'id': 1, 'name': 'Cappuccino'}, {'id': 2, 'name': 'Espresso'}]

    run_test('WB-42', 'Same name exact case → duplicate',    'saveItem (duplicate check)',
             check_duplicate_name(menu, 'Cappuccino', exclude_id=None), True)

    run_test('WB-43', 'Same name different case → duplicate', 'saveItem (duplicate check)',
             check_duplicate_name(menu, 'cappuccino', exclude_id=None), True)

    run_test('WB-44', 'Different name → not duplicate',       'saveItem (duplicate check)',
             check_duplicate_name(menu, 'Latte', exclude_id=None), False)

    run_test('WB-45', 'Same name same ID (edit self) → ok',   'saveItem (duplicate check)',
             check_duplicate_name(menu, 'Cappuccino', exclude_id=1), False)


def test_subtotal():
    print("\n── order_item_subtotal() ───────────────────────────────────")

    run_test('WB-46', '120 × 2 = 240',         'confirmOrder (subtotal)',
             order_item_subtotal(120, 2), 240.0)

    run_test('WB-47', '99.99 × 3 = 299.97',    'confirmOrder (subtotal)',
             order_item_subtotal(99.99, 3), 299.97)

    run_test('WB-48', '0.01 × 99 = 0.99',      'confirmOrder (subtotal)',
             order_item_subtotal(0.01, 99), 0.99)

    run_test('WB-49', '100 × 1 = 100.00',      'confirmOrder (subtotal)',
             order_item_subtotal(100, 1), 100.0)


# ─────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("  WHITE-BOX TESTING — Cafe Management System")
    print("  Student: Dev Jain | Roll: 44 | Section: A4 | Batch: B3")
    print("=" * 65)

    test_validate_item_name()
    test_validate_price()
    test_validate_category()
    test_validate_quantity()
    test_validate_order_not_empty()
    test_cart_total()
    test_add_to_cart()
    test_duplicate_check()
    test_subtotal()

    # ── Summary ──────────────────────────────────────────────────
    total  = len(results)
    passed = sum(1 for r in results if r['passed'])
    failed = total - passed

    print("\n" + "=" * 65)
    print("  RESULTS SUMMARY")
    print("=" * 65)
    print(f"  Total Tests : {total}")
    print(f"  Passed      : {passed}  ✅")
    print(f"  Failed      : {failed}  {'❌' if failed else '—'}")
    print(f"  Pass Rate   : {100*passed//total}%")
    print("=" * 65)

    if failed:
        print("\nFailed Tests:")
        for r in results:
            if not r['passed']:
                print(f"  [{r['id']}] {r['desc']}")
                print(f"        Expected: {r['expected']}")
                print(f"        Actual  : {r['actual']}")

    print("\nAll control-flow paths tested:")
    print("  • validateItemName  — 5 paths (empty, <2, >150, no-alphanum, valid)")
    print("  • validatePrice     — 5 paths (empty, non-numeric, ≤0, >99999, valid)")
    print("  • validateCategory  — 2 paths (empty, non-empty)")
    print("  • validateQuantity  — 4 paths (non-int, <1, >99, valid)")
    print("  • validateOrderNotEmpty — 2 paths (empty, non-empty)")
    print("  • cartTotal         — computed reduction path")
    print("  • addToCart         — 4 paths (new, merge, max-qty, unavailable)")
    print("  • duplicate check   — 4 paths (exact, case-insensitive, different, self-edit)")
    print("  • subtotal calc     — multiplication + rounding path")
    print()

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
