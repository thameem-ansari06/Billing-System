from pydantic import BaseModel, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime

# Common Configuration
class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# 1. Customer Model
class ContactPersonBase(ORMBase):
    salutation: str = "Mr."
    first: str
    last: Optional[str] = ""
    email: Optional[str] = ""
    work: Optional[str] = ""
    mobile: Optional[str] = ""

class CustomerCreate(ORMBase):
    customer_type: str = "Individual"
    salutation: str = "Mr."
    first_name: str
    last_name: Optional[str] = ""
    company_name: Optional[str] = ""
    display_name: str
    currency: str = "INR"
    email: EmailStr
    phone_work: Optional[str] = ""
    phone_mobile: Optional[str] = ""

    # Other Details
    gst_treatment: Optional[str] = ""
    place_of_supply: Optional[str] = ""
    pan: Optional[str] = ""
    tax_preference: str = "Taxable"
    payment_terms: str = "Due on Receipt"

    # Billing Address
    billing_attention: Optional[str] = ""
    billing_country: str = "India"
    billing_address_1: Optional[str] = ""
    billing_address_2: Optional[str] = ""
    billing_city: Optional[str] = ""
    billing_state: Optional[str] = ""
    billing_pincode: Optional[str] = ""
    billing_phone: Optional[str] = ""
    billing_fax: Optional[str] = ""

    # Shipping Address
    shipping_attention: Optional[str] = ""
    shipping_country: str = "India"
    shipping_address_1: Optional[str] = ""
    shipping_address_2: Optional[str] = ""
    shipping_city: Optional[str] = ""
    shipping_state: Optional[str] = ""
    shipping_pincode: Optional[str] = ""
    shipping_phone: Optional[str] = ""
    shipping_fax: Optional[str] = ""
    
    contact_persons: List[ContactPersonBase] = []

class CustomerRead(CustomerCreate):
    id: int
    customer_id: str
    created_at: datetime

# 2. Product Model
class ProductModel(ORMBase):
    name: str
    price: float

class ProductRead(ProductModel):
    id: int
    product_id: str

# 3. Invoice Models
class InvoiceItemBase(ORMBase):
    item_details: str
    quantity: float
    rate: float
    discount_amount: float
    discount_type: str # 'percentage' or 'amount'
    tax_type: str # 'GST12' or 'GST18'
    amount: float

class InvoiceCreate(ORMBase):
    customer_name: str
    place_of_supply: str
    invoice_number: str
    reference_number: str
    invoice_date: str
    due_date: str
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    grand_total: float
    amount_paid: float = 0.0
    email: Optional[str] = ""
    status: str = "Draft"
    shipping_charges: float = 0.0
    adjustment: float = 0.0
    round_off: float = 0.0
    customer_notes: Optional[str] = ""
    terms_conditions: Optional[str] = ""
    salesperson: Optional[str] = ""
    tds_amount: float = 0.0
    related_challan_id: Optional[int] = None
    items: List[InvoiceItemBase]

class InvoiceRead(InvoiceCreate):
    id: int
    created_at: datetime
    items: List[InvoiceItemBase]

# 4. Quote Models
class QuoteItemBase(ORMBase):
    item_details: str
    quantity: float
    rate: float
    discount_amount: float
    discount_type: str 
    tax_type: str 
    amount: float

class QuoteCreate(ORMBase):
    customer_name: str
    place_of_supply: str
    quote_number: str
    reference_number: str
    quote_date: str
    expiry_date: str
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    grand_total: float
    status: str = "Draft"
    items: List[QuoteItemBase]

class QuoteRead(QuoteCreate):
    id: int
    created_at: datetime
    items: List[QuoteItemBase]

# 5. Delivery Challan Models
class ChallanItemBase(ORMBase):
    item_details: str
    quantity: float
    rate: float
    tax_type: str
    amount: float

class DeliveryChallanCreate(ORMBase):
    customer_name: str
    shipping_address: str
    place_of_supply: str
    challan_type: str
    challan_number: str
    reference_number: str
    challan_date: str
    notes: str
    terms: str
    subtotal: float
    adjustment: float
    grand_total: float
    status: str = "Draft"
    related_invoice_id: Optional[int] = None
    # Logistics Details
    vehicle_number: Optional[str] = ""
    driver_name: Optional[str] = ""
    driver_mobile: Optional[str] = ""
    transporter_name: Optional[str] = ""
    waybill_number: Optional[str] = ""
    dispatch_datetime: Optional[datetime] = None
    items: List[ChallanItemBase]

class DeliveryChallanRead(DeliveryChallanCreate):
    id: int
    created_at: datetime
    items: List[ChallanItemBase]