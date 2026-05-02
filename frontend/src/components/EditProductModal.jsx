import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EditProductModal({ isOpen, onClose, product, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    gst_percentage: '18'
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        description: product.description || '',
        gst_percentage: product.gst_percentage || '18'
      });
      setImageFile(null); // Reset image explicitly when opening
    }
  }, [product, isOpen]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      if (imageFile) data.append('image', imageFile);

      const response = await fetch(`http://localhost:8000/api/products/${product.product_id}`, {
        method: 'PUT',
        body: data
      });

      if (response.ok) {
        onSuccess(product.name);
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

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-300 transform zoom-in-95">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Edit Product</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 bg-white rounded-md transition-colors border border-slate-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700">Product Name</Label>
              <Input 
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Selling Price (₹)</Label>
                <Input 
                  type="number"
                  value={formData.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700">GST Percentage (%)</Label>
                <Input 
                  type="number"
                  value={formData.gst_percentage}
                  onChange={(e) => updateField('gst_percentage', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700">Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 flex justify-between">
                <span>Update Image (Optional)</span>
                {product.image_url && <span className="text-xs text-indigo-500 font-bold">Has Image</span>}
              </Label>
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="mt-1 file:bg-slate-100 file:border-0 hover:file:bg-slate-200 transition-colors"
                title="Leave blank to keep existing image"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-6 border-slate-300">
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isSubmitting} 
            className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {isSubmitting ? "Saving..." : <><Check size={18} className="mr-2"/> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
