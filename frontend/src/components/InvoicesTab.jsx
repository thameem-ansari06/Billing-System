import React, { useState, useEffect } from 'react';
import { Plus, FileText, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/invoices/');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const getStatusColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'partially paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending approval': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleInvoiceClick = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`http://localhost:8000/api/invoices/pdf-view/${id}`, '_blank');
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
            <p className="text-sm text-slate-500">Create and manage your professional GST invoices</p>
          </div>
        </div>
        <Button onClick={() => navigate('/invoices/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 w-full md:w-auto">
          <Plus size={18} className="mr-2" /> New Invoice
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <Input className="pl-10 h-10 border-slate-200" placeholder="Search invoices..." />
          </div>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b">
              <tr className="text-slate-500 text-sm">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Invoice Number</th>
                <th className="p-4 font-semibold">Reference Number</th>
                <th className="p-4 font-semibold">Customer Name</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    No invoices found. Create a new one to get started!
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-600">{inv.invoice_date}</td>
                    <td className="p-4">
                       <a 
                         href="#" 
                         onClick={(e) => handleInvoiceClick(e, inv.invoice_number)}
                         className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer min-h-[44px] px-2 rounded-md transition-colors"
                       >
                         {inv.invoice_number} <Eye size={18} className="ml-1" />
                       </a>
                    </td>
                    <td className="p-4 text-sm text-slate-500">{inv.reference_number || '-'}</td>
                    <td className="p-4 font-bold text-slate-700">{inv.customer_name}</td>
                    <td className="p-4 text-center">
                      <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
                    </td>
                    <td className="p-4 text-right font-black text-slate-700">
                      ₹{parseFloat(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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