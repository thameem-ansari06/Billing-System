import React, { useState, useEffect } from 'react';
import { Plus, FileText, Search, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { API } from '../config';

export default function QuotesTab() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchQuotes = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/quotes`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      toast.error("Failed to load quotes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if (user?.token) fetchQuotes(); 
  }, [user]);

  const handleApprove = async (e, quoteId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.token) return;

    setIsApproving(quoteId);
    try {
      const res = await fetch(`${API}/quotes/${quoteId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      
      if (res.ok) {
        toast.success("Quote approved and invoice generated!");
        // Automatically navigate to Invoices tab as requested
        navigate('/invoices');
      } else {
        const error = await res.json();
        toast.error(error.detail || "Approval failed");
      }
    } catch (err) {
      toast.error("Network error during approval");
    } finally {
      setIsApproving(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'sent':
      case 'pending_approval': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'approved':
      case 'accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'declined':
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quotes & Estimates</h1>
            <p className="text-sm text-slate-500">Manage your quotes and send proposals to customers</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={fetchQuotes} variant="outline" className="h-11 font-bold">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </Button>
          <Button onClick={() => navigate('/quotes/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6">
            <Plus size={18} className="mr-2" /> New Quote
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <Input className="pl-10 h-10 border-slate-200" placeholder="Search quotes..." />
          </div>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b">
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <th className="p-4">Date</th>
              <th className="p-4">Estimate Number</th>
              <th className="p-4">Customer Name</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Amount (₹)</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotes.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400 font-bold">
                  <FileText size={48} className="mx-auto mb-3 opacity-20" />
                  No quotes found.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="p-4 text-sm text-slate-500 font-medium">{q.quote_date}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{q.quote_number}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Ref: {q.reference_number || '-'}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{q.customer_name}</td>
                  <td className="p-4 text-center">
                    <Badge className={`${getStatusColor(q.status)} font-bold border`}>{q.status}</Badge>
                  </td>
                  <td className="p-4 text-right font-black text-blue-600">
                    ₹{parseFloat(q.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    {(q.status === 'pending_approval' || q.status === 'sent') && (
                      <Button
                        size="sm"
                        disabled={isApproving === q.id}
                        onClick={(e) => handleApprove(e, q.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm"
                      >
                        {isApproving === q.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <><CheckCircle size={14} className="mr-1.5" /> Approve</>
                        )}
                      </Button>
                    )}
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

