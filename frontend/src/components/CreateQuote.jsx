import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateQuote() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Base state
  const [formData, setFormData] = useState({
    customer_name: '',
    place_of_supply: 'Tamil Nadu',
    quote_number: 'EST-', 
    reference_number: '',
    quote_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });

  // Items table state
  const [items, setItems] = useState([
    { id: 1, item_details: '', quantity: 1, rate: 0, discount_amount: 0, discount_type: 'amount', tax_type: 'GST18', amount: 0 }
  ]);

  useEffect(() => {
    // Fetch Customers
    fetch('http://localhost:8000/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []));
    
    // Fetch Products
    fetch('http://localhost:8000/api/products')
      .then(res => res.json())
      .then(data => setProducts(data.products || []));
  }, []);

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
      const payload = {
        ...formData,
        ...totals,
        status,
        items: items
      };

      const response = await fetch('http://localhost:8000/api/quotes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      <header className="bg-slate-50/50 border-b border-slate-200 px-6 lg:px-10 py-5 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">New Quote</h1>
          <button className="text-blue-600 text-sm font-semibold ml-4 hover:underline flex items-center gap-2">
            Fetch Details From GSTN <ExternalLink size={16} />
          </button>
        </div>
      </header>

      {/* 2. FORM CONTENT */}
      <div className="p-6 lg:p-10 space-y-10">
        
        {/* Base Info */}
        <section className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-bold text-[#ef4444]">Customer Name *</Label>
            <div className="col-span-6">
              <Select onValueChange={(v) => {
                handleBaseChange('customer_name', v);
                const selectedCust = customers.find(c => c.customer_id === v || c.display_name === v);
                if (selectedCust) handleBaseChange('place_of_supply', selectedCust.place_of_supply || 'Tamil Nadu');
              }}>
                <SelectTrigger className="h-11 border-slate-200 focus:ring-1 focus:ring-blue-400">
                  <SelectValue placeholder="Select a Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c, i) => (
                    <SelectItem key={i} value={c.display_name || c.first_name}>{c.display_name || `${c.first_name} ${c.last_name}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-medium text-slate-700">Quote#</Label>
            <Input className="col-span-6 h-11 border-slate-200" value={formData.quote_number} onChange={e => handleBaseChange('quote_number', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-medium text-slate-700">Reference#</Label>
            <Input className="col-span-6 h-11 border-slate-200" value={formData.reference_number} onChange={e => handleBaseChange('reference_number', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-bold text-[#ef4444]">Quote Date *</Label>
            <Input type="date" className="col-span-3 h-11 border-slate-200" value={formData.quote_date} onChange={e => handleBaseChange('quote_date', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-medium text-slate-700">Expiry Date</Label>
            <Input type="date" className="col-span-3 h-11 border-slate-200" value={formData.expiry_date} onChange={e => handleBaseChange('expiry_date', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-medium text-slate-700">Place of Supply</Label>
            <div className="col-span-6">
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
            <span className="col-span-3 text-xs text-slate-400">Used to compute CGST/SGST vs IGST</span>
          </div>
        </section>

        {/* Items Table */}
        <section className="pt-4 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-xs uppercase text-slate-500 font-bold bg-white">
                  <th className="p-3 w-4/12 text-[#ef4444]">Item Details *</th>
                  <th className="p-3 w-1/12 text-right">Quantity</th>
                  <th className="p-3 w-2/12 text-right">Rate</th>
                  <th className="p-3 w-2/12 text-right">Discount</th>
                  <th className="p-3 w-1/12">Tax</th>
                  <th className="p-3 w-2/12 text-right">Amount</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-2">
                       <Select value={item.item_details} onValueChange={(v) => handleItemChange(index, 'item_details', v)}>
                         <SelectTrigger className="h-10 border-slate-200 shadow-none"><SelectValue placeholder="Select an Item..." /></SelectTrigger>
                         <SelectContent>
                           {products.map(p => (
                             <SelectItem key={p.product_id} value={p.name}>{p.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </td>
                    <td className="p-2">
                      <Input type="number" min="1" className="h-10 text-right shadow-none" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <Input type="number" className="h-10 text-right shadow-none" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                    </td>
                    <td className="p-2 flex items-center gap-1">
                      <Input type="number" className="h-10 w-2/3 text-right shadow-none" value={item.discount_amount} onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)} />
                      <Select value={item.discount_type} onValueChange={(v) => handleItemChange(index, 'discount_type', v)}>
                        <SelectTrigger className="h-10 w-1/3 px-2 shadow-none font-medium"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">₹</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select value={item.tax_type} onValueChange={(v) => handleItemChange(index, 'tax_type', v)}>
                        <SelectTrigger className="h-10 shadow-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GST12">12%</SelectItem>
                          <SelectItem value="GST18">18%</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 text-right font-medium text-slate-700">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeItemRow(index)} className="p-2 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button variant="ghost" onClick={addItemRow} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <PlusCircle size={16} className="mr-2" /> Add Another Line
            </Button>
          </div>
        </section>

        {/* Totals Calculation */}
        <section className="flex justify-end pt-8">
          <div className="w-1/3 bg-slate-50/50 p-6 rounded-lg border border-slate-100 space-y-4">
            <div className="flex justify-between text-sm font-medium text-slate-600">
              <span>Sub Total</span>
              <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
            
            {formData.place_of_supply === 'Tamil Nadu' ? (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>CGST</span>
                  <span>₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>SGST</span>
                  <span>₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
              </>
            ) : (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>IGST</span>
                  <span>₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
                </div>
            )}
            
            <div className="pt-4 border-t border-slate-200 flex justify-between font-black text-xl text-slate-800">
              <span>Total ( ₹ )</span>
              <span>₹{totals.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3. FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-xl flex justify-end gap-4 shadow-sm">
        <Button variant="outline" className="px-6 h-11 border-slate-300 font-semibold text-slate-600 bg-white" onClick={() => handleSave("Draft")}>
          Save as Draft
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 px-8 h-11 font-bold text-white" onClick={() => handleSave("Sent")}>
          Save and Send
        </Button>
        <Button variant="ghost" className="px-6 h-11 font-semibold text-slate-500 hover:text-slate-700" onClick={() => navigate('/quotes')}>
          Cancel
        </Button>
      </footer>
    </div>
  );
}
