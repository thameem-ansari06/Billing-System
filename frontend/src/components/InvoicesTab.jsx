import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, RefreshCw, Eye, MoreHorizontal, Zap, Plus, Download, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'auto' | 'manual'
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  const fetchInvoices = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/invoices/', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      } else {
        console.error('Invoice fetch failed:', response.status);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchInvoices();
  }, [user?.token]);

  const getStatusBadge = (status) => {
    if (!status) return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold px-3 py-1">Draft</Badge>;
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold px-3 py-1">Paid</Badge>;
      case 'partially paid':
        return <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 font-bold px-3 py-1">Partially Paid</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold px-3 py-1">Sent</Badge>;
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold px-3 py-1">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-200 font-bold px-3 py-1">Rejected</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 border-red-200 font-bold px-3 py-1">Overdue</Badge>;
      case 'pending approval':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-3 py-1">Pending Approval</Badge>;
      case 'draft':
      case 'auto-generated':
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-bold px-3 py-1">{status || 'Draft'}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold px-3 py-1">{status}</Badge>;
    }
  };

  const autoCount   = invoices.filter(inv => inv.is_auto_generated).length;
  const manualCount = invoices.length - autoCount;

  // Live search + filter
  const displayedInvoices = useMemo(() => {
    let list = invoices;

    if (filterMode === 'auto')   list = list.filter(inv => inv.is_auto_generated);
    if (filterMode === 'manual') list = list.filter(inv => !inv.is_auto_generated);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(inv =>
        (inv.invoice_number  || '').toLowerCase().includes(q) ||
        (inv.customer_name   || '').toLowerCase().includes(q) ||
        (inv.reference_number|| '').toLowerCase().includes(q) ||
        (inv.status          || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [invoices, searchQuery, filterMode]);

  const [isDownloading, setIsDownloading] = useState(null); // stores invoiceNumber being downloaded

  const handleDownload = async (e, invoiceNumber) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.token) {
      alert("You must be logged in to download invoices.");
      return;
    }

    setIsDownloading(invoiceNumber);
    try {
      const response = await fetch(`http://localhost:8000/api/invoices/generate/${encodeURIComponent(invoiceNumber)}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.file_url) {
        // Open the physical static file in a new tab
        window.open(`http://localhost:8000${data.file_url}`, '_blank');
      } else {
        throw new Error("No file URL received from server");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Error generating invoice. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };

  const [isSending, setIsSending] = useState(null);

  const handleSend = async (invoiceId) => {
    if (!user?.token) return;
    setIsSending(invoiceId);
    try {
      const response = await fetch(`http://localhost:8000/api/invoices/${invoiceId}/send/`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        toast.success("Invoice sent to customer successfully!");
        fetchInvoices();
      } else {
        toast.error("Failed to send invoice.");
      }
    } catch (err) {
      toast.error("Error sending invoice.");
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shadow-inner">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Global Invoices Dashboard</h1>
            <p className="text-sm font-medium text-slate-500">
              {invoices.length} total &mdash;
              {autoCount > 0 && <span className="ml-1 text-indigo-600 font-semibold">{autoCount} auto-generated from orders</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={fetchInvoices} variant="outline" className="gap-2 h-11 font-bold border-slate-200 text-slate-600">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          {canEdit() && (
            <Button onClick={() => navigate('/invoices/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 shadow-lg shadow-blue-100">
              <Plus size={16} className="mr-1.5" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              className="pl-11 h-11 border-slate-200 rounded-xl"
              placeholder="Search by number, customer, status..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick-filter tabs — mirrors Quotes exactly */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-sm font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${filterMode === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All ({invoices.length})
            </button>
            <button
              onClick={() => setFilterMode('auto')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${filterMode === 'auto' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Zap size={13} /> Auto ({autoCount})
            </button>
            <button
              onClick={() => setFilterMode('manual')}
              className={`px-3 py-1.5 rounded-md transition-all ${filterMode === 'manual' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Manual ({manualCount})
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="p-8 text-center text-slate-400 animate-pulse">
            <RefreshCw size={32} className="mx-auto mb-2 opacity-30 animate-spin" />
            <p className="text-sm">Loading invoices…</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5">Reference</th>
                  <th className="p-5">Customer Identity</th>
                  <th className="p-5">Issue Date</th>
                  <th className="p-5 text-center">Current Status</th>
                  <th className="p-5 text-right">Grand Total</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-20 text-center text-slate-400">
                      <FileText size={56} className="mx-auto mb-4 opacity-10" />
                      <p className="font-bold text-slate-600">No invoices found</p>
                      <p className="text-sm mt-1">
                        {searchQuery
                          ? `No results for "${searchQuery}"`
                          : 'Create a new invoice or place a small order from the Customer Portal.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50/50 transition-colors group ${inv.is_auto_generated ? 'border-l-2 border-l-indigo-400' : ''}`}
                    >
                      {/* Reference cell */}
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full shadow-sm ${
                              inv.status?.toLowerCase() === 'draft'
                                ? 'bg-slate-300 shadow-slate-200'
                                : inv.status?.toLowerCase() === 'sent'
                                ? 'bg-blue-400 shadow-blue-300'
                                : inv.status?.toLowerCase() === 'paid'
                                ? 'bg-emerald-400 shadow-emerald-300'
                                : inv.status?.toLowerCase() === 'overdue'
                                ? 'bg-red-400 shadow-red-300'
                                : 'bg-indigo-500 shadow-indigo-200'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-800 leading-none">{inv.invoice_number}</p>
                              {inv.is_auto_generated && (
                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0 font-bold hover:bg-indigo-100">
                                  <Zap size={9} className="mr-0.5" /> Auto
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                              Ref: {inv.reference_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-5">
                        <p className="font-bold text-slate-700">{inv.customer_name || '—'}</p>
                      </td>

                      {/* Date */}
                      <td className="p-5 text-sm font-medium text-slate-500">{inv.invoice_date || '—'}</td>

                      {/* Status */}
                      <td className="p-5 text-center">{getStatusBadge(inv.status)}</td>

                      {/* Amount */}
                      <td className="p-5 text-right">
                        <p className="font-black text-blue-600 tracking-tight">
                          ₹{parseFloat(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </td>

                      {/* Actions — same sizing/spacing as Quotes */}
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(inv.status === 'Draft' || inv.status === 'Auto-Generated' || !inv.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSending === inv.id}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Send to Customer"
                              onClick={() => handleSend(inv.id)}
                            >
                              {isSending === inv.id ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Send size={16} />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isDownloading === inv.invoice_number}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Download PDF"
                            onClick={(e) => handleDownload(e, inv.invoice_number)}
                          >
                            {isDownloading === inv.invoice_number ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            title="More options"
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count — mirrors Quotes */}
        {!isLoading && displayedInvoices.length > 0 && (
          <div className="p-3 border-t border-slate-100 text-xs text-slate-400 text-right pr-5">
            Showing {displayedInvoices.length} of {invoices.length} invoices
          </div>
        )}
      </div>
    </div>
  );
}