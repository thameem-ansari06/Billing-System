# Mermaid Diagrams Code
Below is the standalone Mermaid code for both the Frontend and Backend architecture diagrams.
---
## 1. Frontend Architecture Diagram Code (Left-to-Right)
```mermaid
flowchart LR
    %% Styles and Node Shapes
    classDef context fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef guard fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef layout fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px,color:#6b21a8;
    classDef admin fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#047857;
    classDef driver fill:#fff7ed,stroke:#ea580c,stroke-width:2px,color:#c2410c;
    classDef customer fill:#fff1f2,stroke:#e11d48,stroke-width:2px,color:#be123c;
    subgraph ContextProviders["Context & State Providers (Global Layer)"]
        AC["AuthContext.jsx<br>(Persists JWT & websocket connection)"]:::context
        CC["CartContext.jsx<br>(B2C shopping cart local storage)"]:::context
    end
    subgraph RoutingGuard["Routing & Guardrails (Security Layer)"]
        Router["Router App.jsx<br>(Vite Entrypoint)"]:::guard
        PR["ProtectedRoute.jsx<br>(AllowedRoles RBAC validator)"]:::guard
        HR["HomeRedirect.jsx<br>(Dynamic landing page redirects)"]:::guard
    end
    subgraph MainLayout["Navigation & Global Elements (Layout Layer)"]
        Sidebar["Sidebar.jsx<br>(Collapsible logo-clicked sidebar)"]:::layout
        Header["TopHeader.jsx<br>(User profile details & mobile menu)"]:::layout
        Chatbot["AdminChatbot.jsx<br>(Admin-only AI NIM agent)"]:::layout
    end
    subgraph AdminViews["Admin / Operations Portal"]
        Dashboard["DashboardTab.jsx<br>(Analytical KPIs & charts)"]:::admin
        Inventory["InventoryTab.jsx<br>(Product CRUD & stock tracking)"]:::admin
        Staff["StaffManagement.jsx<br>(Staff accounts creation)"]:::admin
        Logistics["ZoneLogisticsDashboard.jsx<br>(Regional cluster pooling)"]:::admin
        DelTasks["DeliveryTasks.jsx<br>(Bulk dispatcher console)"]:::admin
    end
    subgraph DriverViews["Driver Portal"]
        DrDash["DriverDashboard.jsx<br>(Driver assigned load)"]:::driver
        DrDetail["DriverTaskDetail.jsx<br>(Steppers, signature pad, camera proof)"]:::driver
    end
    subgraph CustomerViews["Customer Portal & Public Views"]
        Catalog["ProductCatalog.jsx<br>(Interactive order cart)"]:::customer
        CustInv["CustomerInvoices.jsx<br>(PDF viewer & billing tracking)"]:::customer
        CustQuotes["CustomerQuotes.jsx<br>(Price approvals)"]:::customer
        PublicTrack["CustomerTracking.jsx<br>(Public load tracking)"]:::customer
    end
    %% Flow Connectors
    AC --> Router
    CC --> Router
    Router --> PR
    PR --> HR
    HR -- "Role: admin / ceo / sales" --> MainLayout
    HR -- "Role: delivery" --> DrDash
    HR -- "Role: delivery_management" --> DelTasks
    HR -- "Role: customer" --> Catalog
    MainLayout --> AdminViews
    DrDash --> DrDetail
    Catalog --> CustInv
    Catalog --> CustQuotes
    
    %% Direct Tracking Access (Public Route bypasses login)
    Router --> PublicTrack
```
---
## 2. Backend Architecture Diagram Code (Left-to-Right)
```mermaid
flowchart LR
    %% Styles and Node Shapes
    classDef gateway fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#15803d;
    classDef auth fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b;
    classDef router fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e40af;
    classDef database fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;
    classDef external fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#92400e;
    subgraph GatewayLayer["API Gateway & Application Root"]
        Main["main.py<br>(FastAPI App Entry)"]:::gateway
        CORS["CORS Middleware<br>(Headers validation)"]:::gateway
    end
    subgraph SecurityLayer["Authentication & Security Gateway"]
        AuthUtil["auth.py<br>(JWT encoder/decoder & CryptContext)"]:::auth
        RC["RoleChecker()<br>(FastAPI RBAC Depend blocks)"]:::auth
    end
    subgraph ServiceRouters["FastAPI Routers (Service Layer)"]
        RAuth["auth.py<br>(/auth login, signup)"]:::router
        RAdmin["admin.py<br>(/admin dashboards & resets)"]:::router
        RDelivery["delivery.py<br>(/delivery-tasks OTP verification)"]:::router
        RLogistics["logistics.py<br>(/logistics regional pooling & balancing)"]:::router
        RPayments["payments.py<br>(/payments partial invoice adjustments)"]:::router
        RQuotes["quotes.py<br>(/quotes draft PDF generation)"]:::router
    end
    subgraph DataAccessLayer["Data Access & Persistence (Storage Layer)"]
        DBPy["db.py<br>(SessionLocal & ID generator)"]:::database
        ORMModels["orm.py<br>(Declarative classes & constraints)"]:::database
        Postgres["PostgreSQL DB<br>(Schema, triggers & userrole ENUM)"]:::database
    end
    subgraph IntegrationLayer["Integrations & Outbound Gateways"]
        WS["websocket_manager.py<br>(Broadcast notifications)"]:::external
        Email["email.py<br>(Outbound arrival OTP notices)"]:::external
        Razorpay["razorpay<br>(Secure payment callbacks)"]:::external
    end
    %% Flows
    Main --> CORS
    CORS --> AuthUtil
    AuthUtil --> RC
    
    RC --> RAuth
    RC --> RAdmin
    RC --> RDelivery
    RC --> RLogistics
    RC --> RPayments
    RC --> RQuotes
    RAuth --> DBPy
    RAdmin --> DBPy
    RDelivery --> DBPy
    RLogistics --> DBPy
    RPayments --> DBPy
    RQuotes --> DBPy
    DBPy --> ORMModels
    ORMModels --> Postgres
    RDelivery -- "Broadcast Updates" --> WS
    RDelivery -- "Arrival Alerts" --> Email
    RPayments -- "Process Charge" --> Razorpay
```
