import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API } from '../config';
import { 
  ChevronLeft, Mail, Phone, Notebook, Plus, Copy, 
  Trash2, PlusCircle, Upload, ExternalLink, Building2,
  User, CreditCard, Globe, Landmark, MapPin, Info,
  Save, X, CheckCircle2, AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function CreateCustomer() {
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const [isEditMode, setIsEditMode] = useState(!!id);
  const [activeTab, setActiveTab] = useState('otherdetails');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    customer_type: 'Individual', salutation: 'Mr.', first_name: '', last_name: '',
    company_name: '', display_name: '', currency: 'INR', email: '', phone_work: '', phone_mobile: '',
    gst_treatment: 'Unregistered Business', place_of_supply: 'Tamil Nadu', pan: '', tax_preference: 'Taxable', payment_terms: 'Due on Receipt',
    billing_attention: '', billing_address_1: '', billing_address_2: '', billing_city: '', billing_state: '', billing_pincode: '', billing_phone: '', billing_fax: '',
    shipping_attention: '', shipping_address_1: '', shipping_address_2: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
    contact_persons: [{ salutation: 'Mr.', first: '', last: '', email: '', work: '', mobile: '' }]
  });

  useEffect(() => {
    if (id) {
       // Fetch existing customer if editing
       const fetchCustomer = async () => {
         try {
           const res = await fetch(`${API}/customers/${id}`);
           if (res.ok) {
             const data = await res.json();
             setFormData(data);
             setIsEditMode(true);
           }
         } catch (err) {
           console.error("Fetch Error:", err);
         }
       };
       fetchCustomer();
    }
  }, [id]);

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
    setIsSaving(true);
    try {
      const url = isEditMode ? `${API}/customers/${id}` : `${API}/customers/`;
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setSuccessMsg(`Successfully ${isEditMode ? 'updated' : 'created'} customer profile!`);
        setTimeout(() => navigate('/customers'), 2000);
      } else {
        const err = await response.json();
        alert('Action failed: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Network error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-20">
      
      {/* Status Notifications */}
      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce font-black">
          <CheckCircle2 size={24} />
          {successMsg}
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/customers')}
            className="rounded-lg h-8 w-8 border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <ChevronLeft size={16} className="text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">{isEditMode ? 'Edit Customer' : 'Onboard New Customer'}</h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Populate the billing, shipping and contact mapping for this entity.</p>
          </div>
        </div>
        <Button variant="ghost" className="text-indigo-600 font-bold text-xs uppercase tracking-widest gap-2 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg px-4 h-8">
          <Landmark size={14} /> Fetch GSTN Data <ExternalLink size={12} />
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Core Info Section */}
        <div className="p-6 space-y-6">
          
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 bg-indigo-600 rounded-full" />
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Business Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              
              {/* Customer Type Toggle */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center gap-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 w-32">Classification</Label>
                <div className="flex gap-2 p-0.5 bg-slate-100 rounded-lg w-fit">
                  {['Business', 'Individual'].map(type => (
                    <button
                      key={type}
                      onClick={() => updateField('customer_type', type)}
                      className={cn(
                        "px-4 py-1 rounded-md text-[11px] font-bold transition-all",
                        formData.customer_type === type 
                          ? "bg-white text-indigo-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Contact Name */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Primary Contact</Label>
                <div className="flex flex-col md:flex-row gap-2">
                  <Select value={formData.salutation} onValueChange={(v) => updateField('salutation', v)}>
                    <SelectTrigger className="w-full md:w-24 border-slate-200 font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr.">Mr.</SelectItem>
                      <SelectItem value="Mrs.">Mrs.</SelectItem>
                      <SelectItem value="Ms.">Ms.</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="flex-1 border-slate-200 font-medium px-3 bg-slate-50/30 focus:bg-white" placeholder="First Name" value={formData.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
                  <Input className="flex-1 border-slate-200 font-medium px-3 bg-slate-50/30 focus:bg-white" placeholder="Last Name" value={formData.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
                </div>
              </div>

              {/* Corporate Mapping */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Organization / Company</Label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <Input className="border-slate-200 font-medium pl-8 bg-slate-50/30 focus:bg-white" placeholder="Acme Corp" value={formData.company_name} onChange={(e) => updateField('company_name', e.target.value)} />
                </div>
              </div>

              {/* Display Branding */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Display Name *</Label>
                <Input 
                  className="border-rose-200 bg-rose-50/10 focus-visible:ring-rose-500 font-bold px-3" 
                  placeholder="Invoice Display Name"
                  value={formData.display_name} 
                  onChange={(e) => updateField('display_name', e.target.value)} 
                />
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-2"><hr className="border-slate-100" /></div>

              {/* Contact Grid */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Communication Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input className="border-slate-200 font-medium pl-8 bg-slate-50/30 focus:bg-white text-xs" placeholder="Work Email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input className="border-slate-200 font-medium pl-8 bg-slate-50/30 focus:bg-white text-xs" placeholder="Work Phone" value={formData.phone_work} onChange={(e) => updateField('phone_work', e.target.value)} />
                  </div>
                  <div className="relative">
                    <Notebook className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input className="border-slate-200 font-medium pl-8 bg-slate-50/30 focus:bg-white text-xs" placeholder="Mobile Number" value={formData.phone_mobile} onChange={(e) => updateField('phone_mobile', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Deep Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-4">
              <TabsList className="bg-slate-100 p-1 rounded-lg h-auto flex flex-wrap lg:flex-nowrap">
                {[
                  { id: 'otherdetails', icon: Info, label: 'Other Details' },
                  { id: 'address', icon: MapPin, label: 'Addresses' },
                  { id: 'contactpersons', icon: User, label: 'Contact Persons' },
                  { id: 'customfields', icon: Plus, label: 'Custom Attributes' },
                  { id: 'remarks', icon: Notebook, label: 'Internal Remarks' }
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="flex-1 rounded-md h-8 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold text-[10px] uppercase tracking-widest gap-2"
                  >
                    <tab.icon size={12} /> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* --- Other Details Tab --- */}
            <TabsContent value="otherdetails" className="space-y-4 animate-in fade-in duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">GST Treatment *</Label>
                    <Select value={formData.gst_treatment} onValueChange={(v) => updateField('gst_treatment', v)}>
                      <SelectTrigger className="border-slate-200 font-medium bg-white shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Registered Business">Registered Business</SelectItem>
                        <SelectItem value="Unregistered Business">Unregistered Business</SelectItem>
                        <SelectItem value="Consumer">Consumer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Place of Supply *</Label>
                    <Select value={formData.place_of_supply} onValueChange={(v) => updateField('place_of_supply', v)}>
                      <SelectTrigger className="border-slate-200 font-medium bg-white shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {['Tamil Nadu', 'Maharashtra', 'Delhi', 'Karnataka', 'Telangana'].map(st => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PAN</Label>
                    <Input className="border-slate-200 font-mono text-xs uppercase tracking-widest bg-white shadow-sm" placeholder="ABCDE1234F" value={formData.pan} onChange={(e) => updateField('pan', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Terms</Label>
                    <Select value={formData.payment_terms} onValueChange={(v) => updateField('payment_terms', v)}>
                      <SelectTrigger className="border-slate-200 font-medium bg-white shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
               </div>
            </TabsContent>

            {/* --- Address Tab --- */}
            <TabsContent value="address" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-8 duration-300">
               {/* Billing Address */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><MapPin size={14} /></div>
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Billing Infrastructure</h3>
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Attention To" className="h-7 rounded-md" value={formData.billing_attention} onChange={(e) => updateField('billing_attention', e.target.value)} />
                    <Textarea placeholder="Address Line 1 (Building, Street)" className="min-h-[60px] rounded-md" value={formData.billing_address_1} onChange={(e) => updateField('billing_address_1', e.target.value)} />
                    <Input placeholder="Address Line 2 (Landmark, Area)" className="h-7 rounded-md" value={formData.billing_address_2} onChange={(e) => updateField('billing_address_2', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="City" className="h-7 rounded-md" value={formData.billing_city} onChange={(e) => updateField('billing_city', e.target.value)} />
                      <Input placeholder="State" className="h-7 rounded-md" value={formData.billing_state} onChange={(e) => updateField('billing_state', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Pin Code" className="h-7 rounded-md font-mono" value={formData.billing_pincode} onChange={(e) => updateField('billing_pincode', e.target.value)} />
                      <Input placeholder="Phone Mapping" className="h-7 rounded-md" value={formData.billing_phone} onChange={(e) => updateField('billing_phone', e.target.value)} />
                    </div>
                  </div>
               </div>

               {/* Shipping Address */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md"><Globe size={14} /></div>
                      <h3 className="font-bold text-slate-700 uppercase tracking-widest text-[10px]">Shipping Location</h3>
                    </div>
                    <button type="button" onClick={copyBillingToShipping} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded-md transition-all">
                      <Copy size={12} /> Sync Billing
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Attention To" className="h-7 rounded-md" value={formData.shipping_attention} onChange={(e) => updateField('shipping_attention', e.target.value)} />
                    <Textarea placeholder="Address Line 1" className="min-h-[60px] rounded-md" value={formData.shipping_address_1} onChange={(e) => updateField('shipping_address_1', e.target.value)} />
                    <Input placeholder="Address Line 2" className="h-7 rounded-md" value={formData.shipping_address_2} onChange={(e) => updateField('shipping_address_2', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="City" className="h-7 rounded-md" value={formData.shipping_city} onChange={(e) => updateField('shipping_city', e.target.value)} />
                      <Input placeholder="State" className="h-7 rounded-md" value={formData.shipping_state} onChange={(e) => updateField('shipping_state', e.target.value)} />
                    </div>
                    <Input placeholder="Pin Code" className="h-7 rounded-md font-mono" value={formData.shipping_pincode} onChange={(e) => updateField('shipping_pincode', e.target.value)} />
                  </div>
               </div>
            </TabsContent>

            {/* --- Contact Persons Tab --- */}
            <TabsContent value="contactpersons" className="animate-in fade-in duration-300">
               <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Salutation</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Full Identity</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest px-4 py-2">Communication</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.contact_persons.map((person, idx) => (
                        <TableRow key={idx} className="border-b border-slate-100 last:border-0">
                          <TableCell className="px-4 py-2">
                            <Select value={person.salutation} onValueChange={(v) => {
                              const updated = [...formData.contact_persons];
                              updated[idx].salutation = v;
                              updateField('contact_persons', updated);
                            }}>
                              <SelectTrigger className="h-7 w-20 rounded-md"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="Mr.">Mr.</SelectItem><SelectItem value="Mrs.">Mrs.</SelectItem></SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-4 py-2">
                             <div className="flex gap-2">
                               <Input className="h-7 rounded-md w-24" placeholder="First" value={person.first} onChange={(e) => {
                                 const updated = [...formData.contact_persons];
                                 updated[idx].first = e.target.value;
                                 updateField('contact_persons', updated);
                               }} />
                               <Input className="h-7 rounded-md w-24" placeholder="Last" value={person.last} onChange={(e) => {
                                 const updated = [...formData.contact_persons];
                                 updated[idx].last = e.target.value;
                                 updateField('contact_persons', updated);
                               }} />
                             </div>
                          </TableCell>
                          <TableCell className="px-4 py-2">
                             <div className="space-y-1">
                               <Input className="h-7 rounded-md text-xs" placeholder="Email" value={person.email} onChange={(e) => {
                                 const updated = [...formData.contact_persons];
                                 updated[idx].email = e.target.value;
                                 updateField('contact_persons', updated);
                               }} />
                               <div className="flex gap-2">
                                 <Input className="h-7 rounded-md text-xs w-24" placeholder="Work" value={person.work} onChange={(e) => {
                                   const updated = [...formData.contact_persons];
                                   updated[idx].work = e.target.value;
                                   updateField('contact_persons', updated);
                                 }} />
                                 <Input className="h-7 rounded-md text-xs w-24" placeholder="Mobile" value={person.mobile} onChange={(e) => {
                                   const updated = [...formData.contact_persons];
                                   updated[idx].mobile = e.target.value;
                                   updateField('contact_persons', updated);
                                 }} />
                               </div>
                             </div>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-center">
                            {formData.contact_persons.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeContactPerson(idx)} 
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-7 w-7 rounded-md"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>
               <Button onClick={addContactPerson} variant="outline" className="rounded-md h-8 px-4 font-bold text-[10px] uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50 border-dashed border-2">
                 <PlusCircle size={14} className="mr-2" /> Add Contact Person
               </Button>
            </TabsContent>

            {/* --- Remarks Tab --- */}
            <TabsContent value="remarks" className="animate-in fade-in duration-300">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Internal Repository Remarks</Label>
                  <Textarea 
                    className="min-h-[100px] rounded-lg bg-slate-50/50 border-slate-200 p-4 font-medium focus:bg-white transition-all text-sm" 
                    placeholder="Log internal notes, specialized requirements, or historical context here..." 
                  />
               </div>
            </TabsContent>
          </Tabs>

        </div>

        {/* Form Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col md:flex-row items-center justify-end gap-3 rounded-b-xl">
          <Button 
            variant="outline" 
            className="w-full md:w-auto px-6 h-8 rounded-lg font-bold text-slate-500 border-slate-200"
            onClick={() => navigate('/customers')}
          >
            Discard Changes
          </Button>
          <Button 
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 px-6 h-8 rounded-lg font-bold text-white shadow-md shadow-indigo-100 flex items-center gap-2" 
            onClick={handleSaveCustomer}
            disabled={isSaving}
          >
            {isSaving ? (
               <CheckCircle2 size={16} className="animate-spin" />
            ) : (
               <Save size={16} />
            )}
            {isEditMode ? 'Commit Entity Updates' : 'Initialize Business Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}