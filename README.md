# ☕ Cafe Management System — Web & Python Backend

**Student:** Dev Jain &nbsp;|&nbsp; **Roll Number:** 44 &nbsp;|&nbsp; **Section:** A4 &nbsp;|&nbsp; **Batch:** B3  
**Project:** PBL (Project-Based Learning) Software Engineering Demonstration

---

## 🌟 Overview

A complete, modern, full-stack Cafe Management System featuring:
1. **Python Flask Backend (`app.py`)**: REST API with SQLite database persistence (`cafe.db`).
2. **Dual-Role Frontend (`index.html`, `style.css`, `script.js`)**:
   - **Customer View**: Browse menu, search/filter, add to cart, review cart, place orders, and track live order status.
   - **Admin View**: Real-time operations dashboard, live order status management (Pending → Preparing → Ready → Completed), payment status toggling (Unpaid ↔ Paid), menu management with inline price editing, item addition/deletion, and availability toggles.
3. **Comprehensive Testing Suite**:
   - **White-Box Testing (`white_box_testing.py`)**: 49 tests with 100% path coverage.
   - **Black-Box Testing (`black_box_testing.xlsx`)**: 44 structured test cases with pass/fail logs.
   - **Project Documentation (`Cafe_Management_System_Report.docx`)**: Complete ~10-page formal academic report.

---

## 🚀 How to Run

### Step 1: Start the Python Backend
Ensure Python 3.8+ is installed with Flask:
```bash
python app.py
```
The server will start at **`http://localhost:5000`** with auto-initialized SQLite tables and sample menu items.

### Step 2: Open the Application
Open your browser and navigate to:
```
http://localhost:5000
```
*(Alternatively, you can open `index.html` directly in any web browser — it features automatic fallback to local storage if running without the backend server!)*

---

## 🔑 Dual-Role System Features

### 🧑‍💼 Customer Role
- **Menu Browsing**: Search items by keyword and filter by category (Coffee, Tea, Snacks, Bakery, etc.).
- **Smart Cart**: Adjust item quantities (1–99), remove items, view live subtotal, GST calculation (5%), and grand total.
- **Order Placement**: Order confirmation modal with line-item breakdown and payment method selection.
- **My Orders**: Real-time order status tracking with live visual badges (`Pending`, `Preparing`, `Ready`, `Completed`) and official receipt/bill viewer.

### 🔧 Admin Role
- **Operational Dashboard**: Real-time KPI statistics (Total Menu Items, Total Orders, Live Orders in Progress, Unpaid Bills).
- **Live Orders Manager**: View incoming customer orders in real-time, mark orders as "Done" (`Completed`), and mark payment as `Paid` or `Unpaid`.
- **Menu Management**:
  - Add new menu items with validation.
  - Quick Price Edit modal to instantly adjust item prices.
  - Full edit item details.
  - Delete menu items with confirmation.
  - Toggle item availability (Available / Sold Out).
- **Order History**: Search and filter past and live orders by order status and payment status.

---

## 📁 Repository Structure

```
SE_Project/
├── app.py                             # Python Flask REST API backend
├── cafe.db                            # SQLite database (auto-generated)
├── index.html                         # Dual-role web interface (Customer & Admin)
├── style.css                          # Rich dark-mode coffee theme stylesheet
├── script.js                          # Client logic & REST API integration
├── white_box_testing.py               # 49 white-box test cases (100% pass)
├── black_box_testing.xlsx             # 44 black-box test cases in Excel
├── Cafe_Management_System_Report.docx # Comprehensive 10-page academic report
├── generate_excel.py                  # Script used to generate black_box_testing.xlsx
├── generate_report.py                 # Script used to generate the Word report
└── README.md                          # Project documentation
```

---

## 🧪 Testing Verification

Run the white-box testing suite at any time:
```bash
python white_box_testing.py
```
**Result:** 49/49 Tests Pass (100% Success Rate across all validation and calculation control-flow paths).
