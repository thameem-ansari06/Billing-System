from pydantic import BaseModel
from typing import List, Optional

# 1. Customer Model
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class ContactPerson(BaseModel):
    salutation: str = "Mr."
    first: str
    last: Optional[str] = ""
    email: Optional[str] = ""
    work: Optional[str] = ""
    mobile: Optional[str] = ""

class CustomerCreate(BaseModel):
    # Screenshot 1: Primary Info
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

    # Screenshot 2: Other Details
    gst_treatment: Optional[str] = ""
    place_of_supply: Optional[str] = ""
    pan: Optional[str] = ""
    tax_preference: str = "Taxable"
    payment_terms: str = "Due on Receipt"

    # Screenshot 3: Billing Address
    billing_attention: Optional[str] = ""
    billing_country: str = "India"
    billing_address_1: Optional[str] = ""
    billing_address_2: Optional[str] = ""
    billing_city: Optional[str] = ""
    billing_state: Optional[str] = ""
    billing_pincode: Optional[str] = ""
    billing_phone: Optional[str] = ""
    billing_fax: Optional[str] = ""

    # Screenshot 3: Shipping Address
    shipping_attention: Optional[str] = ""
    shipping_country: str = "India"
    shipping_address_1: Optional[str] = ""
    shipping_address_2: Optional[str] = ""
    shipping_city: Optional[str] = ""
    shipping_state: Optional[str] = ""
    shipping_pincode: Optional[str] = ""
    shipping_phone: Optional[str] = ""
    shipping_fax: Optional[str] = ""
# 2. Product Model
class ProductModel(BaseModel):
    name: str
    price: float

# 3. Invoice Items & Request
class InvoiceItem(BaseModel):
    item_name: str
    price: float

class InvoiceRequest(BaseModel):
    email: str
    items: List[InvoiceItem]
    discount_percent: float = 0.0

# 4. Quote Items & Request
class QuoteItemCreate(BaseModel):
    item_details: str
    quantity: float
    rate: float
    discount_amount: float
    discount_type: str # 'percentage' or 'amount'
    tax_type: str # 'GST12' or 'GST18'
    amount: float

class QuoteCreate(BaseModel):
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
    items: List[QuoteItemCreate]

# 5. Delivery Challan Request
class ChallanItemCreate(BaseModel):
    item_details: str
    quantity: float
    rate: float
    tax_type: str
    amount: float

class DeliveryChallanCreate(BaseModel):
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
    items: List[ChallanItemCreate]