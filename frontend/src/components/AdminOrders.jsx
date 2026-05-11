import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, RefreshCw, FileText, ShoppingCart, User as UserIcon, Calendar, Activity, CheckCircle, Clock, Search, Filter, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { API } from '../config';
import OrderDetailModal from './OrderDetailModal';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  const { user } = useAuth();
  const { canEdit } = usePermissions();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/orders/all`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data || []);
      } else {
        toast.error("Failed to fetch orders.");
      }
    } catch (err) {
      console.error("❌ Order Fetch Error:", err);
      toast.error("Network error");
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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        `ORD-${order.id}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer?.username || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'All' || order.order_type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [orders, searchTerm, filterType]);

  const renderStatus = (order) => {
    const isApproved = order.quotes?.some(q => q.status.toLowerCase() === 'approved');
    const hasPendingInvoice = order.invoices?.some(inv => inv.status === 'PENDING_ADMIN_SEND');
    
    if (hasPendingInvoice) {
      return (
        <Badge className="bg-amber-100 text-amber-700 font-bold border-none gap-1">
          <Activity size={12} className="animate-pulse" /> Pending Invoice Send
        </Badge>
      );
    }

    if (isApproved) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 font-bold border-none gap-1">
          <CheckCircle size={12} /> Approved
        </Badge>
      );
    }

    if (order.status.toLowerCase() === 'quoted') {
      return (
        <Badge className="bg-indigo-100 text-indigo-700 font-bold border-none gap-1">
          <Clock size={12} className="animate-pulse" /> Quote Pending
        </Badge>
      );
    }

    return (
      <Badge className="bg-slate-100 text-slate-700 font-bold border-none gap-1">
         {order.status}
      </Badge>
    );
  };

  const renderActionButton = (order) => {
    if (!canEdit(order.customer?.id || 0)) {
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

    const hasPendingInvoice = order.invoices?.some(inv => inv.status === 'PENDING_ADMIN_SEND');

    if (hasPendingInvoice) {
      return (
        <Button 
          variant="default" 
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 shadow-md font-bold text-xs px-4"
          onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
        >
          Finalize Invoice
        </Button>
      );
    }

    if (order.order_type === 'Standard Order' && !order.invoices?.length) {
       return (
        <Button 
          variant="default" 
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold text-xs px-4"
          onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
        >
          Generate Invoice
        </Button>
       )
    }

    if (order.status.toLowerCase() === 'placed' && order.order_type === 'Bulk Order') {
      return (
        <Button 
          variant="default" 
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 shadow-md font-bold text-xs px-4 transition-all"
          onClick={(e) => { e.stopPropagation(); handleGenerateQuote(order); }}
        >
          Generate GST Quote
        </Button>
      );
    }

    return (
      <Button 
        variant="ghost" 
        size="sm"
        className="text-indigo-600 font-bold text-xs px-4 hover:bg-indigo-50"
        onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
      >
        View Details <ChevronRight size={14} className="ml-1"/>
      </Button>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shadow-inner">
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Order Management</h1>
            <p className="text-sm font-medium text-slate-500">Track and manage Lead-to-Cash pipelines</p>
          </div>
        </div>
        <Button onClick={fetchOrders} variant="outline" className="gap-2 w-full md:w-auto h-11 font-semibold border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 rounded-xl">
          <RefreshCw size={16} className={isLoading ? "animate-spin text-indigo-500" : "text-slate-400"} /> Refresh Pipeline
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer Name..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-slate-400" />
          <select 
            className="w-full sm:w-48 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Order Types</option>
            <option value="Bulk Order">Bulk Orders</option>
            <option value="Standard Order">Standard Orders</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-slate-400 text-xs font-black tracking-widest uppercase">
                <th className="p-5">Order Ref</th>
                <th className="p-5">Order Type</th>
                <th className="p-5">Customer Info</th>
                <th className="p-5 text-right">Value Configured</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-slate-400 font-medium">
                    <Box size={48} className="mx-auto mb-4 opacity-20" />
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="font-black text-slate-800">ORD-{order.id.toString().padStart(4, '0')}</p>
                          <p className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-slate-400 mt-0.5">
                            <Calendar size={10}/> 
                            {new Date(order.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-5">
                      <Badge variant="outline" className={`font-bold border ${order.order_type === 'Bulk Order' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}`}>
                        {order.order_type}
                      </Badge>
                    </td>
                    
                    <td className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 bg-slate-100 p-1.5 rounded-lg text-slate-400 shrink-0">
                           <Building2 size={14}/>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{order.customer?.full_name || order.customer?.username || 'Unknown'}</span>
                          {order.customer?.gstin ? (
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">GST: {order.customer.gstin}</span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{order.customer?.email}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-5 text-right">
                      <span className="font-black text-slate-800 tracking-tight">
                        ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.item_count} Items Bound</p>
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

      {selectedOrderId && (
        <OrderDetailModal 
          orderId={selectedOrderId} 
          user={user}
          onClose={() => setSelectedOrderId(null)} 
          onOrderUpdated={fetchOrders}
        />
      )}
    </div>
  );
}

