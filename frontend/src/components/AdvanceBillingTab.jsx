import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../config';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Wallet, User, IndianRupee, CreditCard, Send, History, CheckCircle, Calendar } from 'lucide-react';
import { Button } from './ui/button';

export default function AdvanceBillingTab() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    amount: '',
    payment_mode: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API}/users/all`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Filter for customers only if needed, or show all
      setCustomers(res.data.filter(u => u.role === 'user' || u.role === 'customer'));
    } catch (err) {
      toast.error("Failed to load customers");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/payments/advance`, formData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Advance payment recorded successfully!");
      setFormData({ 
        customer_id: '', 
        amount: '', 
        payment_mode: 'Cash',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record advance");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Advance Billing</h1>
        <p className="text-sm text-slate-500 font-medium">Record pre-payments from customers to be adjusted against future invoices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} /> Select Customer
                </label>
                <select
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  required
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name || c.username} ({c.email})</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <IndianRupee size={14} /> Advance Amount
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>

              {/* Date selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} /> Payment Date
                </label>
                <input
                  type="date"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={14} /> Payment Mode
                </label>
                <select
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({...formData, payment_mode: e.target.value})}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={18} /> Record Advance Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Wallet size={120} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="p-3 bg-white/20 rounded-2xl w-fit">
                <History size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">How it works?</h3>
                <p className="text-sm font-medium text-indigo-100 mt-2 leading-relaxed">
                  Advance payments are stored in the customer's wallet. When you generate a new invoice for this customer, the system will automatically adjust the balance.
                </p>
              </div>
              <div className="pt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                <CheckCircle size={14} className="text-emerald-300" /> Auto-Adjustment Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
