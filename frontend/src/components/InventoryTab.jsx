import React, { useState, useEffect } from 'react';
import { Box, Plus, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function InventoryTab() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("❌ Inventory Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <Button onClick={() => navigate('/inventory/new')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
  <Plus size={18} className="mr-2" /> Add Item
</Button>
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
            <p className="text-sm text-slate-500">Track and manage your product stock</p>
            
          </div>
        </div>
        <Button onClick={fetchProducts} variant="outline" className="gap-2">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr className="text-slate-500 text-sm">
              <th className="p-4 font-semibold">Product ID</th>
              <th className="p-4 font-semibold">Product Name</th>
              <th className="p-4 font-semibold text-right">Price (₹)</th>
              <th className="p-4 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-10 text-center text-slate-400">
                  <Box size={48} className="mx-auto mb-3 opacity-20" />
                  No products found in inventory.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.product_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-500">{p.product_id}</td>
                  <td className="p-4 font-bold text-slate-700">{p.name}</td>
                  <td className="p-4 text-right font-black text-indigo-600">
                    ₹{parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">In Stock</Badge>
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