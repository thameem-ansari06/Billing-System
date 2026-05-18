import React, { useState, useEffect } from 'react';
import { X, Check, Image as ImageIcon, Trash2, Plus, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BASE_URL, API } from '../config';
import { getCleanImageUrl } from '../utils/imageUtils';
import { cn } from "@/lib/utils";

export default function EditProductModal({ isOpen, onClose, product, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    gst_percentage: '18'
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        description: product.description || '',
        gst_percentage: product.gst_percentage || '18'
      });
      setExistingImages(product.image_urls || []);
      setImageFiles([]); 
      setPreviews([]);
    }
  }, [product, isOpen]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeNewImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (url) => {
    setExistingImages(prev => prev.filter(img => img !== url));
  };

  const handleUpdate = async () => {
    if (!product) return;
    setIsSubmitting(true);
    try {
      const data = new FormData();
      if (formData.name) data.append('name', formData.name);
      if (formData.price) data.append('price', parseFloat(formData.price) || 0);
      if (formData.description) data.append('description', formData.description);
      if (formData.gst_percentage) data.append('gst_percentage', parseFloat(formData.gst_percentage) || 0);
      
      imageFiles.forEach(file => data.append('images', file));
      data.append('remaining_images', JSON.stringify(existingImages));

      const response = await fetch(`${API}/products/${product.product_id}`, {
        method: 'PUT',
        body: data
      });

      if (response.ok) {
        onSuccess(formData.name);
        onClose();
      } else {
        const err = await response.json();
        alert('Failed to update product: ' + JSON.stringify(err));
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-50/80 border-b border-slate-100 flex flex-row justify-between items-center space-y-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Pencil size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-800">Edit Inventory SKU</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-bold uppercase tracking-widest">Product ID: {product?.product_id}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full space-y-2">
              <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Display Name</Label>
              <Input 
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-bold"
                placeholder="e.g. Enterprise AR License"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Base Price (₹)</Label>
              <Input 
                type="number"
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value)}
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">GST Slab (%)</Label>
              <Input 
                type="number"
                value={formData.gst_percentage}
                onChange={(e) => updateField('gst_percentage', e.target.value)}
                className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-bold"
              />
            </div>

            <div className="col-span-full space-y-2">
              <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Technical Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-indigo-500/20 font-medium resize-none"
                placeholder="Enter SKU details, specifications or service terms..."
              />
            </div>

            <div className="col-span-full space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Media Gallery</Label>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{existingImages.length + imageFiles.length} Images</span>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {/* Existing Images */}
                {existingImages.map((url, idx) => (
                  <div key={`exist-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                    <img 
                      src={getCleanImageUrl(url)} 
                      alt="Product" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => removeExistingImage(url)}
                        className="bg-rose-500 text-white rounded-full p-1.5 hover:bg-rose-600 transition-colors shadow-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* New Image Previews */}
                {previews.map((src, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-indigo-200 bg-indigo-50/30 group">
                    <img src={src} alt="New" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => removeNewImage(idx)}
                        className="bg-rose-500 text-white rounded-full p-1.5 hover:bg-rose-600 transition-colors shadow-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add More Button */}
                <label className="relative aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Plus size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/80 border-t border-slate-100 p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-8 h-12 rounded-xl font-bold border-slate-200">
            Discard Changes
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isSubmitting} 
            className="px-8 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-100"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="animate-spin" />
                <span>Syncing...</span>
              </div>
            ) : <><Check size={20} className="mr-2"/> Update SKU</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
