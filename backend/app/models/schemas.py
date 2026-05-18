from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Any, List, Optional, Dict
from datetime import datetime
from .enums import DeliveryStatus, PaymentMethod, PaymentStatus

# Common Configuration
class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# 0. Auth & Users
class UserCreate(ORMBase):
    username: str
    password: str
    role: Optional[str] = "user"
    account_type: Optional[str] = None
    company_name: Optional[str] = None
    gst_no: Optional[str] = None
    pan_no: Optional[str] = None
    business_address: Optional[str] = None
    document_url: Optional[str] = None

class UserRead(ORMBase):
    id: Any
    username: str
    role: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    account_type: Optional[str] = None
    company_name: Optional[str] = None
    gst_no: Optional[str] = None
    pan_no: Optional[str] = None
    business_address: Optional[str] = None
    document_url: Optional[str] = None
    wallet_balance: float = 0.0
    created_at: Optional[datetime] = None

class UserUpdate(ORMBase):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class SignupRequest(ORMBase):
    """Payload for the public POST /auth/signup endpoint."""
    username: str
    password: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    account_type: Optional[str] = "individual"
    company_name: Optional[str] = None
    gst_no: Optional[str] = None
    pan_no: Optional[str] = None
    business_address: Optional[str] = None

class StaffCreate(ORMBase):
    """Admin-only payload for adding internal staff."""
    username: str
    email: EmailStr
    password: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# 2. Product Model
class ProductModel(ORMBase):
    name: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: List[str] = []
    gst_percentage: Optional[float] = 18.0
    stock_quantity: Optional[int] = 0
    hsn_code: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = "Goods"
    unit: Optional[str] = "pcs"
    tax_preference: Optional[str] = "Taxable"

class ProductRead(ProductModel):
    id: int
    product_id: str

class OrderItemCreate(ORMBase):
    product_id: int
    quantity: int

class OrderSubmission(ORMBase):
    items: List[OrderItemCreate]

class OrderItemRead(OrderItemCreate):
    id: int
    price_at_order: float
    product: Optional[ProductRead] = None

class DeliveryTaskRef(ORMBase):
    id: int
    status: str

class OrderCreate(ORMBase):
    user_id: int
    total_amount: float
    status: Optional[str] = "Placed"
    origin: Optional[str] = "standard"

class InvoiceRef(ORMBase):
    """Minimal invoice reference embedded in OrderRead so the customer portal
    can detect whether admin has generated an invoice for the order."""
    id: int
    invoice_number: str
    status: str
    grand_total: Optional[float] = 0.0
    delivery_tasks: List[DeliveryTaskRef] = []

class OrderRead(OrderCreate):
    id: int
    created_at: datetime
    order_items: List[OrderItemRead] = []
    user: Optional[UserRead] = None
    invoices: List[InvoiceRef] = []

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
    customer_name: Optional[str] = None
    place_of_supply: Optional[str] = None
    invoice_number: str
    reference_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: float
    cgst: Optional[float] = 0.0
    sgst: Optional[float] = 0.0
    igst: Optional[float] = 0.0
    grand_total: float
    customer_company_name: Optional[str] = None
    customer_gst_no: Optional[str] = None
    amount_paid: float = 0.0
    settled_amount: float = 0.0
    email: Optional[str] = ""
    status: str = "Draft"
    payment_status: Optional[str] = "Unpaid" # Added for Partial Payment logic
    shipping_charges: float = 0.0
    adjustment: float = 0.0
    round_off: float = 0.0
    customer_notes: Optional[str] = ""
    terms_conditions: Optional[str] = ""
    salesperson: Optional[str] = ""
    tds_amount: float = 0.0
    related_challan_id: Optional[int] = None
    order_id: Optional[int] = None
    user_id: Optional[int] = None
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
    customer_name: Optional[str] = None
    place_of_supply: Optional[str] = None
    quote_number: str
    reference_number: Optional[str] = None
    quote_date: Optional[str] = None
    expiry_date: Optional[str] = None
    subtotal: float
    cgst: Optional[float] = 0.0
    sgst: Optional[float] = 0.0
    igst: Optional[float] = 0.0
    grand_total: float
    customer_company_name: Optional[str] = None
    customer_gst_no: Optional[str] = None
    email: Optional[str] = None
    status: str = "pending_approval"
    order_id: Optional[int] = None
    user_id: Optional[int] = None
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
    customer_name: Optional[str] = None
    shipping_address: Optional[str] = None
    place_of_supply: Optional[str] = None
    challan_type: Optional[str] = None
    challan_number: str
    reference_number: Optional[str] = None
    challan_date: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
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
    order_id: Optional[int] = None
    items: List[ChallanItemBase]

class DeliveryChallanRead(DeliveryChallanCreate):
    id: int
    created_at: datetime
    items: List[ChallanItemBase]

# 6. Delivery Task Models
class DeliveryTaskBase(ORMBase):
    invoice_id: Optional[Any] = None
    driver_id: Optional[Any] = None
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    contact_number: Optional[str] = None
    status: Optional[DeliveryStatus] = DeliveryStatus.ASSIGNED
    timestamp_logs: Optional[Dict[str, Any]] = None
    challan_url: Optional[str] = None
    signature_url: Optional[str] = None
    delivery_photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    invoice_number: Optional[str] = None
    order_reference: Optional[str] = None
    batch_id: Optional[int] = None

class DeliveryTaskRead(DeliveryTaskBase):
    id: Any
    created_at: Optional[datetime] = None
    driver: Optional[UserRead] = None
    batch: Optional['DeliveryBatchRead'] = None

class DeliveryTaskAdminRead(DeliveryTaskRead):
    pickup_otp: Optional[str] = None
    delivery_otp: Optional[str] = None

class DeliveryTaskUpdate(ORMBase):
    status: Optional[str] = None
    driver_id: Optional[int] = None

# 6.1 Delivery Batch Models
class BulkAssignRequest(BaseModel):
    task_ids: List[int]
    driver_id: int

class BatchVerifyRequest(BaseModel):
    batch_id: int
    otp: str

class DeliveryBatchRead(ORMBase):
    id: int
    driver_id: int
    batch_otp: str
    status: str
    created_at: datetime
    tasks: List[DeliveryTaskRead] = []
    driver: Optional[UserRead] = None

# 7. Admin & Dashboard
class DashboardStats(BaseModel):
    total_revenue: float
    pending_invoices_count: int
    active_delivery_tasks_count: int
    low_stock_products_count: int
    monthly_sales: List[Dict[str, Any]] # For charts

class ActivityLogRead(ORMBase):
    id: int
    action: str
    category: Optional[str] = None
    user_id: Optional[int] = None
    created_at: datetime
    user: Optional[UserRead] = None

# 8. Payment & Advance Models
class PaymentBase(ORMBase):
    amount: float
    invoice_number: Optional[str] = None
    payment_method: PaymentMethod
    transaction_id: Optional[str] = None

class PaymentCreate(BaseModel):
    invoice_number: str

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    invoice_number: str
    invoice_id: Optional[int] = None

class PaymentRead(PaymentBase):
    id: int
    status: PaymentStatus
    is_overpayment: bool
    payment_date: datetime
    created_at: datetime
    user: Optional[UserRead] = None
    customer_name: Optional[str] = None

class PaymentStats(BaseModel):
    total_billed: float
    total_received: float
    total_pending: float
    received_today: float
    collection_velocity: float # % paid within 24h
    trend_month_vs_last: float # % change
    method_breakdown: Dict[str, float]

class PaymentResponse(BaseModel):
    message: str
    payment_id: int
    invoice_status: str
    amount_to_invoice: float
    surplus_to_wallet: float
    new_wallet_balance: float
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None

class PaymentRecordRequest(BaseModel):
    invoice_id: int
    amount: float
    payment_method: PaymentMethod
    transaction_id: Optional[str] = None
    date: Optional[str] = None

class AdvanceCreate(ORMBase):
    customer_id: int
    amount: float
    payment_mode: str = "Cash"
    date: Optional[str] = None

class AdvanceRead(AdvanceCreate):
    id: int
    is_adjusted: bool = False
    created_at: datetime

# 9. System Management
class FactoryResetRequest(BaseModel):
    admin_password: str

class SelectiveResetRequest(BaseModel):
    admin_password: str
    inventory: bool = False
    customers: bool = False
    invoices: bool = False
    quotes: bool = False
    payments: bool = False
    activity_logs: bool = False
    delivery_logistics: bool = False
