import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../config';
import { ChevronLeft, PlusCircle, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateDeliveryChallan() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Base state
  const [formData, setFormData] = useState({
    customer_name: '',
    shipping_address: '',
    place_of_supply: 'Tamil Nadu',
    challan_type: 'Supply of Liquid Gas',
    challan_number: 'DC-', 
    reference_number: '',
    challan_date: new Date().toISOString().split('T')[0],
    notes: '',
    terms: '',
    // Logistics Details
    vehicle_number: '',
    driver_name: '',
    driver_mobile: '',
    transporter_name: '',
    waybill_number: '',
    dispatch_datetime: new Date().toISOString().slice(0, 16),
  });

  // Items state
  const [items, setItems] = useState([
    { id: 1, item_details: '', quantity: 1, rate: 0, tax_type: 'GST18', amount: 0 }
  ]);
  
  const [adjustment, setAdjustment] = useState(0);

  useEffect(() => {
    fetch(`${API}/customers`)
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []));
    
    fetch(`${API}/products`)
      .then(res => res.json())
      .then(data => setProducts(data.products || []));

    fetch(`${API}/invoices`)
      .then(res => res.json())
      .then(data => setInvoices(data.invoices || []));

    // Fetch Next Challan Number
    fetch(`${API}/delivery-challans/next-number`)
      .then(res => res.json())
      .then(data => {
         if (data.next_number) handleBaseChange('challan_number', data.next_number);
      });
  }, []);

  const mirrorInvoice = async (invoiceNumber) => {
    try {
      const response = await fetch(`${API}/invoices/${invoiceNumber}`);
      if (!response.ok) return;
      const inv = await response.json();
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        customer_name: inv.customer_name,
        place_of_supply: inv.place_of_supply,
        reference_number: inv.invoice_number,
        terms: inv.terms_conditions || prev.terms,
        notes: inv.customer_notes || prev.notes,
        related_invoice_id: inv.id
      }));

      // Find customer for address
      const customer = customers.find(c => c.display_name === inv.customer_name || `${c.first_name} ${c.last_name}` === inv.customer_name);
      if (customer) {
        const addr = [
          customer.shipping_attention,
          customer.shipping_address_1,
          customer.shipping_address_2,
          customer.shipping_district,
          customer.shipping_state,
          customer.shipping_pincode,
          customer.shipping_country
        ].filter(Boolean).join(', ');
        handleBaseChange('shipping_address', addr);
      }

      // Update items
      const mirroredItems = (inv.items || []).map((item, idx) => ({
        id: idx + 1,
        item_details: item.item_details,
        quantity: item.quantity,
        rate: item.rate,
        tax_type: item.tax_type,
        amount: item.amount
      }));
      setItems(mirroredItems.length > 0 ? mirroredItems : [{ id: 1, item_details: '', quantity: 1, rate: 0, tax_type: 'GST18', amount: 0 }]);
      
    } catch (error) {
      console.error("Mirroring Error:", error);
    }
  };



  const handleBaseChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCustomerChange = (v) => {
    handleBaseChange('customer_name', v);
    const selectedCust = customers.find(c => (c.display_name || c.first_name) === v);
    if (selectedCust) {
      handleBaseChange('place_of_supply', selectedCust.place_of_supply || 'Tamil Nadu');
      // Format full shipping address
      const addr = [
        selectedCust.shipping_attention,
        selectedCust.shipping_address_1,
        selectedCust.shipping_address_2,
        selectedCust.shipping_district,
        selectedCust.shipping_state,
        selectedCust.shipping_pincode,
        selectedCust.shipping_country
      ].filter(Boolean).join(', ');
      
      handleBaseChange('shipping_address', addr || 'No Shipping Address Available');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };

    if (field === 'item_details') {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct) {
        item.rate = selectedProduct.price;
      }
    }

    let qty = parseFloat(item.quantity) || 0;
    let rate = parseFloat(item.rate) || 0;
    item.amount = Math.max(0, qty * rate);
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { id: Date.now(), item_details: '', quantity: 1, rate: 0, tax_type: 'GST18', amount: 0 }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.amount;
    });

    const grand_total = subtotal + parseFloat(adjustment || 0);
    return { subtotal, adjustment: parseFloat(adjustment || 0), grand_total };
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

      const response = await fetch(`${API}/delivery-challans/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        navigate('/delivery-challans');
      } else {
        const err = await response.json();
        alert('Failed to save challan: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Error saving delivery challan');
    }
  };

  return (
    <div className="bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200">
      <header className="bg-slate-50/50 border-b border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 rounded-t-xl">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/delivery-challans')} className="h-8 w-8 rounded-lg">
            <ChevronLeft size={16} className="text-slate-600" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">New Delivery Challan</h1>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1 col-span-1 md:col-span-2">
            <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
              Link with Invoice (Mirror) <span className="text-[8px] opacity-50">(Auto-fill details)</span>
            </Label>
            <Select onValueChange={mirrorInvoice}>
              <SelectTrigger className="h-8 border-blue-200 bg-white">
                <SelectValue placeholder="Select Invoice to copy items..." />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv, i) => (
                  <SelectItem key={i} value={inv.invoice_number} className="text-xs">{inv.invoice_number} - {inv.customer_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Force break to new line if necessary, or let it flow */}
          <div className="w-full col-span-1 md:col-span-3 lg:col-span-4 h-0 border-b border-slate-100 my-1"></div>

          <div className="space-y-1 col-span-1 md:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">Customer Name *</Label>
            <Select value={formData.customer_name} onValueChange={handleCustomerChange}>
              <SelectTrigger className="h-8 border-slate-200 focus:ring-1 focus:ring-indigo-400 bg-white">
                <SelectValue placeholder="Select a Customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c, i) => (
                  <SelectItem key={i} value={c.display_name || c.first_name} className="text-xs">{c.display_name || `${c.first_name} ${c.last_name}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">Delivery Challan# *</Label>
            <Input className="h-8 border-slate-200 text-xs bg-white" value={formData.challan_number} onChange={e => handleBaseChange('challan_number', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reference#</Label>
            <Input className="h-8 border-slate-200 text-xs bg-white" value={formData.reference_number} onChange={e => handleBaseChange('reference_number', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">Challan Date *</Label>
            <Input type="date" className="h-8 border-slate-200 text-xs bg-white" value={formData.challan_date} onChange={e => handleBaseChange('challan_date', e.target.value)} />
          </div>
          
          <div className="space-y-1 col-span-1 md:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444]">Type *</Label>
            <Select value={formData.challan_type} onValueChange={(v) => handleBaseChange('challan_type', v)}>
              <SelectTrigger className="h-8 border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Supply of Liquid Gas" className="text-xs">Supply of Liquid Gas</SelectItem>
                <SelectItem value="Job Work" className="text-xs">Job Work</SelectItem>
                <SelectItem value="Supply on Approval" className="text-xs">Supply on Approval</SelectItem>
                <SelectItem value="Others" className="text-xs">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.shipping_address && (
            <div className="space-y-1 col-span-1 md:col-span-4 mt-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shipping Address</Label>
              <Textarea 
                className="bg-white border-slate-200 resize-none h-16 text-xs p-2" 
                value={formData.shipping_address} 
                onChange={e => handleBaseChange('shipping_address', e.target.value)}
              />
            </div>
          )}
        </section>

        <section className="bg-slate-50/30 p-4 rounded-xl border border-slate-100">
           <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">2</span>
              Logistics & Delivery Details
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-7">
              <div className="space-y-1">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vehicle Number</Label>
                 <Input className="h-8 text-xs bg-white border-slate-200" value={formData.vehicle_number} onChange={e => handleBaseChange('vehicle_number', e.target.value)} placeholder="TN-01-AB-1234" />
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transporter Name</Label>
                 <Input className="h-8 text-xs bg-white border-slate-200" value={formData.transporter_name} onChange={e => handleBaseChange('transporter_name', e.target.value)} placeholder="Speed Logistics" />
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Driver Name</Label>
                 <Input className="h-8 text-xs bg-white border-slate-200" value={formData.driver_name} onChange={e => handleBaseChange('driver_name', e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Waybill / LR Number</Label>
                 <Input className="h-8 text-xs bg-white border-slate-200" value={formData.waybill_number} onChange={e => handleBaseChange('waybill_number', e.target.value)} placeholder="LR-782293" />
              </div>
              <div className="space-y-1 col-span-1 md:col-span-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dispatch Date & Time</Label>
                 <Input className="h-8 text-xs bg-white border-slate-200" type="datetime-local" value={formData.dispatch_datetime} onChange={e => handleBaseChange('dispatch_datetime', e.target.value)} />
              </div>
           </div>
        </section>

        <section className="pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-[10px] uppercase text-slate-500 font-bold bg-slate-100">
                  <th className="px-4 py-2 w-5/12 text-[#ef4444]">Item Details *</th>
                  <th className="px-2 py-2 w-2/12 text-right">Quantity</th>
                  <th className="px-2 py-2 w-2/12 text-right">Rate</th>
                  <th className="px-4 py-2 w-2/12 text-right">Amount</th>
                  <th className="px-2 py-2 w-1/12"></th>
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
            <Button variant="ghost" onClick={addItemRow} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 px-3 font-bold text-[10px] uppercase tracking-widest">
              <PlusCircle size={14} className="mr-1.5" /> Add Another Line
            </Button>
          </div>
        </section>

        <section className="flex flex-col md:flex-row justify-between pt-4 gap-6">
           <div className="w-full md:w-1/2 space-y-4">
             <div>
               <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Customer Notes</Label>
               <Textarea className="h-16 bg-slate-50 border-slate-200 text-xs p-2" placeholder="Will be displayed on the challan" value={formData.notes} onChange={e => handleBaseChange('notes', e.target.value)} />
             </div>
             <div>
               <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Terms & Conditions</Label>
               <Textarea className="h-16 bg-slate-50 border-slate-200 text-xs p-2" placeholder="Enter terms and conditions" value={formData.terms} onChange={e => handleBaseChange('terms', e.target.value)} />
             </div>
             
             {/* File Upload Visual Only */}
             <div>
               <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Attach File(s)</Label>
               <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors">
                 <UploadCloud className="text-slate-400 mb-1" size={20} />
                 <span className="text-xs text-slate-500 font-medium">Click to upload or drag & drop</span>
                 <span className="text-[10px] text-slate-400 mt-1">Maximum file size: 5MB</span>
                 <input type="file" className="hidden" />
               </div>
             </div>
           </div>

          <div className="w-full md:w-1/2 lg:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 h-fit">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span className="uppercase tracking-widest text-[10px]">Sub Total</span>
              <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                 <span className="uppercase tracking-widest text-[10px]">Adjustment</span>
                 <Input type="number" className="w-20 h-7 text-right bg-white text-xs px-2" value={adjustment} onChange={e => setAdjustment(e.target.value)} />
              </div>
              <span>₹{parseFloat(adjustment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-lg text-slate-800">
              <span className="uppercase tracking-widest text-[10px] self-center">Total ( ₹ )</span>
              <span>₹{totals.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-end gap-3 rounded-b-xl shadow-sm">
        <Button variant="ghost" className="px-6 h-8 font-bold text-slate-500 hover:text-slate-700 w-full sm:w-auto" onClick={() => navigate('/delivery-challans')}>
          Cancel
        </Button>
        <Button variant="outline" className="px-6 h-8 border-slate-300 font-bold text-slate-600 bg-white w-full sm:w-auto" onClick={() => handleSave("Draft")}>
          Save as Draft
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 px-8 h-8 font-bold text-white shadow-md shadow-indigo-100 w-full sm:w-auto focus:ring-offset-2" onClick={() => handleSave("Open")}>
          Save as Open
        </Button>
      </footer>
    </div>
  );
}
