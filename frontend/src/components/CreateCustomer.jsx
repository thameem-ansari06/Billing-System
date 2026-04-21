import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Mail, Phone, Notebook, Plus, Copy, 
  Trash2, PlusCircle, Upload, ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from "@/components/ui/checkbox";

export default function CreateCustomer() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('otherdetails');

  const [formData, setFormData] = useState({
    customer_type: 'Individual', salutation: 'Mr.', first_name: '', last_name: '',
    company_name: '', display_name: '', currency: 'INR', email: '', phone_work: '', phone_mobile: '',
    gst_treatment: 'Unregistered Business', place_of_supply: 'Tamil Nadu', pan: '', tax_preference: 'Taxable', payment_terms: 'Due on Receipt',
    billing_attention: '', billing_address_1: '', billing_address_2: '', billing_city: '', billing_state: '', billing_pincode: '', billing_phone: '', billing_fax: '',
    shipping_attention: '', shipping_address_1: '', shipping_address_2: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
    contact_persons: [{ salutation: 'Mr.', first: '', last: '', email: '', work: '', mobile: '' }]
  });

  const updateField = (field, value) => setFormData({ ...formData, [field]: value });

  const addContactPerson = () => {
    setFormData({
      ...formData,
      contact_persons: [...formData.contact_persons, { salutation: 'Mr.', first: '', last: '', email: '', work: '', mobile: '' }]
    });
  };

  const removeContactPerson = (index) => {
    const updated = formData.contact_persons.filter((_, i) => i !== index);
    setFormData({ ...formData, contact_persons: updated });
  };

  // Helper to copy billing address to shipping
  const copyBillingToShipping = () => {
    setFormData({
      ...formData,
      shipping_attention: formData.billing_attention,
      shipping_address_1: formData.billing_address_1,
      shipping_address_2: formData.billing_address_2,
      shipping_city: formData.billing_city,
      shipping_state: formData.billing_state,
      shipping_pincode: formData.billing_pincode,
    });
  };

  const handleSaveCustomer = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/customers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        navigate('/customers');
      } else {
        const err = await response.json();
        alert('Failed to save customer: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Error saving customer');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      
      {/* Header */}
      <header className="bg-slate-50/50 border-b border-slate-200 px-6 lg:px-10 py-5 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/customers')} className="p-2 hover:bg-slate-50 rounded-full transition-all">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-800">New Customer</h1>
          <button className="text-blue-600 text-sm font-semibold ml-4 hover:underline flex items-center gap-2">
            Fetch Customer Details From GSTN <ExternalLink size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 lg:p-10 space-y-10">
          
          {/* ===== CUSTOMER INFO SECTION (all original fields) ===== */}
          <section className="space-y-6">
            {/* Customer Type */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Customer Type</Label>
              <div className="col-span-12 md:col-span-9 flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.customer_type === 'Business'} onChange={() => updateField('customer_type', 'Business')} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-slate-700">Business</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.customer_type === 'Individual'} onChange={() => updateField('customer_type', 'Individual')} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-slate-700">Individual</span>
                </label>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="grid grid-cols-12 gap-4 items-start">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600 pt-2">Primary Contact</Label>
              <div className="col-span-12 md:col-span-9 grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                  <Select value={formData.salutation} onValueChange={(v) => updateField('salutation', v)}>
                    <SelectTrigger className="w-full h-11 border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Mr.">Mr.</SelectItem><SelectItem value="Mrs.">Mrs.</SelectItem></SelectContent>
                  </Select>
                </div>
                <Input className="col-span-12 md:col-span-4 h-11 border-slate-200" placeholder="First Name" value={formData.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
                <Input className="col-span-5 h-11 border-slate-200" placeholder="Last Name" value={formData.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
              </div>
            </div>

            {/* Company Name */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Company Name</Label>
              <Input className="col-span-12 md:col-span-9 h-11 border-slate-200" value={formData.company_name} onChange={(e) => updateField('company_name', e.target.value)} />
            </div>

            {/* Display Name */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <Label className="col-span-12 md:col-span-3 text-sm font-bold text-red-600">Customer Display Name *</Label>
              <Input className="col-span-12 md:col-span-9 h-11 border-red-100 bg-red-50/10 focus-visible:ring-red-400" value={formData.display_name} onChange={(e) => updateField('display_name', e.target.value)} />
            </div>

            {/* Currency */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Currency</Label>
              <div className="col-span-12 md:col-span-9">
                <Input className="h-11 border-slate-200 bg-slate-50" value="Indian Rupee" disabled />
                <p className="text-xs text-slate-400 mt-1">Currency cannot be edited as multi-currency handling is unavailable in Zoho Invoice.</p>
              </div>
            </div>

            {/* Email Address */}
            <div className="grid grid-cols-12 gap-4 items-center">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Email Address</Label>
              <div className="col-span-12 md:col-span-9 relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <Input className="pl-10 h-11 border-slate-200" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
              </div>
            </div>

            {/* Customer Phone (Work + Mobile) */}
            <div className="grid grid-cols-12 gap-4 items-start">
              <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600 pt-2">Customer Phone</Label>
              <div className="col-span-12 md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                  <Input className="pl-10 h-11 border-slate-200" placeholder="Work Phone" value={formData.phone_work} onChange={(e) => updateField('phone_work', e.target.value)} />
                </div>
                <div className="relative">
                  <Notebook className="absolute left-3 top-3 text-slate-400" size={18} />
                  <Input className="pl-10 h-11 border-slate-200" placeholder="Mobile" value={formData.phone_mobile} onChange={(e) => updateField('phone_mobile', e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* ===== TABS SECTION ===== */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-200 bg-white pb-2">
              <TabsList className="bg-transparent h-auto p-0 justify-start gap-8 lg:gap-12">
                {['Other Details', 'Address', 'Contact Persons', 'Custom Fields', 'Remarks'].map(tab => (
                  <TabsTrigger 
                    key={tab} 
                    value={tab.toLowerCase().replace(/ /g, '')} 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-3 px-1 font-semibold text-sm text-slate-500 data-[state=active]:text-blue-600"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* --- Other Details Tab --- */}
            <TabsContent value="otherdetails" className="pt-8 space-y-6 animate-in fade-in">
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-bold text-red-600">GST Treatment *</Label>
                <div className="col-span-12 md:col-span-6 lg:col-span-5">
                  <Select value={formData.gst_treatment} onValueChange={(v) => updateField('gst_treatment', v)}>
                    <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Registered Business">Registered Business</SelectItem>
                      <SelectItem value="Unregistered Business">Unregistered Business</SelectItem>
                      <SelectItem value="Consumer">Consumer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Place of Supply *</Label>
                <div className="col-span-12 md:col-span-6 lg:col-span-5">
                  <Select value={formData.place_of_supply} onValueChange={(v) => updateField('place_of_supply', v)}>
                    <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="Delhi">Delhi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">PAN</Label>
                <Input className="col-span-12 md:col-span-6 lg:col-span-5 h-11 font-mono uppercase" placeholder="ABCDE1234F" value={formData.pan} onChange={(e) => updateField('pan', e.target.value)} />
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Tax Preference *</Label>
                <div className="col-span-12 md:col-span-9 flex gap-6">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={formData.tax_preference === 'Taxable'} onChange={() => updateField('tax_preference', 'Taxable')} className="w-4 h-4" /> Taxable
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={formData.tax_preference === 'Tax Exempt'} onChange={() => updateField('tax_preference', 'Tax Exempt')} className="w-4 h-4" /> Tax Exempt
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Payment Terms</Label>
                <div className="col-span-12 md:col-span-6 lg:col-span-5">
                  <Select value={formData.payment_terms} onValueChange={(v) => updateField('payment_terms', v)}>
                    <SelectTrigger className="w-full h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Price List</Label>
                <Input className="col-span-12 md:col-span-6 lg:col-span-5 h-11" placeholder="Select price list" />
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Enable Portal?</Label>
                <div className="col-span-12 md:col-span-9 flex items-center gap-2">
                  <Checkbox checked={false} onCheckedChange={() => {}} />
                  <span className="text-sm text-slate-600">Allow portal access for this customer</span>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Portal Language</Label>
                <Select defaultValue="English">
                  <SelectTrigger className="col-span-12 md:col-span-6 lg:col-span-5 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-12 gap-4 items-start">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Documents</Label>
                <div className="col-span-12 md:col-span-9 space-y-2">
                  <Button variant="outline" className="gap-2"><Upload size={16} /> Upload File</Button>
                  <p className="text-xs text-slate-400">You can upload a maximum of 3 files, 10MB each</p>
                  <a href="#" className="text-blue-600 text-sm">Add more details</a>
                </div>
              </div>
            </TabsContent>

            {/* --- Address Tab --- */}
            <TabsContent value="address" className="pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-in slide-in-from-right-8">
              {/* Billing Address */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">Billing Address</h3>
                <Input placeholder="Attention" className="h-11" value={formData.billing_attention} onChange={(e) => updateField('billing_attention', e.target.value)} />
                <Textarea placeholder="Street 1" className="min-h-[80px]" value={formData.billing_address_1} onChange={(e) => updateField('billing_address_1', e.target.value)} />
                <Input placeholder="Street 2" className="h-11" value={formData.billing_address_2} onChange={(e) => updateField('billing_address_2', e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="City" value={formData.billing_city} onChange={(e) => updateField('billing_city', e.target.value)} />
                  <Input placeholder="State" value={formData.billing_state} onChange={(e) => updateField('billing_state', e.target.value)} />
                </div>
                <Input placeholder="Pin Code" value={formData.billing_pincode} onChange={(e) => updateField('billing_pincode', e.target.value)} />
                <Input placeholder="Phone" value={formData.billing_phone} onChange={(e) => updateField('billing_phone', e.target.value)} />
                <Input placeholder="Fax Number" value={formData.billing_fax} onChange={(e) => updateField('billing_fax', e.target.value)} />
              </div>

              {/* Shipping Address */}
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Shipping Address</h3>
                  <button type="button" onClick={copyBillingToShipping} className="text-blue-600 text-xs font-semibold flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">
                    <Copy size={14} /> Copy billing address
                  </button>
                </div>
                <Input placeholder="Attention" className="h-11" value={formData.shipping_attention} onChange={(e) => updateField('shipping_attention', e.target.value)} />
                <Textarea placeholder="Street 1" className="min-h-[80px]" value={formData.shipping_address_1} onChange={(e) => updateField('shipping_address_1', e.target.value)} />
                <Input placeholder="Street 2" className="h-11" value={formData.shipping_address_2} onChange={(e) => updateField('shipping_address_2', e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="City" value={formData.shipping_city} onChange={(e) => updateField('shipping_city', e.target.value)} />
                  <Input placeholder="State" value={formData.shipping_state} onChange={(e) => updateField('shipping_state', e.target.value)} />
                </div>
                <Input placeholder="Pin Code" value={formData.shipping_pincode} onChange={(e) => updateField('shipping_pincode', e.target.value)} />
              </div>
            </TabsContent>

            {/* --- Contact Persons Tab --- */}
            <TabsContent value="contactpersons" className="pt-8 animate-in fade-in">
              <div className="border rounded-md overflow-hidden border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      {['Salutation', 'First Name', 'Last Name', 'Email Address', 'Work Phone', 'Mobile', ''].map((h, i) => (
                        <TableHead key={i} className="text-xs font-bold text-slate-500 uppercase py-3 border-r border-slate-200 last:border-r-0">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.contact_persons.map((person, idx) => (
                      <TableRow key={idx} className="border-b border-slate-200">
                        <TableCell className="p-0 border-r border-slate-200">
                          <Select value={person.salutation} onValueChange={(v) => {
                            const updated = [...formData.contact_persons];
                            updated[idx].salutation = v;
                            updateField('contact_persons', updated);
                          }}>
                            <SelectTrigger className="border-0 shadow-none rounded-none h-14 px-4"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Mr.">Mr.</SelectItem><SelectItem value="Mrs.">Mrs.</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-200">
                          <Input className="border-0 shadow-none rounded-none h-14 px-4" placeholder="First Name" value={person.first} onChange={(e) => {
                            const updated = [...formData.contact_persons];
                            updated[idx].first = e.target.value;
                            updateField('contact_persons', updated);
                          }} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-200">
                          <Input className="border-0 shadow-none rounded-none h-14 px-4" placeholder="Last Name" value={person.last} onChange={(e) => {
                            const updated = [...formData.contact_persons];
                            updated[idx].last = e.target.value;
                            updateField('contact_persons', updated);
                          }} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-200">
                          <Input className="border-0 shadow-none rounded-none h-14 px-4" placeholder="Email" value={person.email} onChange={(e) => {
                            const updated = [...formData.contact_persons];
                            updated[idx].email = e.target.value;
                            updateField('contact_persons', updated);
                          }} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-200">
                          <Input className="border-0 shadow-none rounded-none h-14 px-4" placeholder="Work Phone" value={person.work} onChange={(e) => {
                            const updated = [...formData.contact_persons];
                            updated[idx].work = e.target.value;
                            updateField('contact_persons', updated);
                          }} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-200">
                          <Input className="border-0 shadow-none rounded-none h-14 px-4" placeholder="Mobile" value={person.mobile} onChange={(e) => {
                            const updated = [...formData.contact_persons];
                            updated[idx].mobile = e.target.value;
                            updateField('contact_persons', updated);
                          }} />
                        </TableCell>
                        <TableCell className="p-0 text-center w-12">
                          {formData.contact_persons.length > 1 && (
                            <button onClick={() => removeContactPerson(idx)} className="text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-md focus:outline-none transition-colors h-11 w-11 flex items-center justify-center min-h-[44px] min-w-[44px]"><Trash2 size={16} /></button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6">
                <button onClick={addContactPerson} className="text-blue-600 font-semibold text-sm flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-lg">
                  <PlusCircle size={18} className="fill-blue-600 text-white" /> Add Contact Person
                </button>
              </div>
            </TabsContent>

            {/* --- Custom Fields Tab --- */}
            <TabsContent value="customfields" className="pt-8 animate-in fade-in">
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Custom Fields</Label>
                  <div className="col-span-12 md:col-span-9">
                    <Button variant="outline" className="gap-2" onClick={() => {}}><Plus size={16} /> Add Custom Field</Button>
                  </div>
                </div>
                {/* Example custom field rows - you can expand this dynamically */}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-3"></div>
                  <div className="col-span-12 md:col-span-9 text-sm text-slate-400">No custom fields added yet.</div>
                </div>
              </div>
            </TabsContent>

            {/* --- Remarks Tab --- */}
            <TabsContent value="remarks" className="pt-8 animate-in fade-in">
              <div className="grid grid-cols-12 gap-4">
                <Label className="col-span-12 md:col-span-3 text-sm font-medium text-slate-600">Remarks</Label>
                <Textarea className="col-span-12 md:col-span-9 min-h-[150px]" placeholder="Add any remarks here..." />
              </div>
            </TabsContent>
          </Tabs>

      </div>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-xl flex justify-end gap-4">
        <Button className="bg-blue-600 hover:bg-blue-700 px-8 h-11 font-semibold text-white shadow-sm" onClick={handleSaveCustomer}>Save Customer</Button>
        <Button variant="outline" className="px-8 h-11 border-slate-300 font-semibold text-slate-600" onClick={() => navigate('/customers')}>Cancel</Button>
      </footer>
    </div>
  );
}