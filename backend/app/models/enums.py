import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"
    delivery = "delivery"
    provider = "provider"
    ceo = "ceo"
    sales = "sales"
    accounts = "accounts"
    customer = "customer"
    driver = "driver"

class OrderStatus(str, enum.Enum):
    Placed = "placed"
    Quoted = "quoted"
    Approved = "approved"
    Invoiced = "invoiced"
    Dispatched = "dispatched"
    Delivered = "delivered"

class DeliveryStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    PENDING_DELIVERY = "Pending Delivery"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    ARRIVED = "ARRIVED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

class PaymentMethod(str, enum.Enum):
    ONLINE = "ONLINE"
    UPI = "UPI"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    WALLET = "WALLET"

    @classmethod
    def _missing_(cls, value):
        if not value: return cls.ONLINE
        val = str(value).upper().strip()
        # Handle common variations
        if val in ["ONLINE_PAYMENT", "INTERNET", "RAZORPAY", "PAYMENT_SUCCESS"]:
            return cls.ONLINE
        if "ONLINE" in val:
            return cls.ONLINE
        for member in cls:
            if member.value == val:
                return member
        return cls.ONLINE # Safest fallback

class PaymentStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    VOIDED = "VOIDED"
    REFUNDED = "REFUNDED"
