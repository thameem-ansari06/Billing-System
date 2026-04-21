from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base

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
    amount_paid = Column(Float, default=0.0)
    email = Column(String)
    status = Column(String, default="Draft")
    shipping_charges = Column(Float, default=0.0)
    adjustment = Column(Float, default=0.0)
    round_off = Column(Float, default=0.0)
    customer_notes = Column(Text)
    terms_conditions = Column(Text)
    salesperson = Column(String)
    tds_amount = Column(Float, default=0.0)
    related_challan_id = Column(Integer, ForeignKey("delivery_challans.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

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

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String, unique=True, index=True)
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
    status = Column(String, default="Draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
