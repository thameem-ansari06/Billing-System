import React, { useState } from 'react';
import { X, ShoppingCart, Package, Tag, ShieldCheck, Truck, RotateCcw, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import { API, BASE_URL } from '../../config';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ProductDetailModal({ isOpen, onClose, product, onAddToCart }) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  
  if (!isOpen || !product) return null;

  const images = product.image_urls && product.image_urls.length > 0 ? product.image_urls : (product.image_url ? [product.image_url] : []);
  const activeImage = images[activeImageIdx];

  const gst = product?.gst_percentage ?? 18;
  const gstAmt = ((product?.price || 0) * gst) / 100;
  const grandTotal = (product?.price || 0) + gstAmt;

  const nextImage = () => setActiveImageIdx(prev => (prev + 1) % images.length);
  const prevImage = () => setActiveImageIdx(prev => (prev - 1 + images.length) % images.length);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-0 md:p-4 transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white md:rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row relative h-full md:h-auto md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 z-30 p-2 md:p-3 bg-white/80 md:bg-slate-100 backdrop-blur hover:bg-slate-200 rounded-full text-slate-500 transition-all active:scale-90 shadow-lg md:shadow-none"
        >
          <X size={20} />
        </button>

        {/* Left: Image Showcase */}
        <div className="w-full md:w-[45%] bg-slate-50 flex flex-col items-center justify-center p-8 md:p-12 relative border-r border-slate-100 shrink-0 min-h-[400px] md:min-h-[500px]">
           <div className="absolute top-6 left-6 md:top-10 md:left-10 z-10">
              <Badge className="bg-indigo-600 border-none px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100">
                 {product?.product_id || 'PROD-N/A'}
              </Badge>
           </div>
           
           <div className="flex-1 w-full flex items-center justify-center relative group">
              {activeImage ? (
                <>
                  <img
                    key={activeImage}
                    src={`${BASE_URL}/${activeImage}`}
                    alt={product?.name}
                    className="max-w-full max-h-[300px] md:max-h-full object-contain drop-shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button onClick={prevImage} className="absolute left-0 p-2 bg-white/50 hover:bg-white rounded-full shadow-md text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronLeft size={20} />
                      </button>
                      <button onClick={nextImage} className="absolute right-0 p-2 bg-white/50 hover:bg-white rounded-full shadow-md text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-slate-200 flex flex-col items-center gap-4">
                  <Package size={120} strokeWidth={0.5} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No Image</span>
                </div>
              )}
           </div>

           {/* Thumbnails */}
           {images.length > 1 && (
             <div className="flex gap-3 mt-8 overflow-x-auto pb-2 w-full justify-center scrollbar-none">
                {images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-16 h-16 rounded-2xl border-2 transition-all shrink-0 overflow-hidden ${activeImageIdx === idx ? 'border-indigo-600 scale-110 shadow-lg shadow-indigo-100' : 'border-white hover:border-slate-200'}`}
                  >
                    <img src={`${BASE_URL}/${img}`} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                  </button>
                ))}
             </div>
           )}

           {/* Brand Indicators */}
           <div className="absolute bottom-6 left-0 right-0 hidden md:flex justify-center gap-8 px-8">
              <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck size={12} className="text-emerald-500" />
                 </div>
                 Genuine
              </div>
              <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Truck size={12} className="text-indigo-500" />
                 </div>
                 Fast Shipping
              </div>
           </div>
        </div>

        {/* Right: Detailed Info */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-14 space-y-12 custom-scrollbar">
             {/* Header */}
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <span className="h-[2px] w-10 bg-indigo-600 rounded-full"></span>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Official Product</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.05]">
                   {product?.name || 'Unknown Product'}
                </h2>
             </div>

             {/* Description Section */}
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   Product Overview <Info size={12} className="text-indigo-400" />
                </h3>
                <div className="prose prose-slate prose-sm max-w-none">
                  <p className="text-slate-500 leading-relaxed text-base md:text-lg font-medium whitespace-pre-line">
                     {product?.description || "No detailed description available for this product. Our inventory specialists are currently updating the technical documentation for this item."}
                  </p>
                </div>
             </div>

             {/* Specifications Section */}
             <div className="space-y-6 bg-slate-50/50 rounded-3xl p-6 md:p-8 border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Technical Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12">
                   <div className="flex flex-col gap-1 border-b border-slate-100/50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                      <span className="text-sm font-black text-slate-800">GST Regulated Goods</span>
                   </div>
                   <div className="flex flex-col gap-1 border-b border-slate-100/50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">GST Rate</span>
                      <span className="text-sm font-black text-indigo-600">{gst}% (Included)</span>
                   </div>
                   <div className="flex flex-col gap-1 border-b border-slate-100/50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Lead Time</span>
                      <span className="text-sm font-black text-slate-800">Standard (2-4 Days)</span>
                   </div>
                   <div className="flex flex-col gap-1 border-b border-slate-100/50 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Warranty</span>
                      <span className="text-sm font-black text-slate-800">12 Months Limited</span>
                   </div>
                </div>
             </div>

             {/* Price Breakdown Card */}
             <div className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-10 space-y-6 shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                   <Package size={120} className="text-white" />
                </div>
                
                <div className="relative space-y-4">
                  <div className="flex justify-between text-indigo-100/80 font-bold text-sm">
                     <span>Base List Price</span>
                     <span>₹{fmt(product.price)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-100/80 font-bold text-sm">
                     <span>Applicable Tax ({gst}%)</span>
                     <span>+ ₹{fmt(gstAmt)}</span>
                  </div>
                  <div className="pt-6 border-t border-indigo-500 flex justify-between items-end">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Inclusive Final Amount</p>
                        <h4 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                           <span className="text-2xl mr-1 opacity-70 font-medium">₹</span>{fmt(grandTotal)}
                        </h4>
                     </div>
                     <div className="text-[10px] font-black text-indigo-600 bg-white px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                        Premium Quality
                     </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Static/Sticky Footer Actions */}
          <div className="p-6 md:p-10 border-t border-slate-100 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row gap-4 sticky bottom-0 shrink-0 z-10">
             <Button 
               variant="outline" 
               onClick={onClose}
               className="flex-1 h-16 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
             >
               Dismiss
             </Button>
             <Button 
               onClick={() => {
                 onAddToCart(product);
                 onClose();
               }}
               className="flex-[2] h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3"
             >
               <ShoppingCart size={18} />
               Add to Purchase Order
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
