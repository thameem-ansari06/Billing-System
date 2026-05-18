import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, HelpCircle, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API } from '../config';

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
    inter_state_tax: 'IGST12 (12 %)',
    hsn_code: '',
    category: '',
    stock_quantity: 0
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const updateField = (field, value) => setFormData({ ...formData, [field]: value });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveItem = async () => {
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('price', parseFloat(formData.selling_price) || 0);
      if (formData.description) data.append('description', formData.description);
      if (formData.hsn_code) data.append('hsn_code', formData.hsn_code);
      if (formData.category) data.append('category', formData.category);
      data.append('stock_quantity', parseInt(formData.stock_quantity) || 0);
      
      // Append multiple images
      imageFiles.forEach(file => {
        data.append('images', file);
      });

      const response = await fetch(`${API}/products/`, {
        method: 'POST',
        body: data
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
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          
          {/* Type Selection */}
          <div className="col-span-1 md:col-span-2 flex items-center gap-6">
            <Label className="text-xs font-bold text-slate-500 flex items-center gap-1 w-32">
              Type <HelpCircle size={14} className="opacity-30" />
            </Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.type === 'Goods'} onChange={() => updateField('type', 'Goods')} className="w-3.5 h-3.5 accent-blue-600" />
                <span className="text-sm font-medium">Goods</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={formData.type === 'Service'} onChange={() => updateField('type', 'Service')} className="w-3.5 h-3.5 accent-blue-600" />
                <span className="text-sm font-medium">Service</span>
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-red-600">Name *</Label>
            <Input 
              className="border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400" 
              value={formData.name} 
              onChange={(e) => updateField('name', e.target.value)} 
            />
          </div>

          {/* Unit */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500">Unit</Label>
            <Select onValueChange={(v) => updateField('unit', v)}>
              <SelectTrigger className="border-slate-200 shadow-none"><SelectValue placeholder="Select or type to add" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pcs</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="box">Box</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* HSN Code */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500">HSN Code</Label>
            <Input 
              className="border-slate-200" 
              placeholder="Ex. 8517"
              value={formData.hsn_code}
              onChange={(e) => updateField('hsn_code', e.target.value)}
            />
          </div>
          
          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500">Category</Label>
            <Input 
              className="border-slate-200" 
              placeholder="Ex. Electronics"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
            />
          </div>

          {/* Tax Preference */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-red-600">Tax Preference *</Label>
            <Select value={formData.tax_preference} onValueChange={(v) => updateField('tax_preference', v)}>
              <SelectTrigger className="border-slate-200 shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Taxable">Taxable</SelectItem>
                <SelectItem value="Non-Taxable">Non-Taxable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 md:col-span-2"><hr className="border-slate-100 my-2" /></div>

          {/* Selling Price */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-red-600 underline decoration-dotted">Selling Price *</Label>
            <div className="flex">
              <div className="px-3 flex items-center bg-slate-50 border border-r-0 border-slate-200 text-xs font-bold text-slate-400 rounded-l-md">INR</div>
              <Input 
                className="border-slate-200 rounded-l-none focus-visible:ring-0" 
                value={formData.selling_price} 
                onChange={(e) => updateField('selling_price', e.target.value)} 
              />
            </div>
          </div>
            
          {/* Initial Stock */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500">Initial Stock</Label>
            <Input 
              type="number"
              className="border-slate-200" 
              value={formData.stock_quantity}
              onChange={(e) => updateField('stock_quantity', e.target.value)}
            />
          </div>

          <div className="col-span-1 md:col-span-2"><hr className="border-slate-100 my-2" /></div>
          
          {/* Description */}
          <div className="col-span-1 md:col-span-2 space-y-1">
            <Label className="text-xs font-bold text-slate-500">Product Description</Label>
            <Textarea 
              className="border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-400 min-h-[60px]" 
              placeholder="Ex. 1-year premium sub..."
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          {/* Marketing Images */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-500">Marketing Images</Label>
            <Input 
              type="file" 
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="p-0 border-slate-200 file:border-0 file:bg-slate-100 file:mr-3 file:py-1 file:px-3 cursor-pointer hover:file:bg-slate-200 transition-colors h-7"
            />
            {/* Previews */}
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                 {previews.map((src, idx) => (
                   <div key={idx} className="relative w-12 h-12 rounded-md border border-slate-200 overflow-hidden group">
                     <img src={src} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                     <button 
                       onClick={() => removeImage(idx)}
                       className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <X size={10} />
                     </button>
                   </div>
                 ))}
              </div>
            )}
          </div>

          <div className="col-span-1 md:col-span-2"><hr className="border-slate-100 my-2" /></div>

          {/* Tax Rates */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-700">Default Tax Rates</h3>
              <PlusCircle size={14} className="text-blue-500 cursor-pointer" />
            </div>
            
            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-slate-400 underline decoration-dotted">Intra State</Label>
                <div className="text-xs font-medium text-slate-600">{formData.intra_state_tax}</div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-slate-400 underline decoration-dotted">Inter State</Label>
                <div className="text-xs font-medium text-slate-600">{formData.inter_state_tax}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="bg-slate-50 border-t border-slate-200 p-4 rounded-b-xl">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4">
          <Button className="bg-emerald-600 hover:bg-emerald-700 px-8 h-8 font-bold text-white shadow-md" onClick={handleSaveItem}>
            Save
          </Button>
          <Button variant="outline" className="px-8 h-8 border-slate-300 font-bold text-slate-600 bg-white" onClick={() => navigate('/inventory')}>
            Cancel
          </Button>
        </div>
      </footer>

    </div>
  );
}