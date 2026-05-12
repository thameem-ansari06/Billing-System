import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    fetch('https://billing-system-jk1c.onrender.com/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []));
    
    fetch('https://billing-system-jk1c.onrender.com/api/products')
      .then(res => res.json())
      .then(data => setProducts(data.products || []));

    fetch('https://billing-system-jk1c.onrender.com/api/invoices')
      .then(res => res.json())
      .then(data => setInvoices(data.invoices || []));

    // Fetch Next Challan Number
    fetch('https://billing-system-jk1c.onrender.com/api/delivery-challans/next-number')
      .then(res => res.json())
      .then(data => {
         if (data.next_number) handleBaseChange('challan_number', data.next_number);
      });
  }, []);

  const mirrorInvoice = async (invoiceNumber) => {
    try {
      const response = await fetch(`https://billing-system-jk1c.onrender.com/api/invoices/${invoiceNumber}`);
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
          customer.shipping_city,
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
        selectedCust.shipping_city,
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

      const response = await fetch('https://billing-system-jk1c.onrender.com/api/delivery-challans/', {
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
      <header className="bg-slate-50/50 border-b border-slate-200 px-6 lg:px-10 py-5 flex items-center rounded-t-xl gap-4">
        <button onClick={() => navigate('/delivery-challans')} className="p-2 hover:bg-slate-100 rounded-full transition-all">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">New Delivery Challan</h1>
      </header>

      <div className="p-6 lg:p-10 space-y-10">
        <section className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-12 gap-6 items-center bg-blue-50/30 p-4 rounded-lg border border-blue-100">
            <Label className="col-span-12 md:col-span-3 text-sm font-bold text-blue-700">Link with Invoice (Mirror)</Label>
            <div className="col-span-12 md:col-span-8">
              <Select onValueChange={mirrorInvoice}>
                <SelectTrigger className="h-11 border-blue-200 bg-white">
                  <SelectValue placeholder="Select an Invoice to copy items..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv, i) => (
                    <SelectItem key={i} value={inv.invoice_number}>{inv.invoice_number} - {inv.customer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-bold text-[#ef4444]">Customer Name *</Label>
            <div className="col-span-12 md:col-span-8">
              <Select value={formData.customer_name} onValueChange={handleCustomerChange}>
                <SelectTrigger className="h-11 border-slate-200 focus:ring-1 focus:ring-indigo-400">
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

          {formData.shipping_address && (
            <div className="grid grid-cols-12 gap-6 items-start">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-700 mt-2">Shipping Address</Label>
              <div className="col-span-12 md:col-span-8">
                <Textarea 
                  className="bg-white border-slate-200 resize-none h-24" 
                  value={formData.shipping_address} 
                  onChange={e => handleBaseChange('shipping_address', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6 items-center border-t border-slate-100 pt-6">
            <Label className="col-span-12 md:col-span-3 text-sm font-bold text-[#ef4444]">Delivery Challan# *</Label>
            <Input className="col-span-12 md:col-span-6 h-11 border-slate-200" value={formData.challan_number} onChange={e => handleBaseChange('challan_number', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-700">Reference#</Label>
            <Input className="col-span-12 md:col-span-6 h-11 border-slate-200" value={formData.reference_number} onChange={e => handleBaseChange('reference_number', e.target.value)} />
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
             <div className="col-span-12 md:col-span-3">
                <Label className="text-sm font-bold text-[#ef4444]">Challan Date *</Label>
             </div>
             <Input type="date" className="col-span-12 md:col-span-3 h-11 border-slate-200" value={formData.challan_date} onChange={e => handleBaseChange('challan_date', e.target.value)} />
             
             <div className="col-span-12 md:col-span-2 text-right px-2">
                <Label className="text-sm font-bold text-[#ef4444]">Type *</Label>
             </div>
             <div className="col-span-12 md:col-span-4">
              <Select value={formData.challan_type} onValueChange={(v) => handleBaseChange('challan_type', v)}>
                <SelectTrigger className="h-11 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Supply of Liquid Gas">Supply of Liquid Gas</SelectItem>
                  <SelectItem value="Job Work">Job Work</SelectItem>
                  <SelectItem value="Supply on Approval">Supply on Approval</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
             <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">2</span>
                Logistics & Delivery Details
             </h3>
             <div className="grid grid-cols-2 gap-6 ml-10">
                <div className="space-y-2">
                   <Label className="text-xs font-semibold text-slate-500 uppercase">Vehicle Number</Label>
                   <Input value={formData.vehicle_number} onChange={e => handleBaseChange('vehicle_number', e.target.value)} placeholder="TN-01-AB-1234" />
                </div>
                <div className="space-y-2">
                   <Label className="text-xs font-semibold text-slate-500 uppercase">Transporter Name</Label>
                   <Input value={formData.transporter_name} onChange={e => handleBaseChange('transporter_name', e.target.value)} placeholder="Speed Logistics" />
                </div>
                <div className="space-y-2">
                   <Label className="text-xs font-semibold text-slate-500 uppercase">Driver Name</Label>
                   <Input value={formData.driver_name} onChange={e => handleBaseChange('driver_name', e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                   <Label className="text-xs font-semibold text-slate-500 uppercase">Waybill / LR Number</Label>
                   <Input value={formData.waybill_number} onChange={e => handleBaseChange('waybill_number', e.target.value)} placeholder="LR-782293" />
                </div>
                <div className="space-y-2 col-span-12 md:col-span-2">
                   <Label className="text-xs font-semibold text-slate-500 uppercase">Dispatch Date & Time</Label>
                   <Input type="datetime-local" value={formData.dispatch_datetime} onChange={e => handleBaseChange('dispatch_datetime', e.target.value)} />
                </div>
             </div>
          </div>
        </section>

        <section className="pt-4 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-xs uppercase text-slate-500 font-bold bg-white">
                  <th className="p-3 w-5/12 text-[#ef4444]">Item Details *</th>
                  <th className="p-3 w-2/12 text-right">Quantity</th>
                  <th className="p-3 w-2/12 text-right">Rate</th>
                  <th className="p-3 w-2/12 text-right">Amount</th>
                  <th className="p-3 w-1/12"></th>
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
                    <td className="p-2 text-right font-medium text-slate-700">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeItemRow(index)} className="text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-md focus:outline-none transition-colors h-11 w-11 flex items-center justify-center min-h-[44px] min-w-[44px]"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" onClick={addItemRow} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              <PlusCircle size={16} className="mr-2" /> Add Another Line
            </Button>
          </div>
        </section>

        <section className="flex justify-between pt-8 gap-10">
           <div className="w-1/2 space-y-6">
             <div>
               <Label className="text-sm font-medium text-slate-700 mb-2 block">Customer Notes</Label>
               <Textarea className="h-20 bg-slate-50 border-slate-200" placeholder="Will be displayed on the challan" value={formData.notes} onChange={e => handleBaseChange('notes', e.target.value)} />
             </div>
             <div>
               <Label className="text-sm font-medium text-slate-700 mb-2 block">Terms & Conditions</Label>
               <Textarea className="h-20 bg-slate-50 border-slate-200" placeholder="Enter terms and conditions" value={formData.terms} onChange={e => handleBaseChange('terms', e.target.value)} />
             </div>
             
             {/* File Upload Visual Only */}
             <div>
               <Label className="text-sm font-medium text-slate-700 mb-2 block">Attach File(s)</Label>
               <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors">
                 <UploadCloud className="text-slate-400 mb-2" size={28} />
                 <span className="text-sm text-slate-500 font-medium">Click to upload or drag & drop</span>
                 <span className="text-xs text-slate-400 mt-1">Maximum file size: 5MB</span>
                 <input type="file" className="hidden" />
               </div>
             </div>
           </div>

          <div className="w-1/3 bg-slate-50/50 p-6 rounded-lg border border-slate-100 space-y-4">
            <div className="flex justify-between text-sm font-medium text-slate-600">
              <span>Sub Total</span>
              <span>₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center gap-2">
                 <span>Adjustment</span>
                 <Input type="number" className="w-24 h-8 text-right bg-white" value={adjustment} onChange={e => setAdjustment(e.target.value)} />
              </div>
              <span>₹{parseFloat(adjustment || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="pt-4 border-t border-slate-200 flex justify-between font-black text-xl text-slate-800">
              <span>Total ( ₹ )</span>
              <span>₹{totals.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits:2 })}</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-xl flex gap-4 shadow-sm">
        <Button className="bg-indigo-600 hover:bg-indigo-700 px-8 h-11 font-bold text-white shadow-md focus:ring-offset-2" onClick={() => handleSave("Open")}>
          Save as Open
        </Button>
        <Button variant="outline" className="px-6 h-11 border-slate-300 font-semibold text-slate-600 bg-white" onClick={() => handleSave("Draft")}>
          Save as Draft
        </Button>
        <Button variant="ghost" className="px-6 h-11 font-semibold text-slate-500 hover:text-slate-700" onClick={() => navigate('/delivery-challans')}>
          Cancel
        </Button>
      </footer>
    </div>
  );
}
