import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, RefreshCw, FileText, ShoppingCart, User as UserIcon, Calendar, Activity, CheckCircle, Clock, Search, Filter, ChevronRight, Building2, Trash2, RotateCcw, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import { API } from '../config';
import axios from 'axios';
import OrderDetailModal from './OrderDetailModal';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'bin'
  const [binOrders, setBinOrders] = useState([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(null); // stores orderId to delete permanently
  
  const { user } = useAuth();
  const { canEdit } = usePermissions();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/orders/all`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setOrders(response.data || []);
    } catch (err) {
      console.error("❌ Order Fetch Error:", err);
      toast.error(err.response?.data?.detail || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBinOrders = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/orders/bin`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      setBinOrders(response.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch recycle bin");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if(user?.token) {
        if (viewMode === 'active') fetchOrders();
        else fetchBinOrders();
    }
  }, [user, viewMode]);

  const handleSoftDelete = async (e, orderId) => {
    e.stopPropagation();
    if (!window.confirm("Move this order to Recycle Bin?")) return;
    
    try {
      await axios.delete(`${API}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      toast.success("Order moved to Recycle Bin");
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete order");
    }
  };

  const handleRecover = async (e, orderId) => {
    e.stopPropagation();
    try {
      await axios.post(`${API}/orders/${orderId}/recover`, {}, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      toast.success("Order recovered successfully");
      fetchBinOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Recovery failed");
    }
  };

  const handlePermanentDelete = async () => {
    if (!isConfirmingDelete) return;
    try {
      await axios.delete(`${API}/orders/${isConfirmingDelete}/permanent`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      toast.success("Order permanently removed");
      setIsConfirmingDelete(null);
      fetchBinOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Permanent deletion failed");
    }
  };


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
    <div className="animate-in fade-in duration-500 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shadow-inner">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Order Management</h1>
            <p className="text-[10px] font-medium text-slate-500">Track and manage Lead-to-Cash pipelines</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => setViewMode('active')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${viewMode === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active Pipeline
            </button>
            <button 
              onClick={() => setViewMode('bin')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${viewMode === 'bin' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Trash2 size={12} /> Recycle Bin
            </button>
          </div>
          <Button onClick={viewMode === 'active' ? fetchOrders : fetchBinOrders} variant="outline" className="gap-1.5 w-full md:w-auto h-8 font-bold text-xs border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 rounded-lg">
            <RefreshCw size={14} className={isLoading ? "animate-spin text-indigo-500" : "text-slate-400"} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer Name..." 
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400" />
          <select 
            className="w-full sm:w-48 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none h-8"
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-slate-400 text-[10px] font-bold tracking-widest uppercase h-8">
                <th className="px-3 py-1">Order Ref</th>
                <th className="px-3 py-1">Order Type</th>
                <th className="px-3 py-1">Customer Info</th>
                <th className="px-3 py-1 text-right">Value Configured</th>
                <th className="px-3 py-1 text-center">Status</th>
                <th className="px-3 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viewMode === 'active' ? (
                filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 font-medium text-xs">
                      <Box size={32} className="mx-auto mb-2 opacity-20" />
                      No orders found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer h-10"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <FileText size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800">ORD-{order.id.toString().padStart(4, '0')}</p>
                            <p className="flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase text-slate-400 mt-0.5">
                              <Calendar size={8}/> 
                              {new Date(order.created_at).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className={`font-bold border px-1.5 py-0 h-4 text-[9px] ${order.order_type === 'Bulk Order' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}`}>
                          {order.order_type}
                        </Badge>
                      </td>
                      
                      <td className="px-3 py-1.5">
                        <div className="flex items-start gap-2">
                          <div className="bg-slate-100 p-1.5 rounded-md text-slate-400 shrink-0">
                             <Building2 size={12}/>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-700">{order.customer?.full_name || order.customer?.username || 'Unknown'}</span>
                            {order.customer?.gstin ? (
                              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">GST: {order.customer.gstin}</span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">{order.customer?.email}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-1.5 text-right">
                        <span className="font-bold text-sm text-slate-800 tracking-tight">
                          ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{order.item_count} Items Bound</p>
                      </td>

                      <td className="px-3 py-1.5 text-center">
                         {renderStatus(order)}
                      </td>

                      <td className="px-3 py-1.5 text-right">
                         <div className="flex items-center justify-end gap-1.5">
                           {renderActionButton(order)}
                           <button 
                             onClick={(e) => handleSoftDelete(e, order.id)}
                             className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                             title="Move to Bin"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                binOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 font-medium text-xs">
                      <Trash2 size={32} className="mx-auto mb-2 opacity-20" />
                      Recycle Bin is empty.
                    </td>
                  </tr>
                ) : (
                  binOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors h-10">
                      <td className="px-3 py-1.5 font-bold text-xs text-slate-800">ORD-{order.id.toString().padStart(4, '0')}</td>
                      <td className="px-3 py-1.5">
                         <Badge className="bg-rose-50 text-rose-700 border-none px-1.5 py-0 h-4 text-[9px]">Deleted</Badge>
                      </td>
                      <td className="px-3 py-1.5">
                         <span className="font-bold text-xs text-slate-700">{order.customer}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-bold text-xs">
                         ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-1.5 text-center text-[10px] text-slate-400 font-bold">
                         Deleted on {new Date(order.deleted_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                           <Button 
                             onClick={(e) => handleRecover(e, order.id)}
                             variant="outline" size="sm" 
                             className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-7 px-2 gap-1 font-bold text-[10px]"
                           >
                             <RotateCcw size={12} /> Restore
                           </Button>
                           <Button 
                             onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(order.id); }}
                             variant="outline" size="sm" 
                             className="border-rose-200 text-rose-700 hover:bg-rose-50 h-7 px-2 gap-1 font-bold text-[10px]"
                           >
                             <XCircle size={12} /> Permanent Delete
                           </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
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

      {/* Permanent Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Double Check Required</h2>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                You are about to permanently delete <span className="font-bold text-slate-800">ORD-{isConfirmingDelete}</span>. This action is irreversible and will purge all associated data.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 rounded-lg font-bold border-slate-200 h-10 text-xs"
                onClick={() => setIsConfirmingDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePermanentDelete}
                className="flex-1 rounded-lg font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md h-10 text-xs"
              >
                Yes, Delete Forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

