import React, { useState, useEffect } from 'react';
import { Plus, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function QuotesTab() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/quotes');
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchQuotes(); }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quotes & Estimates</h1>
            <p className="text-sm text-slate-500">Manage your quotes and send proposals to customers</p>
          </div>
        </div>
        <Button onClick={() => navigate('/quotes/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11">
          <Plus size={18} className="mr-2" /> New Quote
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <Input className="pl-10 h-10 border-slate-200" placeholder="Search quotes..." />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr className="text-slate-500 text-sm">
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Estimate Number</th>
              <th className="p-4 font-semibold">Reference</th>
              <th className="p-4 font-semibold">Customer Name</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {quotes.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-3 opacity-20" />
                  No quotes found. Create a new quote to get started!
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.quote_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="p-4 text-sm text-slate-600">{q.quote_date}</td>
                  <td className="p-4 font-bold text-blue-600">{q.quote_number}</td>
                  <td className="p-4 text-sm text-slate-500">{q.reference_number || '-'}</td>
                  <td className="p-4 font-bold text-slate-700">{q.customer_name}</td>
                  <td className="p-4 text-center">
                    <Badge className={getStatusColor(q.status)}>{q.status}</Badge>
                  </td>
                  <td className="p-4 text-right font-black text-slate-700">
                    ₹{parseFloat(q.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
