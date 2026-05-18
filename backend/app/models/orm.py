from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.database.db import Base
import enum

from .enums import UserRole, OrderStatus, DeliveryStatus, PaymentMethod, PaymentStatus

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address_line = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    
    # New Fields for Conditional Signup
    account_type = Column(String, nullable=True) # individual or enterprise
    company_name = Column(String, nullable=True)
    gst_no = Column(String, nullable=True)
    pan_no = Column(String, nullable=True)
    business_address = Column(String, nullable=True)
    document_url = Column(String, nullable=True)
    wallet_balance = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    payments = relationship("Payment", back_populates="customer")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(OrderStatus), default=OrderStatus.Placed)
    total_amount = Column(Float, default=0.0)
    origin = Column(String, default="standard") # Added for tracking Bulk (quote_derived) vs Standard orders
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="order")
    quotes = relationship("Quote", back_populates="order")
    challans = relationship("DeliveryChallan", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    price_at_order = Column(Float, nullable=False)

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, unique=True, index=True, nullable=False)
    customer_type = Column(String, default="Individual")
    salutation = Column(String, default="Mr.")
    first_name = Column(String, nullable=False)
    last_name = Column(String)
    company_name = Column(String)
    display_name = Column(String, nullable=False)
    currency = Column(String, default="INR")
    email = Column(String, index=True)
    phone_work = Column(String)
    phone_mobile = Column(String)
    
    # Extra Details
    gst_treatment = Column(String)
    place_of_supply = Column(String)
    pan = Column(String)
    tax_preference = Column(String, default="Taxable")
    payment_terms = Column(String)
    
    # Billing Address
    billing_attention = Column(String)
    billing_country = Column(String, default="India")
    billing_address_1 = Column(String)
    billing_address_2 = Column(String)
    billing_city = Column(String)
    billing_state = Column(String)
    billing_pincode = Column(String)
    billing_phone = Column(String)
    billing_fax = Column(String)
    
    # Shipping Address
    shipping_attention = Column(String)
    shipping_country = Column(String, default="India")
    shipping_address_1 = Column(String)
    shipping_address_2 = Column(String)
    shipping_city = Column(String)
    shipping_state = Column(String)
    shipping_pincode = Column(String)
    shipping_phone = Column(String)
    shipping_fax = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    contact_persons = relationship("ContactPerson", back_populates="customer", cascade="all, delete-orphan")

class ContactPerson(Base):
    __tablename__ = "contact_persons"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    salutation = Column(String, default="Mr.")
    first = Column(String, nullable=False)
    last = Column(String)
    email = Column(String)
    work = Column(String)
    mobile = Column(String)

    customer = relationship("Customer", back_populates="contact_persons")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True) # Primary image
    image_urls = Column(JSONB, default=[]) # All images list
    gst_percentage = Column(Float, default=18.0)
    stock_quantity = Column(Integer, default=0)
    hsn_code = Column(String, nullable=True)
    category = Column(String, nullable=True)
    type = Column(String, default="Goods")
    unit = Column(String, default="pcs")
    tax_preference = Column(String, default="Taxable")
    is_deleted = Column(Boolean, default=False)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True)
    customer_name = Column(String)
    place_of_supply = Column(String)
    reference_number = Column(String)
    invoice_date = Column(String)
    due_date = Column(String)
    subtotal = Column(Float)
    cgst = Column(Float)
    sgst = Column(Float)
    igst = Column(Float)
    grand_total = Column(Float)
    
    # B2B Enterprise Fields
    customer_company_name = Column(String, nullable=True)
    customer_gst_no = Column(String, nullable=True)

    amount_paid = Column(Float, default=0.0)
    settled_amount = Column(Float, default=0.0)
    payment_status = Column(String, default="Unpaid") # Added for Partial Payment (Unpaid, Partially Paid, Paid)
    email = Column(String)
    status = Column(String, default="Draft")
    shipping_charges = Column(Float, default=0.0)
    adjustment = Column(Float, default=0.0)
    round_off = Column(Float, default=0.0)
    customer_notes = Column(Text)
    terms_conditions = Column(Text)
    salesperson = Column(String)
    tds_amount = Column(Float, default=0.0)
    rejection_reason = Column(Text, nullable=True) # Added for workflow
    challan_url = Column(String, nullable=True) # Added for customer access
    related_challan_id = Column(Integer, ForeignKey("delivery_challans.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="invoices")
    user = relationship("User")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    delivery_tasks = relationship("DeliveryTask", back_populates="invoice")

class Advance(Base):
    __tablename__ = "advances"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    payment_mode = Column(String, default="Cash")
    date = Column(String, nullable=True) # Explicit date for accounting
    is_adjusted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("User")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    item_details = Column(String)
    quantity = Column(Float)
    rate = Column(Float)
    discount_amount = Column(Float)
    discount_type = Column(String)
    tax_type = Column(String)
    amount = Column(Float)

    invoice = relationship("Invoice", back_populates="items")

class DeliveryBatch(Base):
    __tablename__ = "delivery_batches"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"))
    batch_otp = Column(String(6), nullable=False)
    status = Column(String, default="PENDING") # PENDING, PICKED_UP
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    driver = relationship("User")
    tasks = relationship("DeliveryTask", back_populates="batch")

class DeliveryTask(Base):
    __tablename__ = "delivery_tasks"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String)
    customer_address = Column(String)
    contact_number = Column(String)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.ASSIGNED)
    pickup_otp = Column(String(6), nullable=True)
    delivery_otp = Column(String(6), nullable=True)
    invoice_number = Column(String, nullable=True) # Unified Tracking ID
    order_reference = Column(String, nullable=True) # Human-readable Order Reference
    timestamp_logs = Column(JSONB, nullable=True) # JSONB for efficient PostgreSQL storage
    challan_url = Column(String, nullable=True) 
    signature_url = Column(String, nullable=True)
    delivery_photo_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    batch_id = Column(Integer, ForeignKey("delivery_batches.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    invoice = relationship("Invoice", back_populates="delivery_tasks")
    driver = relationship("User", foreign_keys=[driver_id])
    batch = relationship("DeliveryBatch", back_populates="tasks")

    @property
    def sync_invoice_number(self):
        return self.invoice_number or (self.invoice.invoice_number if self.invoice else None)
    
    @property
    def sync_order_reference(self):
        return self.order_reference or (str(self.invoice.order_id) if self.invoice and self.invoice.order_id else None)

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Added for user sync
    customer_name = Column(String)
    place_of_supply = Column(String)
    reference_number = Column(String)
    quote_date = Column(String)
    expiry_date = Column(String)
    subtotal = Column(Float)
    cgst = Column(Float)
    sgst = Column(Float)
    igst = Column(Float)
    grand_total = Column(Float)
    customer_company_name = Column(String, nullable=True)
    customer_gst_no = Column(String, nullable=True)
    email = Column(String, nullable=True)
    status = Column(String, default="pending_approval") # Updated default
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="quotes")
    user = relationship("User") # Added relationship
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")

class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"))
    item_details = Column(String)
    quantity = Column(Float)
    rate = Column(Float)
    discount_amount = Column(Float)
    discount_type = Column(String)
    tax_type = Column(String)
    amount = Column(Float)

    quote = relationship("Quote", back_populates="items")

class DeliveryChallan(Base):
    __tablename__ = "delivery_challans"

    id = Column(Integer, primary_key=True, index=True)
    challan_number = Column(String, unique=True, index=True)
    customer_name = Column(String)
    shipping_address = Column(String)
    place_of_supply = Column(String)
    challan_type = Column(String)
    reference_number = Column(String)
    challan_date = Column(String)
    notes = Column(Text)
    terms = Column(Text)
    subtotal = Column(Float)
    adjustment = Column(Float)
    grand_total = Column(Float)
    status = Column(String, default="Draft")
    related_invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    # Logistics Details
    vehicle_number = Column(String)
    driver_name = Column(String)
    driver_mobile = Column(String)
    transporter_name = Column(String)
    waybill_number = Column(String)
    dispatch_datetime = Column(DateTime, server_default=func.now())
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="challans")
    items = relationship("ChallanItem", back_populates="challan", cascade="all, delete-orphan")


class ChallanItem(Base):
    __tablename__ = "challan_items"

    id = Column(Integer, primary_key=True, index=True)
    challan_id = Column(Integer, ForeignKey("delivery_challans.id"))
    item_details = Column(String)
    quantity = Column(Float)
    rate = Column(Float)
    tax_type = Column(String)
    amount = Column(Float)

    challan = relationship("DeliveryChallan", back_populates="items")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False) # e.g. "Customer Accepted Invoice #INV-101"
    category = Column(String, nullable=True) # e.g. "Logistics", "Finance", "Inventory"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    razorpay_order_id = Column(String, index=True, nullable=True) # Now optional
    razorpay_payment_id = Column(String, index=True, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    
    amount = Column(Float, nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice_number = Column(String, ForeignKey("invoices.invoice_number"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.UPI)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.SUCCESS)
    transaction_id = Column(String, nullable=True)
    is_overpayment = Column(Boolean, default=False)
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    customer = relationship("User", back_populates="payments")
