import React from 'react';
import { X, ShoppingCart, Package, Tag, ShieldCheck, Truck, RotateCcw, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const API = 'http://localhost:8000';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ProductDetailModal({ isOpen, onClose, product, onAddToCart }) {
  if (!isOpen || !product) return null;

  const gst = product?.gst_percentage ?? 18;
  const gstAmt = ((product?.price || 0) * gst) / 100;
  const grandTotal = (product?.price || 0) + gstAmt;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all active:scale-90"
        >
          <X size={20} />
        </button>

        {/* Left: Image Showcase */}
        <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-12 relative border-r border-slate-100">
           <div className="absolute top-8 left-8">
              <Badge className="bg-indigo-600 border-none px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100">
                 {product?.product_id || 'PROD-N/A'}
              </Badge>
           </div>
           
           <div className="w-full aspect-square flex items-center justify-center group">
              {product?.image_url ? (
                <img
                  src={`${API}/${product.image_url}`}
                  alt={product?.name}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="text-slate-200 flex flex-col items-center gap-4">
                  <Package size={160} strokeWidth={0.5} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">No Image Available</span>
                </div>
              )}
           </div>

           {/* Brand Indicators */}
           <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-8">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 <ShieldCheck size={14} className="text-emerald-500" /> Genuine
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 <Truck size={14} className="text-indigo-500" /> Fast Shipping
              </div>
           </div>
        </div>

        {/* Right: Detailed Info */}
        <div className="w-full md:w-1/2 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar">
             {/* Header */}
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <span className="h-px w-8 bg-indigo-600"></span>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Authorized Inventory Item</span>
                </div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-[1.1]">
                   {product?.name || 'Unknown Product'}
                </h2>
             </div>

             {/* Description Section */}
             <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   Product Overview <Info size={12} />
                </h3>
                <p className="text-slate-500 leading-relaxed text-base font-medium">
                   {product?.description || "No detailed description available for this product. Please contact our support team for technical specifications and usage guidelines."}
                </p>
             </div>

             {/* Specifications Mock Table */}
             <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Technical Specifications</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                   <div className="border-b border-slate-50 pb-2 flex justify-between">
                      <span className="text-xs font-bold text-slate-400">Category</span>
                      <span className="text-xs font-black text-slate-700">General Goods</span>
                   </div>
                   <div className="border-b border-slate-50 pb-2 flex justify-between">
                      <span className="text-xs font-bold text-slate-400">GST Rate</span>
                      <span className="text-xs font-black text-slate-700">{gst}%</span>
                   </div>
                   <div className="border-b border-slate-50 pb-2 flex justify-between">
                      <span className="text-xs font-bold text-slate-400">Lead Time</span>
                      <span className="text-xs font-black text-slate-700">2-3 Days</span>
                   </div>
                   <div className="border-b border-slate-50 pb-2 flex justify-between">
                      <span className="text-xs font-bold text-slate-400">Warranty</span>
                      <span className="text-xs font-black text-slate-700">1 Year</span>
                   </div>
                </div>
             </div>

             {/* Price Breakdown Card */}
             <div className="bg-indigo-50/30 rounded-[2rem] p-8 space-y-4 border border-indigo-100/50">
                <div className="flex justify-between text-sm font-bold text-slate-400">
                   <span>Base Price</span>
                   <span>₹{fmt(product.price)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-400">
                   <span>Applicable GST ({gst}%)</span>
                   <span className="text-indigo-400">+ ₹{fmt(gstAmt)}</span>
                </div>
                <div className="pt-4 border-t border-indigo-100/50 flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Amount</p>
                      <h4 className="text-4xl font-black text-indigo-600 tracking-tighter">
                         <span className="text-2xl mr-0.5">₹</span>{fmt(grandTotal)}
                      </h4>
                   </div>
                   <div className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-3 py-1 rounded-full uppercase tracking-widest">
                      Tax Inclusive
                   </div>
                </div>
             </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
             <Button 
               variant="outline" 
               onClick={onClose}
               className="flex-1 py-7 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all"
             >
               Close
             </Button>
             <Button 
               onClick={() => {
                 onAddToCart(product);
                 onClose();
               }}
               className="flex-[2] py-7 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3"
             >
               <ShoppingCart size={18} />
               Add to Current Order
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
