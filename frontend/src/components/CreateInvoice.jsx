import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, ExternalLink, PlusCircle, Trash2, Save, 
  Send, X, Building2, User, CreditCard, Calendar, 
  MapPin, Zap, RefreshCw, Calculator, FileText,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '../context/AuthContext';
import { API } from '../config';
import { toast } from 'react-hot-toast';
import { cn } from "@/lib/utils";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const [items, setItems] = useState([
    { id: 1, item_details: '', quantity: 1, rate: 0, discount_amount: 0, discount_type: 'amount', tax_type: 'GST18', amount: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { 'Authorization': `Bearer ${user.token}` };
        const custRes = await fetch(`${API}/admin/customers/active`, { headers });
        if (custRes.status === 401) throw new Error("Unauthorized");
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
        
        const prodRes = await fetch(`${API}/products`, { headers });
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);

        const invRes = await fetch(`${API}/invoices/next-number`, { headers });
        const invData = await invRes.json();
        if (invData.next_number) handleBaseChange('invoice_number', invData.next_number);

      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message === "Unauthorized" ? "Session expired." : "Failed to load data.");
        if (err.message === "Unauthorized") {
          toast.error("Session expired.");
          setTimeout(() => navigate('/login'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) fetchData();

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

  const handleBaseChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], [field]: value };
    if (field === 'item_details') {
      const selectedProduct = products.find(p => p.name === value);
      if (selectedProduct) item.rate = selectedProduct.price;
    }
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
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTaxAmount = 0;
    items.forEach(item => {
      subtotal += item.amount;
      const taxRate = item.tax_type === 'GST12' ? 0.12 : 0.18;
      totalTaxAmount += item.amount * taxRate;
    });
    let cgst = 0, sgst = 0, igst = 0;
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
        user_id: formData.user_id ? parseInt(formData.user_id) : null,
        order_id: formData.order_id ? parseInt(formData.order_id) : null
      };
      const response = await fetch(`${API}/invoices/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        toast.success(`Invoice ${status === 'Draft' ? 'saved as draft' : 'finalized'}!`);
        navigate('/invoices');
      } else {
        const err = await response.json();
        toast.error('Failed to save: ' + err.detail);
      }
    } catch (error) {
      toast.error('Network Error');
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4 animate-pulse">
        <RefreshCw size={64} className="animate-spin text-indigo-500 opacity-30" />
        <p className="font-black text-xs uppercase tracking-widest text-slate-400">Loading Billing Engine...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-24 px-4">
      
      {/* Header Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/invoices')}
            className="rounded-lg h-8 w-8 border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">New Financial Invoice</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="rounded-md font-bold text-[10px] uppercase tracking-widest bg-slate-50">
                 System Managed Registry
              </Badge>
              {formData.order_id && (
                <Badge className="bg-emerald-600 text-white border-none text-[10px] px-2 py-0 font-bold">
                  Derived from Order #{formData.order_id}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" className="text-indigo-600 font-bold text-xs uppercase tracking-widest gap-2 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg px-4 h-8">
          <Calculator size={14} /> Tax Calculation Active <ExternalLink size={12} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-xl border-slate-200 shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-md"><User size={14} /></div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight">Entity Information</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400">Map the financial identity of the business entity.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Business Entity / Customer *</Label>
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
                      <SelectTrigger className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/30 focus:bg-white transition-all">
                        <SelectValue placeholder="Select Account Entity" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-xl p-1 border-slate-200">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()} className="rounded-md font-medium p-2 text-xs">
                             {c.full_name || 'Unnamed'} <span className="text-[9px] text-slate-400 ml-1">(@{c.email})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tax Jurisdiction (Place of Supply)</Label>
                    <Select value={formData.place_of_supply} onValueChange={(v) => handleBaseChange('place_of_supply', v)}>
                      <SelectTrigger className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/30 focus:bg-white transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="Tamil Nadu">Tamil Nadu (Base)</SelectItem>
                        <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Karnataka">Karnataka</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.account_type === 'enterprise' && (
                    <div className="col-span-full bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-indigo-700">{formData.customer_company_name}</p>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">GSTIN: {formData.customer_gst_no}</p>
                          </div>
                       </div>
                       <Badge className="bg-indigo-600 text-white border-none uppercase text-[8px] font-bold px-2 py-0.5 rounded-md">Enterprise Account</Badge>
                    </div>
                  )}
               </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 flex flex-row items-center justify-between space-y-0">
               <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-md"><FileText size={14} /></div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-tight">Line Items</CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400">Add SKUs and apply line-level discounts.</CardDescription>
                </div>
              </div>
              <Button onClick={addItemRow} variant="outline" className="rounded-lg border-indigo-200 text-indigo-600 font-bold text-[10px] uppercase tracking-widest h-8 px-3">
                 <Plus size={14} className="mr-1" /> Add SKU
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Inventory SKU *</TableHead>
                    <TableHead className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">QTY</TableHead>
                    <TableHead className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Rate (₹)</TableHead>
                    <TableHead className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Discount</TableHead>
                    <TableHead className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 w-24">Net Total</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} className="border-b border-slate-50 last:border-0 group">
                      <TableCell className="px-4 py-2">
                        <Select value={item.item_details} onValueChange={(v) => handleItemChange(index, 'item_details', v)}>
                          <SelectTrigger className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/30 group-hover:bg-white transition-all text-xs">
                             <SelectValue placeholder="Select Product SKU..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            {products.map(p => (
                              <SelectItem key={p.product_id} value={p.name} className="font-medium rounded-md text-xs">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                         <Input type="number" min="1" className="h-8 rounded-lg border-slate-200 text-right font-medium bg-slate-50/30 group-hover:bg-white transition-all text-xs" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                         <Input type="number" className="h-8 rounded-lg border-slate-200 text-right font-medium bg-slate-50/30 group-hover:bg-white transition-all text-xs" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                         <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                           <Input type="number" className="h-7 border-0 bg-transparent text-right font-medium text-xs focus-visible:ring-0" value={item.discount_amount} onChange={(e) => handleItemChange(index, 'discount_amount', e.target.value)} />
                           <Select value={item.discount_type} onValueChange={(v) => handleItemChange(index, 'discount_type', v)}>
                             <SelectTrigger className="h-7 w-12 rounded-md border-0 shadow-none font-bold text-[10px] bg-white"><SelectValue /></SelectTrigger>
                             <SelectContent className="rounded-md"><SelectItem value="percentage">%</SelectItem><SelectItem value="amount">₹</SelectItem></SelectContent>
                           </Select>
                         </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                         <p className="font-bold text-slate-800 tracking-tight text-xs">
                           ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                         </p>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center">
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeItemRow(index)} 
                          className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md h-7 w-7"
                          disabled={items.length === 1}
                         >
                           <Trash2 size={14} />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info & Totals */}
        <div className="space-y-4">
           <Card className="rounded-xl border-slate-200 shadow-md overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-md"><Calendar size={14} /></div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Timeline & Ref</h3>
                </div>
             </CardHeader>
             <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice Reference ID *</Label>
                  <Input className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/50 text-xs" value={formData.invoice_number} onChange={e => handleBaseChange('invoice_number', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Accounting Reference</Label>
                  <Input className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/50 text-xs" value={formData.reference_number} placeholder="PO# or Order Mapping" onChange={e => handleBaseChange('reference_number', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                   <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Issue Date</Label>
                      <Input type="date" className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/50 text-xs" value={formData.invoice_date} onChange={e => handleBaseChange('invoice_date', e.target.value)} />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Due Date</Label>
                      <Input type="date" className="h-8 rounded-lg border-slate-200 font-medium bg-slate-50/50 text-rose-600 text-xs" value={formData.due_date} onChange={e => handleBaseChange('due_date', e.target.value)} />
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="rounded-xl border-slate-900 bg-slate-900 text-white shadow-xl shadow-indigo-100 overflow-hidden">
              <CardHeader className="p-4 border-b border-white/10">
                 <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-indigo-500 text-white rounded-md"><Calculator size={14} /></div>
                   <h3 className="text-xs font-bold uppercase tracking-widest">Billing Summary</h3>
                 </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-white/60 text-xs">
                       <span className="text-[10px] font-bold uppercase tracking-widest">Sub Total</span>
                       <span className="font-medium">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {(formData.account_type === 'enterprise' || formData.place_of_supply === 'Tamil Nadu') ? (
                      <>
                        <div className="flex justify-between items-center text-white/60 text-xs">
                           <span className="text-[10px] font-bold uppercase tracking-widest">Central GST (9%)</span>
                           <span className="font-medium">₹{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/60 text-xs">
                           <span className="text-[10px] font-bold uppercase tracking-widest">State GST (9%)</span>
                           <span className="font-medium">₹{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-white/60 text-xs">
                         <span className="text-[10px] font-bold uppercase tracking-widest">Integrated GST (18%)</span>
                         <span className="font-medium">₹{totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                 </div>

                 <div className="pt-3 border-t border-white/10 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Grand Ledger Total</span>
                    <div className="text-2xl font-black tracking-tighter">
                       ₹{totals.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                 </div>

                 <div className="pt-2 flex flex-col gap-2">
                    <Button 
                      className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold h-9 rounded-lg shadow-md shadow-indigo-500/20 gap-2 text-xs"
                      onClick={() => handleSave("Sent")}
                    >
                      <Send size={14} /> Save & Transmit
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-white/70 hover:text-white hover:bg-white/10 font-medium h-8 rounded-md text-xs"
                      onClick={() => handleSave("Draft")}
                    >
                      <Save size={14} className="mr-2" /> Save to Drafts
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
