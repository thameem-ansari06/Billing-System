import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import DashboardTab from './components/DashboardTab';
import CustomersTab from './components/CustomersTab';
import InventoryTab from './components/InventoryTab';
import InvoicesTab from './components/InvoicesTab';
import CreateInvoice from './components/CreateInvoice';
import CreateCustomer from './components/CreateCustomer';
import CreateItem from './components/CreateItem'; 

import QuotesTab from './components/QuotesTab';
import CreateQuote from './components/CreateQuote';
import DeliveryChallansTab from './components/DeliveryChallansTab';
import CreateDeliveryChallan from './components/CreateDeliveryChallan';
import PaymentsReceivedTab from './components/PaymentsReceivedTab';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50 font-sans relative">
        {/* Sidebar ippo URL-a kavanikkum */}
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopHeader />
          
          <main className="flex-1 overflow-auto p-4 md:p-8 relative">
            <Routes>
              {/* URL path-kku etha maari component maarum */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<DashboardTab />} />
              <Route path="/customers" element={<CustomersTab />} />
              <Route path="/inventory" element={<InventoryTab />} />
              <Route path="/invoices" element={<InvoicesTab />} />
              <Route path="/invoices/new" element={<CreateInvoice />} />
              <Route path="/quotes" element={<QuotesTab />} />
              <Route path="/quotes/new" element={<CreateQuote />} />
              <Route path="/delivery-challans" element={<DeliveryChallansTab />} />
              <Route path="/delivery-challans/new" element={<CreateDeliveryChallan />} />
              <Route path="/payments-received" element={<PaymentsReceivedTab />} />
              <Route path="/customers/new" element={<CreateCustomer />} />
              <Route path="/inventory/new" element={<CreateItem />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;