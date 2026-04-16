import sqlite3
import os

# 📍 Project path setup
# Intha logic unga DB file 'data' folder-la correct-ah save aaga help pannum
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'data', 'ar_system.db')

def get_db():
    """Database connection generator"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

def setup_db():
    """Initial table creation logic"""
    conn = get_db()
    c = conn.cursor()
    
    # 📝 Customers Table
    c.execute("DROP TABLE IF EXISTS customers")
    c.execute('''CREATE TABLE IF NOT EXISTS customers (
                 customer_id TEXT PRIMARY KEY,
                 customer_type TEXT, salutation TEXT, first_name TEXT, last_name TEXT,
                 company_name TEXT, display_name TEXT, currency TEXT, email TEXT UNIQUE,
                 phone_work TEXT, phone_mobile TEXT, gst_treatment TEXT,
                 place_of_supply TEXT, pan TEXT, tax_preference TEXT, payment_terms TEXT,
                 billing_attention TEXT, billing_country TEXT, billing_address_1 TEXT, billing_address_2 TEXT,
                 billing_city TEXT, billing_state TEXT, billing_pincode TEXT, billing_phone TEXT, billing_fax TEXT,
                 shipping_attention TEXT, shipping_country TEXT, shipping_address_1 TEXT, shipping_address_2 TEXT,
                 shipping_city TEXT, shipping_state TEXT, shipping_pincode TEXT, shipping_phone TEXT, shipping_fax TEXT)''')
    
    # 📝 Invoices Table
    c.execute('''CREATE TABLE IF NOT EXISTS invoices (
                 invoice_id TEXT PRIMARY KEY, email TEXT, subtotal REAL, 
                 discount_pct REAL, cgst REAL, sgst REAL, grand_total REAL, status TEXT)''')
    
    # 📝 Products Table
    c.execute('''CREATE TABLE IF NOT EXISTS products (
                 product_id TEXT PRIMARY KEY, name TEXT UNIQUE, price REAL)''')
                 
    # 📝 Quotes Table
    c.execute('''CREATE TABLE IF NOT EXISTS quotes (
                 quote_id TEXT PRIMARY KEY, 
                 customer_name TEXT, 
                 place_of_supply TEXT, 
                 quote_number TEXT, 
                 reference_number TEXT, 
                 quote_date TEXT, 
                 expiry_date TEXT, 
                 subtotal REAL, 
                 cgst REAL, 
                 sgst REAL, 
                 igst REAL, 
                 grand_total REAL, 
                 status TEXT)''')

    # 📝 Quote Items Table
    c.execute('''CREATE TABLE IF NOT EXISTS quote_items (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 quote_id TEXT, 
                 item_details TEXT, 
                 quantity REAL, 
                 rate REAL, 
                 discount_amount REAL, 
                 discount_type TEXT, 
                 tax_type TEXT, 
                 amount REAL,
                 FOREIGN KEY(quote_id) REFERENCES quotes(quote_id))''')

    # 📝 Delivery Challans Table
    c.execute('''CREATE TABLE IF NOT EXISTS delivery_challans (
                 challan_id TEXT PRIMARY KEY,
                 customer_name TEXT,
                 shipping_address TEXT,
                 place_of_supply TEXT,
                 challan_type TEXT,
                 challan_number TEXT,
                 reference_number TEXT,
                 challan_date TEXT,
                 notes TEXT,
                 terms TEXT,
                 subtotal REAL,
                 adjustment REAL,
                 grand_total REAL,
                 status TEXT)''')
                 
    # 📝 Delivery Challan Items Table
    c.execute('''CREATE TABLE IF NOT EXISTS challan_items (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 challan_id TEXT,
                 item_details TEXT,
                 quantity REAL,
                 rate REAL,
                 tax_type TEXT,
                 amount REAL,
                 FOREIGN KEY(challan_id) REFERENCES delivery_challans(challan_id))''')
    
    conn.commit()
    conn.close()
    print("✅ Database Synchronized!")

def get_next_id(prefix, table, column):
    """Helper to generate IDs like INV-1001"""
    conn = get_db()
    c = conn.cursor()
    c.execute(f"SELECT {column} FROM {table}")
    all_ids = c.fetchall()
    conn.close()
    max_num = 0
    for row in all_ids:
        if row[column]: 
            try:
                num = int(row[column].split('-')[-1])
                if num > max_num: max_num = num
            except ValueError: continue 
    return f"{prefix}-1001" if max_num == 0 else f"{prefix}-{max_num + 1:04d}"