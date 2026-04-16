import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, HelpCircle, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateItem() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'Goods',
    name: '',
    unit: '',
    tax_preference: 'Taxable',
    selling_price: '',
    description: '',
    intra_state_tax: 'GST12 (12 %)',
    inter_state_tax: 'IGST12 (12 %)'
  });

  const updateField = (field, value) => setFormData({ ...formData, [field]: value });

  const handleSaveItem = async () => {
    try {
      const payload = {
        name: formData.name,
        price: parseFloat(formData.selling_price) || 0
      };

      const response = await fetch('http://localhost:8000/api/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        navigate('/inventory');
      } else {
        const err = await response.json();
        alert('Failed to save item: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Error saving item');
    }
  };

  return (
    <div className="bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200">
      
      {/* 1. HEADER */}
      <header className="bg-slate-50/50 border-b border-slate-200 px-10 py-6 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">New Item</h1>
        </div>
        <button onClick={() => navigate('/inventory')} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all">
          <X size={26} />
        </button>
      </header>

      {/* 2. FORM CONTENT */}
      <div className="max-w-5xl mx-auto p-10 space-y-10">
        <div className="space-y-8">
          
          {/* Type Selection */}
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-medium text-slate-500 flex items-center gap-1">
              Type <HelpCircle size={14} className="opacity-30" />
            </Label>
            <div className="col-span-9 flex gap-10">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" checked={formData.type === 'Goods'} onChange={() => updateField('type', 'Goods')} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm font-medium">Goods</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" checked={formData.type === 'Service'} onChange={() => updateField('type', 'Service')} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm font-medium">Service</span>
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-bold text-red-600">Name *</Label>
            <Input 
              className="col-span-7 h-11 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400" 
              value={formData.name} 
              onChange={(e) => updateField('name', e.target.value)} 
            />
          </div>

          {/* Unit */}
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-medium text-slate-500">Unit</Label>
            <div className="col-span-7">
              <Select onValueChange={(v) => updateField('unit', v)}>
                <SelectTrigger className="h-11 border-slate-200 shadow-none"><SelectValue placeholder="Select or type to add" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pcs</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tax Preference */}
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-bold text-red-600">Tax Preference *</Label>
            <div className="col-span-7">
              <Select value={formData.tax_preference} onValueChange={(v) => updateField('tax_preference', v)}>
                <SelectTrigger className="h-11 border-slate-200 shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Taxable">Taxable</SelectItem>
                  <SelectItem value="Non-Taxable">Non-Taxable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Selling Price */}
          <div className="grid grid-cols-12 gap-6 items-center">
            <Label className="col-span-3 text-sm font-bold text-red-600 underline decoration-dotted">Selling Price *</Label>
            <div className="col-span-4 flex">
              <div className="h-11 px-4 flex items-center bg-slate-50 border border-r-0 border-slate-200 text-xs font-bold text-slate-400 rounded-l-md">INR</div>
              <Input 
                className="h-11 border-slate-200 rounded-l-none focus-visible:ring-0" 
                value={formData.selling_price} 
                onChange={(e) => updateField('selling_price', e.target.value)} 
              />
            </div>
          </div>

          {/* Tax Rates (The section that caused the error) */}
          <div className="pt-6 space-y-5 border-t border-slate-50">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-700">Default Tax Rates</h3>
              {/* ✅ This icon is now properly imported */}
              <PlusCircle size={16} className="text-blue-500 cursor-pointer" />
            </div>
            
            <div className="grid grid-cols-12 gap-6 items-center">
              <Label className="col-span-3 text-[13px] text-slate-400 underline decoration-dotted">Intra State Tax Rate</Label>
              <div className="col-span-9 text-sm font-medium text-slate-600">{formData.intra_state_tax}</div>
            </div>

            <div className="grid grid-cols-12 gap-6 items-center">
              <Label className="col-span-3 text-[13px] text-slate-400 underline decoration-dotted">Inter State Tax Rate</Label>
              <div className="col-span-9 text-sm font-medium text-slate-600">{formData.inter_state_tax}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 p-6 rounded-b-xl">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4">
          <Button className="bg-emerald-600 hover:bg-emerald-700 px-10 h-11 font-bold text-white shadow-md" onClick={handleSaveItem}>
            Save
          </Button>
          <Button variant="outline" className="px-10 h-11 border-slate-300 font-bold text-slate-600 bg-white" onClick={() => navigate('/inventory')}>
            Cancel
          </Button>
        </div>
      </footer>

    </div>
  );
}