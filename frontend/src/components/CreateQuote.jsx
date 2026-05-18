import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ExternalLink, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { API } from '../config';

export default function CreateQuote() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Base state
  const [formData, setFormData] = useState({
    user_id: null,
    order_id: null,
    customer_name: '',
    place_of_supply: 'Tamil Nadu',
    quote_number: 'EST-' + Math.floor(1000 + Math.random() * 9000), 
    reference_number: '',
    quote_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });

  // Items table state
  const [items, setItems] = useState([
    { id: 1, item_details: '', quantity: 1, rate: 0, discount_amount: 0, discount_type: 'amount', tax_type: 'GST18', amount: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { 'Authorization': `Bearer ${user.token}` };
        
        // Fetch Active Portal Users
        const custRes = await fetch(`${API}/admin/customers/active`, { headers });
        if (custRes.status === 401) throw new Error("Unauthorized");
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
        
        // Fetch Products
        const prodRes = await fetch(`${API}/products`, { headers });
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);

      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message === "Unauthorized" ? "Session expired. Please login again." : "Failed to load data.");
        if (err.message === "Unauthorized") {
          toast.error("Session expired. Redirecting...");
          setTimeout(() => navigate('/login'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) fetchData();

    // Handle Incoming Order Data
    if (location.state?.order) {
      const order = location.state.order;
      setFormData(prev => ({
        ...prev,
        user_id: order.user_id,
        order_id: order.id,
        customer_name: order.user?.full_name || order.user?.username,
        reference_number: `ORD-${order.id}`
      }));
      if (order.order_items) {
         const newItems = order.order_items.map((oi, idx) => ({
            id: idx,
            item_details: oi.product?.name || 'Product',
            quantity: oi.quantity,
            rate: oi.price_at_order,
            discount_amount: 0,
            discount_type: 'amount',
            tax_type: 'GST18',
            amount: oi.quantity * oi.price_at_order
         }));
         setItems(newItems);
      }
    }
  }, [location.state, user]);

  const handleBaseChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };

    // Auto-fill rate if product is selected
    if (field === 'item_details') {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct) {
        item.rate = selectedProduct.price;
      }
    }

    // Calculate row amount
    let qty = parseFloat(item.quantity) || 0;
    let rate = parseFloat(item.rate) || 0;
    let discount = parseFloat(item.discount_amount) || 0;
    
    let amountBeforeTax = qty * rate;
    if (item.discount_type === 'percentage') {
      amountBeforeTax -= amountBeforeTax * (discount / 100);
    } else {
       amountBeforeTax -= discount;
    }
    
    item.amount = Math.max(0, amountBeforeTax);
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { id: Date.now(), item_details: '', quantity: 1, rate: 0, discount_amount: 0, discount_type: 'amount', tax_type: 'GST18', amount: 0 }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    }
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTaxAmount = 0;

    items.forEach(item => {
      subtotal += item.amount;
      const taxRate = item.tax_type === 'GST12' ? 0.12 : 0.18;
      totalTaxAmount += item.amount * taxRate;
    });

    let cgst = 0, sgst = 0, igst = 0;
    if (formData.place_of_supply === 'Tamil Nadu') {
      cgst = totalTaxAmount / 2;
      sgst = totalTaxAmount / 2;
    } else {
      igst = totalTaxAmount;
    }

    const grand_total = subtotal + cgst + sgst + igst;

    return { subtotal, cgst, sgst, igst, grand_total };
  };

  const totals = calculateTotals();

  const handleSave = async (status = "Draft") => {
    try {
      // Clean and Validate Items
      const cleanedItems = items.map(item => ({
        item_details: item.item_details,
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        discount_amount: parseFloat(item.discount_amount) || 0,
        discount_type: item.discount_type,
        tax_type: item.tax_type,
        amount: parseFloat(item.amount) || 0
      }));

      const payload = {
        ...formData,
        ...totals,
        status,
        items: cleanedItems,
        // Ensure IDs are integers or null
        user_id: formData.user_id ? parseInt(formData.user_id) : null,
        order_id: formData.order_id ? parseInt(formData.order_id) : null
      };

      console.log("Saving Quote Payload:", payload);

      const response = await fetch(`${API}/quotes/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        navigate('/quotes');
      } else {
        const err = await response.json();
        alert('Failed to save quote: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Error saving quote');
    }
  };

  return (
    <div className="bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200">
      
      {/* 1. HEADER */}
      <header className="bg-slate-50/50 border-b border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-t-xl">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/quotes')} className="h-8 w-8 rounded-lg">
            <ChevronLeft size={16} className="text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">New Quote</h1>
            {formData.order_id && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-2 py-0 text-[10px] mt-0.5 animate-pulse">
                Draft Generated from Order #{formData.order_id}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" className="text-blue-600 font-bold text-xs uppercase tracking-widest gap-2 bg-blue-50/50 hover:bg-blue-50 rounded-lg h-8 px-4">
          Fetch Details From GSTN <ExternalLink size={12} />
        </Button>
      </header>

      {/* 2. FORM CONTENT */}
      <div className="p-4 md:p-6 space-y-6">
        
        {/* Base Info */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1 col-span-1 md:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">Customer Name *</Label>
            <Select 
              value={formData.user_id?.toString()}
              onValueChange={(v) => {
                const selectedCust = customers.find(c => c.id.toString() === v);
                if (selectedCust) {
                  setFormData({
                    ...formData,
                    user_id: selectedCust.id,
                    customer_name: selectedCust.full_name || selectedCust.email
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 border-slate-200 focus:ring-1 focus:ring-blue-400 bg-white">
                <SelectValue placeholder="Select a Customer" />
              </SelectTrigger>
              <SelectContent>
                {error && <div className="p-2 text-[10px] text-red-500 font-bold">{error}</div>}
                {Array.isArray(customers) && customers.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                    {c.full_name || 'Unnamed User'} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Quote#</Label>
            <Input className="h-8 border-slate-200 text-xs bg-white" value={formData.quote_number} onChange={e => handleBaseChange('quote_number', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reference#</Label>
            <Input className="h-8 border-slate-200 text-xs bg-white" value={formData.reference_number} onChange={e => handleBaseChange('reference_number', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">Quote Date *</Label>
            <Input type="date" className="h-8 border-slate-200 text-xs bg-white" value={formData.quote_date} onChange={e => handleBaseChange('quote_date', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Expiry Date</Label>
            <Input type="date" className="h-8 border-slate-200 text-xs bg-white" value={formData.expiry_date} onChange={e => handleBaseChange('expiry_date', e.target.value)} />
          </div>

          <div className="space-y-1 col-span-1 md:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              Place of Supply <span className="text-[8px] opacity-50">(Used for tax calculation)</span>
            </Label>
            <Select value={formData.place_of_supply} onValueChange={(v) => handleBaseChange('place_of_supply', v)}>
              <SelectTrigger className="h-8 border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                <SelectItem value="Delhi">Delhi</SelectItem>
                <SelectItem value="Karnataka">Karnataka</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Items Table */}
        <section className="pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-[10px] uppercase text-slate-500 font-bold bg-slate-100">
                  <th className="px-4 py-2 w-3/12 text-[#ef4444]">Item Details *</th>
                  <th className="px-2 py-2 w-1/12 text-right">Qty</th>
                  <th className="px-2 py-2 w-2/12 text-right">Rate</th>
                  <th className="px-2 py-2 w-2/12 text-right">Discount</th>
                  <th className="px-2 py-2 w-1/12">Tax</th>
                  <th className="px-4 py-2 w-2/12 text-right">Amount</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                       <Select value={item.item_details} onValueChange={(v) => handleItemChange(index, 'item_details', v)}>
                         <SelectTrigger className="h-8 border-slate-200 shadow-none text-xs"><SelectValue placeholder="Select Item" /></SelectTrigger>
                         <SelectContent>
                           {products.map(p => (
                             <SelectItem key={p.product_id} value={p.name} className="text-xs">{p.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" min="1" className="h-8 text-right shadow-none text-xs" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                    </td>
                    <td className="px-2 py-2">
                      <Input type="number" className="h-8 text-right shadow-none text-xs" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                        <Input type="number" className="h-6 border-0 bg-transparent text-right font-medium text-xs focus-visible:ring-0 px-1" value={item.discount_amount} onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)} />
                        <Select value={item.discount_type} onValueChange={(v) => handleItemChange(index, 'discount_type', v)}>
                          <SelectTrigger className="h-6 w-10 px-1 shadow-none font-bold text-[10px] bg-white border-0"><SelectValue /></SelectTrigger>
                          <SelectContent className="min-w-[4rem]"><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">₹</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Select value={item.tax_type} onValueChange={(v) => handleItemChange(index, 'tax_type', v)}>
                        <SelectTrigger className="h-8 shadow-none text-[10px] font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GST12" className="text-[10px]">12%</SelectItem>
                          <SelectItem value="GST18" className="text-[10px]">18%</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800 text-xs">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button variant="ghost" size="icon" onClick={() => removeItemRow(index)} disabled={items.length === 1} className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50">
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Button variant="ghost" onClick={addItemRow} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-3 font-bold text-[10px] uppercase tracking-widest">
              <PlusCircle size={14} className="mr-1.5" /> Add Another Line
            </Button>
          </div>
        </section>

        {/* Totals Calculation */}
        <section className="flex justify-end pt-4">
          <div className="w-full md:w-1/2 lg:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span className="uppercase tracking-widest text-[10px]">Sub Total</span>
              <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
            
            {formData.place_of_supply === 'Tamil Nadu' ? (
              <>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span className="uppercase tracking-widest text-[10px]">CGST</span>
                  <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span className="uppercase tracking-widest text-[10px]">SGST</span>
                  <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
              </>
            ) : (
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span className="uppercase tracking-widest text-[10px]">IGST</span>
                  <span>₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
            )}
            
            <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-lg text-slate-800">
              <span className="uppercase tracking-widest text-[10px] self-center">Total ( ₹ )</span>
              <span>₹{totals.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3. FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-end gap-3 rounded-b-xl shadow-sm">
        <Button variant="ghost" className="px-6 h-8 font-bold text-slate-500 hover:text-slate-700 w-full sm:w-auto" onClick={() => navigate('/quotes')}>
          Cancel
        </Button>
        <Button variant="outline" className="px-6 h-8 border-slate-300 font-bold text-slate-600 bg-white w-full sm:w-auto" onClick={() => handleSave("Draft")}>
          Save as Draft
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 px-8 h-8 font-bold text-white shadow-md shadow-blue-100 w-full sm:w-auto" onClick={() => handleSave("Sent")}>
          Save and Send
        </Button>
      </footer>
    </div>
  );
}
