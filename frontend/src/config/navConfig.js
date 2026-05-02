import {
  LayoutDashboard,
  Box,
  ShoppingCart,
  Truck,
  Quote,
  FileText,
  RefreshCw,
  CalendarPlus,
  Wallet,
  Calculator,
  FileMinus,
  Landmark,
  BarChart,
  Clock,
  Users,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";

export const navConfig = [
  {
    category: "OPERATIONS",

    items: [
      {
        title: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        allowedRoles: [
          "admin",
          "ceo",
          "sales",
          "accounts",
          "provider",
          "user",
          "customer",
        ],
      },

      {
        title: "Inventory",
        path: "/inventory",
        icon: Box,
        allowedRoles: ["admin", "ceo", "sales"],
      },

      {
        title: "Manage Orders",
        path: "/admin/orders",
        icon: ShoppingCart,
        allowedRoles: ["admin", "ceo", "sales"],
      },

      {
        title: "Delivery Tasks",
        path: "/delivery-tasks",
        icon: Truck,
        allowedRoles: ["admin", "ceo", "sales", "delivery"],
      },
      {
        title: "Driver Dashboard",
        path: "/driver/dashboard",
        icon: Truck,
        allowedRoles: ["delivery", "driver"],
      },
    ],
  },

  {
    category: "CUSTOMER PORTAL",

    items: [
      {
        title: "Product Catalog",
        path: "/customer/catalog",
        icon: ShoppingBag,
        allowedRoles: ["user", "customer", "ceo"],
      },

      {
        title: "My Quotes",
        path: "/customer/quotes",
        icon: FileText,
        allowedRoles: ["user", "customer", "ceo"],
      },

      {
        title: "My Invoices",
        path: "/customer/invoices",
        icon: FileText,
        allowedRoles: ["user", "customer", "ceo"],
      },

      {
        title: "My Orders",
        path: "/customer/orders",
        icon: ShoppingBag,
        allowedRoles: ["user", "customer", "ceo"],
      },
      {
        title: "My Profile",
        path: "/customer/profile",
        icon: User,
        allowedRoles: ["user", "customer", "ceo"],
      },
    ],
  },

  {
    category: "SALES & BILLING",

    items: [
      {
        title: "Quotes",
        path: "/quotes",
        icon: Quote,
        allowedRoles: ["admin", "ceo", "sales"],
      },

      {
        title: "Invoices",
        path: "/invoices",
        icon: FileText,
        allowedRoles: ["admin", "ceo", "sales", "accounts"],
      },

      {
        title: "Recurring Invoices",
        path: "/recurring-invoices",
        icon: RefreshCw,
        allowedRoles: ["admin", "ceo", "sales", "accounts"],
      },

      {
        title: "Advance Billing",
        path: "/advance-billing",
        icon: CalendarPlus,
        allowedRoles: ["admin", "ceo", "sales", "accounts"],
      },
    ],
  },

  {
    category: "FINANCE & COMPLIANCE",

    items: [
      {
        title: "Payments Received",
        path: "/payments-received",
        icon: Wallet,
        allowedRoles: ["admin", "ceo", "accounts"],
      },

      {
        title: "Expenses",
        path: "/expenses",
        icon: Calculator,
        allowedRoles: ["admin", "ceo", "accounts"],
      },

      {
        title: "Credit Notes",
        path: "/credit-notes",
        icon: FileMinus,
        allowedRoles: ["admin", "ceo", "accounts"],
      },

      {
        title: "GST Filing",
        path: "/gst-filling",
        icon: Landmark,
        allowedRoles: ["admin", "ceo", "accounts"],
      },
    ],
  },

  {
    category: "ADMIN & ANALYTICS",

    items: [
      {
        title: "Customers",
        path: "/customers",
        icon: Users,
        allowedRoles: ["admin", "ceo", "sales", "accounts"],
      },

      {
        title: "Super Admin Clients",
        path: "/customers",
        icon: Users,
        allowedRoles: ["provider"],
      },

      {
        title: "Reports",
        path: "/reports",
        icon: BarChart,
        allowedRoles: ["admin", "ceo", "accounts"],
      },

      {
        title: "System Reports",
        path: "/reports",
        icon: BarChart,
        allowedRoles: ["provider"],
      },

      {
        title: "Time Tracking",
        path: "/time-tracking",
        icon: Clock,
        allowedRoles: ["admin", "ceo"],
      },

      {
        title: "System Settings",
        path: "/settings",
        icon: Settings,
        allowedRoles: ["admin", "ceo", "provider"],
      },
    ],
  },
];
