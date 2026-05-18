import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { API } from '../../config';

export default function CustomerInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { user } = useAuth();

  const fetchInvoices = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/invoices/customer/`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      console.log("DEBUG: Customer Invoices Data:", data);
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user?.token]);

  const handleDecision = async (invoiceId, decision) => {
    if (decision === 'REJECTED' && !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    try {
      const res = await fetch(`${API}/invoices/customer/${invoiceId}/decision/?decision=${decision}&reason=${encodeURIComponent(rejectReason)}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success(`Invoice ${decision.toLowerCase()}!`);
        setSelectedInvoice(null);
        setRejectReason('');
        fetchInvoices();
      } else {
        toast.error("Failed to submit decision.");
      }
    } catch (err) {
      toast.error("Error submitting decision.");
    }
  };

  const handleViewDetails = (invoiceNumber) => {
    // Navigate to the new detail view
    const safeName = encodeURIComponent(invoiceNumber);
    window.location.href = `/customer/invoices/${safeName}`;
  };

  const handleViewBill = (invoiceNumber) => {
    const safeName = invoiceNumber.replace(/\//g, '_').replace(/\\/g, '_');
    const baseUrl = API.replace('/api', '');
    window.open(`${baseUrl}/static/invoices/${safeName}.pdf`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent': return <Badge className="bg-blue-100 text-blue-700">Action Required</Badge>;
      case 'accepted': return <Badge className="bg-emerald-100 text-emerald-700">Accepted</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-600">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">My Invoices</h1>
            <p className="text-[10px] font-medium text-slate-500">Review and accept your billing documents</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-500 text-[9px] font-bold uppercase tracking-wider h-8">
                <th className="px-3 py-1">Invoice Number</th>
                <th className="px-3 py-1">Date</th>
                <th className="px-3 py-1 text-center">Status</th>
                <th className="px-3 py-1 text-right">Amount</th>
                <th className="px-3 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-20" />
                    <span className="text-xs">No pending invoices found at the moment.</span>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors h-10">
                    <td className="px-3 py-1.5 font-bold text-xs text-slate-700">{inv.invoice_number}</td>
                    <td className="px-3 py-1.5 text-[10px] text-slate-500 font-medium">{inv.invoice_date}</td>
                    <td className="px-3 py-1.5 text-center text-[10px]">{getStatusBadge(inv.status)}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-sm text-indigo-600">₹{parseFloat(inv.grand_total).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:bg-blue-50 font-bold h-7 px-2 text-[10px]"
                          title="View PDF"
                          onClick={() => handleViewBill(inv.invoice_number)}
                        >
                          <Download size={12} className="mr-1" /> View
                        </Button>
                        {inv.status?.toLowerCase() === 'sent' ? (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 px-2 text-[10px]"
                              onClick={() => handleViewDetails(inv.invoice_number)}
                            >
                              <CheckCircle size={12} className="mr-1" /> View & Pay
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 font-bold h-7 px-2 text-[10px]"
                              onClick={() => setSelectedInvoice(inv)}
                            >

                              <XCircle size={12} className="mr-1" /> Reject
                            </Button>
                          </>
                        ) : (
                          <p className="text-[9px] font-bold text-slate-400">No Actions</p>
                        )}
                        {inv.challan_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold h-7 px-2 text-[10px]"
                            onClick={() => window.open(`${API.replace('/api', '')}${inv.challan_url}`, '_blank')}
                          >
                            <FileText size={12} className="mr-1" /> Challan
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Reject Invoice</h2>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-slate-500">
                Please provide a reason for rejecting invoice <span className="font-bold text-slate-800">{selectedInvoice.invoice_number}</span>.
              </p>
              <textarea 
                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium"
                placeholder="E.g. Incorrect quantity, Price mismatch..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="p-4 bg-slate-50 flex gap-2">
              <Button variant="outline" className="flex-1 font-bold h-8 text-xs rounded-lg" onClick={() => setSelectedInvoice(null)}>Cancel</Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-8 text-xs rounded-lg"
                onClick={() => handleDecision(selectedInvoice.id, 'REJECTED')}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
