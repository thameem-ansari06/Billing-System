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
