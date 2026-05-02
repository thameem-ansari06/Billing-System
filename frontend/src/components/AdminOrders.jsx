import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, RefreshCw, FileText, ShoppingCart, User as UserIcon, Calendar, Activity, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { canEdit } = usePermissions();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/orders/admin', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data || []);
      } else {
        console.error("Failed to fetch admin orders.");
      }
    } catch (err) {
      console.error("❌ Order Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if(user?.token) {
        fetchOrders(); 
    }
  }, [user]);

  const handleGenerateQuote = (order) => {
    navigate('/quotes/new', { state: { order } });
  };

  const renderStatus = (order) => {
    const isApproved = order.quotes?.some(q => q.status === 'approved');
    
    if (isApproved) {
      return (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle size={14} className="text-emerald-500" />
          <span className="font-bold text-emerald-700 text-sm">Customer Approved</span>
        </div>
      );
    }

    if (order.status === 'Quoted') {
      return (
        <div className="flex items-center justify-center gap-2">
          <Clock size={14} className="text-indigo-500 animate-pulse" />
          <span className="font-bold text-indigo-700 text-sm">Quote Sent</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <Activity size={14} className="text-amber-500 animate-pulse" />
        <span className="font-bold text-amber-700 text-sm">{order.status}</span>
      </div>
    );
  };

  const renderActionButton = (order) => {
    if (!canEdit(order.user_id)) {
      return (
        <Button 
          variant="outline" 
          size="sm"
          className="border-slate-200 text-slate-400 font-bold text-xs px-4 cursor-not-allowed"
          disabled
        >
          View Only
        </Button>
      );
    }

    const isApproved = order.quotes?.some(q => q.status === 'approved');
    const isQuoted = order.status === 'Quoted';

    if (isApproved) {
      return (
        <Button 
          variant="default" 
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 shadow-md font-bold text-xs px-4"
          onClick={() => alert("Redirecting to Final Invoice creation...")}
        >
          Generate Final Invoice
        </Button>
      );
    }

    if (isQuoted) {
      return (
        <Button 
          variant="outline" 
          size="sm"
          className="border-indigo-200 text-indigo-400 font-bold text-xs px-4 cursor-not-allowed"
          disabled
        >
          Awaiting Approval
        </Button>
      );
    }

    return (
      <Button 
        variant="default" 
        size="sm"
        className="bg-slate-900 hover:bg-slate-800 shadow-md font-bold text-xs px-4 transition-all"
        onClick={() => handleGenerateQuote(order)}
      >
        Generate GST Quote
      </Button>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shadow-inner">
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Order Management</h1>
            <p className="text-sm font-medium text-slate-500">Track incoming User Checkout pipelines globally.</p>
          </div>
        </div>
        <Button onClick={fetchOrders} variant="outline" className="gap-2 w-full md:w-auto h-11 font-semibold border-slate-300 text-slate-700 shadow-sm">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh Pipeline
        </Button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-500 text-sm font-bold tracking-wide uppercase">
                <th className="p-5">Order Reference</th>
                <th className="p-5">Client Identity</th>
                <th className="p-5 text-center">Items Bound</th>
                <th className="p-5 text-right">Value Configured</th>
                <th className="p-5 text-center">Checkout Status</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                    <Box size={48} className="mx-auto mb-4 opacity-30" />
                    No orders have been submitted by clients yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">ORD-{order.id.toString().padStart(4, '0')}</p>
                          <p className="flex items-center gap-1 text-xs font-medium text-slate-400 mt-0.5">
                            <Calendar size={12}/> 
                            {new Date(order.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <UserIcon size={16} className="text-indigo-400"/>
                        <span className="font-bold text-slate-700">{order.user?.username || 'Unknown'}</span>
                      </div>
                    </td>

                    <td className="p-5 text-center">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold">
                           {order.order_items?.reduce((acc, item) => acc + item.quantity, 0) || 0} items
                        </Badge>
                    </td>

                    <td className="p-5 text-right">
                      <span className="font-black text-indigo-700 tracking-tight">
                        ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="p-5 text-center">
                       {renderStatus(order)}
                    </td>

                    <td className="p-5 text-right">
                       {renderActionButton(order)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
