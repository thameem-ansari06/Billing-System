import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Admin Components
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import DashboardTab from './components/DashboardTab';
import AdminCustomers from './components/AdminCustomers';
import CustomersTab from './components/CustomersTab';
import InventoryTab from './components/InventoryTab';
import InvoicesTab from './components/InvoicesTab';
import CreateInvoice from './components/CreateInvoice';
import CreateCustomer from './components/CreateCustomer';
import CreateItem from './components/CreateItem';
import AdminQuotes from './components/AdminQuotes';
import CreateQuote from './components/CreateQuote';
import DeliveryChallansTab from './components/DeliveryChallansTab';
import CreateDeliveryChallan from './components/CreateDeliveryChallan';
import PaymentsReceivedTab from './components/PaymentsReceivedTab';
import AdvanceBillingTab from './components/AdvanceBillingTab'; // Add this import
import AdminOrders from './components/AdminOrders';
import StaffManagement from './components/StaffManagement';
import Login from './components/Login';
import Signup from './components/Signup';

// Customer Portal Components
import CustomerDashboard from './components/customer/CustomerDashboard';
import ProductCatalog from './components/customer/ProductCatalog';
import CustomerProfile from './components/customer/CustomerProfile';
import CartDrawer from './components/customer/CartDrawer';
import CustomerOrders from './components/customer/CustomerOrders';
import CustomerQuotes from './components/customer/CustomerQuotes';
import CustomerInvoices from './components/customer/CustomerInvoices';
import CustomerInvoiceView from './components/customer/CustomerInvoiceView';
import DeliveryTasks from './components/DeliveryTasks';
import DriverDashboard from './components/driver/DriverDashboard';
import DriverTaskDetail from './components/driver/DriverTaskDetail';
import CustomerTracking from './components/customer/CustomerTracking';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { navConfig } from './config/navConfig';
import { useLocation } from 'react-router-dom';

// ── Role-aware Route: renders different component per user role ───────────────
const RoleRoute = ({ userEl, adminEl }) => {
  const { user } = useAuth();
  if (user?.role === 'user' || user?.role === 'customer') return userEl;
  return adminEl;
};

// ── Protected Route guard ────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium tracking-wide">
        Initializing secure context…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // RBAC Check against navConfig
  const flattenedConfig = navConfig.flatMap(cat => cat.items).sort((a,b) => b.path.length - a.path.length);
  const matchingRoute = flattenedConfig.find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));

  if (matchingRoute && !matchingRoute.allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h1 className="text-4xl font-black text-red-500 mb-2">403 Access Denied</h1>
        <p className="text-slate-500 mb-6">You don't have permission to access the {matchingRoute.title} module.</p>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '14px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
              },
            }}
          />

          <Routes>
            {/* Public */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Layout */}
            <Route element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50 font-sans relative">
                  <Sidebar />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <TopHeader />
                    <main className="flex-1 overflow-auto p-4 md:p-8 relative">
                      <Outlet />
                    </main>
                  </div>
                  {/* Cart drawer renders on top of everything, only meaningful for 'user' role */}
                  <CartDrawer />
                </div>
              </ProtectedRoute>
            }>
              <Route path="/" element={<Navigate to="/dashboard" />} />

              {/* Role-split routes */}
              <Route path="/dashboard" element={<RoleRoute userEl={<CustomerDashboard />} adminEl={<DashboardTab />} />} />
              <Route path="/inventory"  element={<RoleRoute userEl={<Navigate to="/customer/catalog" />}    adminEl={<InventoryTab />} />} />
              <Route path="/orders"     element={<RoleRoute userEl={<CustomerOrders />}    adminEl={<AdminOrders />} />} />

              {/* Customer-only */}
              <Route path="/customer/catalog"  element={<ProductCatalog />} />
              <Route path="/customer/quotes"   element={<CustomerQuotes />} />
              <Route path="/customer/invoices" element={<CustomerInvoices />} />
              <Route path="/customer/invoices/:id" element={<CustomerInvoiceView />} />
              <Route path="/customer/orders"   element={<CustomerOrders />} />
              <Route path="/customer/profile"  element={<CustomerProfile />} />

              {/* Admin-only */}
              <Route path="/customers"            element={<CustomersTab />} />
              <Route path="/customers/new"        element={<CreateCustomer />} />
              <Route path="/staff"                element={<StaffManagement />} />
              <Route path="/invoices"             element={<InvoicesTab />} />
              <Route path="/invoices/new"         element={<CreateInvoice />} />
              <Route path="/delivery-tasks"       element={<DeliveryTasks />} />
              <Route path="/quotes"               element={<AdminQuotes />} />
              <Route path="/quotes/new"           element={<CreateQuote />} />
              <Route path="/delivery-challans"    element={<DeliveryChallansTab />} />
              <Route path="/delivery-challans/new" element={<CreateDeliveryChallan />} />
              <Route path="/advance-billing" element={<AdvanceBillingTab />} />
              <Route path="/payments-received"    element={<PaymentsReceivedTab />} />
              <Route path="/inventory/new"        element={<CreateItem />} />
              <Route path="/admin/orders"         element={<AdminOrders />} />

              {/* Driver-only */}
              <Route path="/driver/dashboard"     element={<DriverDashboard />} />
              <Route path="/driver/task/:taskId"  element={<DriverTaskDetail />} />

              {/* Public/Customer Tracking */}
              <Route path="/tracking/:taskId"     element={<CustomerTracking />} />
            </Route>
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;