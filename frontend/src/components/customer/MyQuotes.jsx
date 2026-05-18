import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, Download, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API } from '../../config';
import toast from 'react-hot-toast';

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/quotes/user`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQuotes(data || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchQuotes();
  }, [user]);

  const handleApprove = async (quoteId) => {
    try {
      const response = await fetch(`${API}/quotes/${quoteId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        toast.success("Quote Approved! Your invoice has been generated and sent to your portal.", {
          icon: '🚀',
          style: { background: '#10b981', color: '#fff', minWidth: '350px' }
        });
        setTimeout(() => navigate('/customer/invoices'), 1500);
      } else {
        toast.error("Failed to approve quote.");
      }
    } catch (err) {
      toast.error("Connection error.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 font-bold">Pending Review</Badge>;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Proforma Invoices & Quotes</h1>
        <p className="text-[10px] text-slate-500 font-bold">Review and approve price quotations from the admin.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {quotes.length === 0 && !isLoading ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-600 text-sm">No quotes found</p>
            <p className="text-[10px] text-slate-400 mt-1">When the admin generates a quote for your order, it will appear here.</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <div key={quote.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{quote.quote_number}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reference: {quote.reference_number || 'N/A'}</p>
                    </div>
                    <div className="ml-2">
                       {getStatusBadge(quote.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Issue Date</span>
                        <p className="text-xs font-bold text-slate-700">{quote.quote_date}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Expiry Date</span>
                        <p className="text-xs font-bold text-slate-700">{quote.expiry_date}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Items Count</span>
                        <p className="text-xs font-bold text-slate-700">{quote.items?.length || 0} Lines</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Grand Total</span>
                        <p className="text-sm font-bold text-indigo-600">₹{quote.grand_total?.toLocaleString('en-IN')}</p>
                     </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-2 min-w-[140px]">
                  {quote.status === 'pending_approval' ? (
                    <>
                      <Button 
                        onClick={() => handleApprove(quote.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-lg shadow-sm text-xs"
                      >
                        <CheckCircle size={14} className="mr-1.5" /> Approve & Proceed
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => toast("Feature coming soon: Please contact admin via phone for changes.")}
                        className="border-slate-200 text-slate-600 font-bold h-10 rounded-lg text-xs"
                      >
                        <MessageSquare size={14} className="mr-1.5" /> Request Change
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="secondary" 
                      className="bg-slate-100 text-slate-500 cursor-not-allowed font-bold h-10 rounded-lg text-xs"
                      disabled
                    >
                      <Download size={14} className="mr-1.5" /> Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
