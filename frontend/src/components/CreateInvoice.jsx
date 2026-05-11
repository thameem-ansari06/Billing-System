import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ExternalLink, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '../context/AuthContext';

export default function CreateInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Base state
  const [formData, setFormData] = useState({
    user_id: '',
    order_id: null,
    customer_name: '',
    place_of_supply: 'Tamil Nadu',
    invoice_number: 'INV-' + Math.floor(1000 + Math.random() * 9000), 
    reference_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    email: '',
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
        const custRes = await fetch('http://localhost:8000/api/admin/customers/active', { headers });
        if (custRes.status === 401) throw new Error("Unauthorized");
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
        
        // Fetch Products
        const prodRes = await fetch('http://localhost:8000/api/products', { headers });
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);

        // Fetch Next Invoice Number
        const invRes = await fetch('http://localhost:8000/api/invoices/next-number', { headers });
        const invData = await invRes.json();
        if (invData.next_number) handleBaseChange('invoice_number', invData.next_number);

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
        customer_name: order.user?.full_name || order.user?.username,
        reference_number: `ORD-${order.id}`,
        email: order.user?.email || ''
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

  const formatAddress = (c) => {
    return [
      c.shipping_attention,
      c.shipping_address_1,
      c.shipping_address_2,
      c.shipping_city,
      c.shipping_state,
      c.shipping_pincode,
      c.shipping_country
    ].filter(Boolean).join(', ');
  };


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
    
    // B2B Smart Invoicing: Force 18% split if enterprise
    const selectedCust = customers.find(c => c.id === formData.user_id);
    if (selectedCust?.account_type === 'enterprise') {
      cgst = totalTaxAmount / 2;
      sgst = totalTaxAmount / 2;
    } else {
      if (formData.place_of_supply === 'Tamil Nadu') {
        cgst = totalTaxAmount / 2;
        sgst = totalTaxAmount / 2;
      } else {
        igst = totalTaxAmount;
      }
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

      console.log("Saving Invoice Payload:", payload);

      const response = await fetch('http://localhost:8000/api/invoices/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        navigate('/invoices');
      } else {
        const err = await response.json();
        alert('Failed to save invoice: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Error saving invoice');
    }
  };

  return (
    <div className="bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200 w-full max-w-7xl mx-auto my-6">
      
      {/* HEADER */}
      <header className="bg-slate-50/50 border-b border-slate-200 px-6 lg:px-10 py-5 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">New Invoice</h1>
          {formData.order_id && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold px-3 py-1 animate-pulse">
              Generated from Order #{formData.order_id}
            </Badge>
          )}
          <button className="text-blue-600 text-sm font-semibold ml-4 hover:underline flex items-center gap-2">
            Fetch Details From GSTN <ExternalLink size={16} />
          </button>
        </div>
      </header>

      {/* FORM CONTENT */}
      <div className="p-6 lg:p-10 space-y-10">
        
        {/* Base Info */}
        <section className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-bold text-[#ef4444]">Customer Name *</Label>
            <div className="col-span-12 md:col-span-6">
              <Select 
                value={formData.user_id?.toString()}
                onValueChange={(v) => {
                  const selectedCust = customers.find(c => c.id.toString() === v);
                  if (selectedCust) {
                    setFormData({
                      ...formData,
                      user_id: selectedCust.id,
                      customer_name: selectedCust.full_name || selectedCust.email,
                      email: selectedCust.email || '',
                      customer_company_name: selectedCust.company_name,
                      customer_gst_no: selectedCust.gst_no,
                      account_type: selectedCust.account_type,
                    });
                  }
                }}
              >
                <SelectTrigger className="h-11 border-slate-200 focus:ring-1 focus:ring-blue-400">
                  <SelectValue placeholder="Select a Customer" />
                </SelectTrigger>
                <SelectContent>
                  {error && <div className="p-2 text-xs text-red-500 font-bold">{error}</div>}
                  {Array.isArray(customers) && customers.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.full_name || 'Unnamed User'} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-bold text-[#ef4444]">Invoice# *</Label>
            <Input className="col-span-12 md:col-span-6 h-11 border-slate-200" value={formData.invoice_number} onChange={e => handleBaseChange('invoice_number', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-700">Reference#</Label>
            <Input className="col-span-12 md:col-span-6 h-11 border-slate-200" value={formData.reference_number} onChange={e => handleBaseChange('reference_number', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-bold text-[#ef4444]">Invoice Date *</Label>
            <Input type="date" className="col-span-12 md:col-span-3 h-11 border-slate-200" value={formData.invoice_date} onChange={e => handleBaseChange('invoice_date', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-700">Due Date</Label>
            <Input type="date" className="col-span-12 md:col-span-3 h-11 border-slate-200" value={formData.due_date} onChange={e => handleBaseChange('due_date', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-700">Place of Supply</Label>
            <div className="col-span-12 md:col-span-6">
              <Select value={formData.place_of_supply} onValueChange={(v) => handleBaseChange('place_of_supply', v)}>
                <SelectTrigger className="h-11 border-slate-200">
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
            <span className="col-span-12 md:col-span-3 text-xs text-slate-400">Used to compute CGST/SGST vs IGST</span>
          </div>

          {formData.account_type === 'enterprise' && (
            <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase tracking-wider">
                <Zap size={14} /> B2B Smart Invoicing Active
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Company Name</Label>
                  <p className="font-bold text-slate-700">{formData.customer_company_name}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">GSTIN</Label>
                  <p className="font-bold text-slate-700">{formData.customer_gst_no}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Items Table */}
        <section className="pt-4 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto overflow-y-visible">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-200">
                <tr className="text-xs uppercase text-slate-500 font-bold bg-white">
                  <th className="p-3 w-4/12 min-w-[200px] text-[#ef4444]">Item Details *</th>
                  <th className="p-3 w-1/12 min-w-[100px] text-right">Quantity</th>
                  <th className="p-3 w-2/12 min-w-[120px] text-right">Rate</th>
                  <th className="p-3 w-2/12 min-w-[160px] text-right">Discount</th>
                  <th className="p-3 w-1/12 min-w-[100px]">Tax</th>
                  <th className="p-3 w-2/12 min-w-[120px] text-right">Amount</th>
                  <th className="p-3 w-12 min-w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-2 align-top">
                       <Select value={item.item_details} onValueChange={(v) => handleItemChange(index, 'item_details', v)}>
                         <SelectTrigger className="h-10 border-slate-200 shadow-none"><SelectValue placeholder="Select an Item..." /></SelectTrigger>
                         <SelectContent>
                           {products.map(p => (
                             <SelectItem key={p.product_id} value={p.name}>{p.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </td>
                    <td className="p-2 align-top">
                      <Input type="number" min="1" className="h-10 text-right shadow-none" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                    </td>
                    <td className="p-2 align-top">
                      <Input type="number" className="h-10 text-right shadow-none" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                    </td>
                    <td className="p-2 align-top">
                      <div className="flex items-center gap-1">
                        <Input type="number" className="h-10 w-2/3 text-right shadow-none" value={item.discount_amount} onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)} />
                        <Select value={item.discount_type} onValueChange={(v) => handleItemChange(index, 'discount_type', v)}>
                          <SelectTrigger className="h-10 w-1/3 px-2 shadow-none font-medium"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">₹</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="p-2 align-top">
                      <Select value={item.tax_type} onValueChange={(v) => handleItemChange(index, 'tax_type', v)}>
                        <SelectTrigger className="h-10 shadow-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GST12">12%</SelectItem>
                          <SelectItem value="GST18">18%</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 text-right font-medium text-slate-700 align-top pt-4">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}
                    </td>
                    <td className="p-2 text-center align-top pt-4">
                      <button onClick={() => removeItemRow(index)} className="text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-md focus:outline-none transition-colors h-11 w-11 flex items-center justify-center min-h-[44px] min-w-[44px]"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button variant="ghost" onClick={addItemRow} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-blue-200">
              <PlusCircle size={16} className="mr-2" /> Add Another Line
            </Button>
          </div>
        </section>

        {/* Totals Calculation */}
        <section className="flex justify-end pt-8">
          <div className="w-full max-w-sm bg-slate-50/50 p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between text-sm font-medium text-slate-600">
              <span>Sub Total</span>
              <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
            
            {(formData.account_type === 'enterprise' || formData.place_of_supply === 'Tamil Nadu') ? (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>CGST (9%)</span>
                  <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>SGST (9%)</span>
                  <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
              </>
            ) : (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>IGST (18%)</span>
                  <span>₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
            )}
            
            <div className="pt-4 border-t border-slate-200 flex justify-between font-black text-xl text-slate-800 items-baseline">
              <span>Total</span>
              <span className="text-2xl">₹{totals.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-xl flex justify-end gap-4 shadow-sm">
        <Button variant="outline" className="px-6 h-11 border-slate-300 font-semibold text-slate-600 bg-white hover:bg-slate-50" onClick={() => handleSave("Draft")}>
          Save as Draft
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 px-8 h-11 font-bold text-white shadow-sm transition-colors" onClick={() => handleSave("Sent")}>
          Save and Send
        </Button>
        <Button variant="ghost" className="px-6 h-11 font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={() => navigate('/invoices')}>
          Cancel
        </Button>
      </footer>
    </div>
  );
}
