import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Box, FileText, Quote, Truck, Receipt, Wallet, RefreshCw, FileMinus, Calculator, Clock, Landmark, BarChart, CalendarPlus } from 'lucide-react';

export default function Sidebar({ isMobile = false, closeMenu = () => {} }) {
  const linkStyle = ({ isActive }) => 
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
      isActive ? 'bg-primary shadow-md text-primary-foreground' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className={`${isMobile ? 'w-full h-full' : 'hidden md:flex w-64'} bg-slate-950 text-white flex-col z-10 shadow-2xl border-r border-slate-800`}>
      <div className="p-6 text-2xl font-black tracking-tight text-white flex items-center gap-2 border-b border-slate-900">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
          <span className="text-sm font-bold text-white">AR</span>
        </div>
        XBP
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavLink to="/dashboard" onClick={closeMenu} className={linkStyle}><LayoutDashboard size={20} /> Dashboard</NavLink>
        <NavLink to="/customers" onClick={closeMenu} className={linkStyle}><Users size={20} /> Customers</NavLink>
        <NavLink to="/inventory" onClick={closeMenu} className={linkStyle}><Box size={20} /> Inventory</NavLink>
        <NavLink to="/invoices" onClick={closeMenu} className={linkStyle}><FileText size={20} /> Invoices</NavLink>
        <NavLink to="/quotes" onClick={closeMenu} className={linkStyle}><Quote size={20} /> Quotes</NavLink>
        <NavLink to="/delivery-challans" onClick={closeMenu} className={linkStyle}><Truck size={20} /> Delivery Challans</NavLink>
        <NavLink to="/payments-received" onClick={closeMenu} className={linkStyle}><Wallet size={20} /> Payments Received</NavLink>
        <NavLink to="/recurring-invoices" onClick={closeMenu} className={linkStyle}><RefreshCw size={20} /> Recurring Invoice</NavLink>
        <NavLink to="/credit-notes" onClick={closeMenu} className={linkStyle}><FileMinus size={20} /> Credit Notes</NavLink>
        <NavLink to="/expenses" onClick={closeMenu} className={linkStyle}><Calculator size={20} /> Expenses</NavLink>
        <NavLink to="/time-tracking" onClick={closeMenu} className={linkStyle}><Clock size={20} /> Time Tracking</NavLink>
        <NavLink to="/gst-filling" onClick={closeMenu} className={linkStyle}><Landmark size={20} /> GST Filling</NavLink>
        <NavLink to="/reports" onClick={closeMenu} className={linkStyle}><BarChart size={20} /> Reports</NavLink>
        <NavLink to="/advance-billing" onClick={closeMenu} className={linkStyle}><CalendarPlus size={20} /> Advance Billing</NavLink>
      </nav>
    </div>
  );
}