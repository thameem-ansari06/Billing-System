import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, Download, MessageSquare, X, ShieldCheck, Tag, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

import { useNavigate } from 'react-router-dom';
import { API } from '../../config';

export default function CustomerQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/quotes/user`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      console.log("Customer Quotes fetched:", response.data);
      setQuotes(response.data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchQuotes();
  }, [user]);

  const handleUpdateStatus = async (quoteId, status) => {
    try {
      let response;
      if (status === 'approved') {
        // Use the dedicated approve endpoint for full automation (creates invoice, sets to Sent, generates PDF)
        response = await axios.put(`${API}/quotes/${quoteId}/approve`, {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } else {
        response = await axios.put(
          `${API}/quotes/${quoteId}/status?status=${status}`,
          {}, 
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      }

      if (status === 'approved') {
        toast.success("Quote Approved! Your invoice has been generated and sent to your portal.", {
          icon: '🚀',
          style: { background: '#10b981', color: '#fff', minWidth: '350px' }
        });
        setTimeout(() => navigate('/customer/invoices'), 1500);
      } else {
        toast.error("Quote Rejected. We will contact you shortly.");
      }
      setIsModalOpen(false);
      fetchQuotes();
    } catch (err) {
      console.error("Update Status Error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else {
        toast.error(err.response?.data?.detail || "Failed to update status.");
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold border-none shadow-sm shadow-emerald-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="font-bold border-none shadow-sm shadow-red-100">Rejected</Badge>;
      case 'ready':
      case 'sent':
        return <Badge className="bg-blue-500 hover:bg-blue-600 font-bold border-none shadow-sm shadow-blue-100">Ready for Review</Badge>;
      case 'expired':
        return <Badge className="bg-slate-500 hover:bg-slate-600 font-bold border-none shadow-sm shadow-slate-100">Expired</Badge>;
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 font-bold border-none shadow-sm shadow-amber-100 animate-pulse">Pending Review</Badge>;
    }
  };

  const openDetails = (quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Proforma Invoices & Quotes</h1>
        <p className="text-[10px] text-slate-500 font-bold tracking-wide">Review official price proposals and confirm your order placement.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {quotes.length === 0 && !isLoading ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <FileText size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="font-bold text-slate-600 text-sm">Your Quote Inbox is Empty</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 max-w-sm mx-auto">Once the admin processes your order and calculates tax, you'll find the detailed breakdown here.</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <div 
              key={quote.id} 
              onClick={() => openDetails(quote)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg transition-transform group-hover:scale-110">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{quote.quote_number}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ref: {quote.reference_number || 'N/A'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{quote.quote_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Items Count</span>
                        <p className="text-xs font-bold text-slate-700">{quote.items?.length || 0} Products</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Grand Total (Incl Tax)</span>
                        <p className="text-sm font-bold text-indigo-600">₹{quote.grand_total?.toLocaleString('en-IN')}</p>
                     </div>
                     <div className="space-y-1 flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Approval Status</span>
                        {getStatusBadge(quote.status)}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 my-auto">
             {/* Modal Header */}
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Tag size={16} />
                   </div>
                   <div>
                      <h2 className="text-sm font-bold text-slate-800 leading-none">{selectedQuote.quote_number}</h2>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Detailed Proposal Breakdown</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                   <X size={16} />
                </button>
             </div>

             {/* Modal Body */}
             <div className="p-4 space-y-4">
                {/* Items Table */}
                <div className="space-y-2">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Info size={12} /> Itemized Summary
                   </h3>
                   <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                      <table className="w-full text-xs text-left">
                         <thead className="bg-slate-100 text-slate-500 font-bold">
                            <tr>
                               <th className="p-3">Item Details</th>
                               <th className="p-3 text-center">Qty</th>
                               <th className="p-3 text-right">Amount</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-200">
                            {selectedQuote.items?.map((item, idx) => (
                               <tr key={idx} className="hover:bg-white/50 transition-colors">
                                  <td className="p-3 font-bold text-slate-700">{item.item_details}</td>
                                  <td className="p-3 text-center font-medium text-slate-500">{item.quantity}</td>
                                  <td className="p-3 text-right font-bold text-slate-800">₹{item.amount?.toLocaleString('en-IN')}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Pricing Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                   <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                         <ShieldCheck size={12} /> Compliance Check
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                         Prices are fixed as per order date. GST components (CGST/SGST/IGST) are calculated based on your place of supply. This is a legally valid proforma invoice.
                      </p>
                   </div>
                   <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                         <span>Subtotal</span>
                         <span>₹{selectedQuote.subtotal?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                         <span>Total GST</span>
                         <span>₹{(selectedQuote.cgst + selectedQuote.sgst + selectedQuote.igst)?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pt-2 border-t border-indigo-200 flex justify-between items-end">
                         <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Grand Total</span>
                         <span className="text-lg font-bold text-indigo-700 leading-none">₹{selectedQuote.grand_total?.toLocaleString('en-IN')}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Modal Footer */}
             <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                {['pending_approval', 'sent', 'ready'].includes(selectedQuote.status?.toLowerCase()) ? (
                  <>
                    <Button 
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'rejected')}
                      variant="outline"
                      className="flex-1 h-10 rounded-lg border-red-200 text-red-500 font-bold hover:bg-red-50 transition-all text-xs"
                    >
                      <XCircle size={14} className="mr-1.5" /> Reject
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'approved')}
                      className="flex-[2] h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all active:scale-95 text-xs"
                    >
                      <CheckCircle size={14} className="mr-1.5" /> Approve & Confirm
                    </Button>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2">
                     {selectedQuote.status?.toLowerCase() === 'approved' ? (
                       <div className="w-full p-2 rounded-lg text-center font-bold text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100">
                          This quote has been approved by you. We are preparing your shipment!
                       </div>
                     ) : (
                       <div className="w-full p-2 rounded-lg text-center font-bold text-[10px] bg-red-50 text-red-600 border border-red-100">
                          This quote was rejected. Please contact support for a revised proposal.
                       </div>
                     )}
                     <Button 
                        onClick={() => setIsModalOpen(false)}
                        className="w-full h-10 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
                     >
                        Close View
                     </Button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
