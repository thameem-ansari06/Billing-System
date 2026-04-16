import React, { useState, useEffect } from 'react';
import { Plus, Truck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function DeliveryChallansTab() {
  const [challans, setChallans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchChallans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/delivery-challans');
      const data = await res.json();
      setChallans(data.delivery_challans || []);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchChallans(); }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Delivery Challans</h1>
            <p className="text-sm text-slate-500">Create and manage delivery challans for shipments</p>
          </div>
        </div>
        <Button onClick={() => navigate('/delivery-challans/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11">
          <Plus size={18} className="mr-2" /> New Challan
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <Input className="pl-10 h-10 border-slate-200" placeholder="Search challans..." />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr className="text-slate-500 text-sm">
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Challan Number</th>
              <th className="p-4 font-semibold">Reference</th>
              <th className="p-4 font-semibold">Customer Name</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {challans.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  <Truck size={48} className="mx-auto mb-3 opacity-20" />
                  No delivery challans found. Create a new one to get started!
                </td>
              </tr>
            ) : (
              challans.map((c) => (
                <tr key={c.challan_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="p-4 text-sm text-slate-600">{c.challan_date}</td>
                  <td className="p-4 font-bold text-indigo-600">{c.challan_number}</td>
                  <td className="p-4 text-sm text-slate-500">{c.reference_number || '-'}</td>
                  <td className="p-4 font-bold text-slate-700">{c.customer_name}</td>
                  <td className="p-4 text-center">
                    <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="p-4 text-right font-black text-slate-700">
                    ₹{parseFloat(c.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
