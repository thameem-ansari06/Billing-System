import React, { useState } from 'react';
import { X, ShoppingCart, Package, Tag, ShieldCheck, Truck, RotateCcw, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import { API, BASE_URL } from '../../config';
import { getCleanImageUrl } from '../../utils/imageUtils';
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
        className="bg-white md:rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row relative h-full md:h-auto md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-30 p-1.5 md:p-2 bg-white/80 md:bg-slate-100 backdrop-blur hover:bg-slate-200 rounded-lg text-slate-500 transition-all active:scale-90 shadow-md md:shadow-none"
        >
          <X size={16} />
        </button>

        {/* Left: Image Showcase */}
        <div className="w-full md:w-[40%] bg-slate-50 flex flex-col items-center justify-center p-2 py-6 md:p-6 relative border-r border-slate-100 shrink-0 min-h-[250px] md:min-h-[400px]">
           <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10">
              <Badge className="bg-indigo-600 border-none px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] shadow-sm shadow-indigo-100">
                 {product?.product_id || 'PROD-N/A'}
              </Badge>
           </div>
           
           <div className="flex-1 w-full flex items-center justify-center relative group">
              {activeImage ? (
                <>
                  <img
                    key={activeImage}
                    src={getCleanImageUrl(activeImage)}
                    alt={product?.name}
                    className="max-w-full max-h-[300px] md:max-h-full object-contain drop-shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button onClick={prevImage} className="absolute left-0 p-1.5 bg-white/50 hover:bg-white rounded-lg shadow-sm text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={nextImage} className="absolute right-0 p-1.5 bg-white/50 hover:bg-white rounded-lg shadow-sm text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-slate-200 flex flex-col items-center gap-2">
                  <Package size={64} strokeWidth={0.5} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-300">No Image</span>
                </div>
              )}
           </div>

           {/* Thumbnails */}
           {images.length > 1 && (
             <div className="flex gap-2 mt-4 overflow-x-auto pb-2 w-full justify-center scrollbar-none">
                {images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all shrink-0 overflow-hidden ${activeImageIdx === idx ? 'border-indigo-600 scale-110 shadow-sm shadow-indigo-100' : 'border-white hover:border-slate-200'}`}
                  >
                    <img src={getCleanImageUrl(img)} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                  </button>
                ))}
             </div>
           )}

           {/* Brand Indicators */}
           <div className="absolute bottom-4 left-0 right-0 hidden md:flex justify-center gap-6 px-4">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                 <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck size={10} className="text-emerald-500" />
                 </div>
                 Genuine
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                 <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center">
                    <Truck size={10} className="text-indigo-500" />
                 </div>
                 Fast Shipping
              </div>
           </div>
        </div>

        {/* Right: Detailed Info */}
        <div className="flex-1 flex flex-col min-h-0 bg-white w-full">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-3 py-4 md:p-6 space-y-3 md:space-y-4 custom-scrollbar">
             {/* Header */}
             <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <span className="h-0.5 w-6 bg-indigo-600 rounded-full"></span>
                   <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-[0.4em]">Official Product</span>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                   {product?.name || 'Unknown Product'}
                </h2>
             </div>

             {/* Description Section */}
             <div className="space-y-1.5">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                   Product Overview <Info size={10} className="text-indigo-400" />
                </h3>
                <div className="prose prose-slate prose-sm max-w-none">
                  <p className="text-slate-500 leading-relaxed text-xs md:text-sm font-medium whitespace-pre-line">
                     {product?.description || "No detailed description available for this product. Our inventory specialists are currently updating the technical documentation for this item."}
                  </p>
                </div>
             </div>

             {/* Specifications Section */}
             <div className="space-y-2 bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Technical Specifications</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-2">
                   <div className="flex flex-col gap-0.5 border-b border-slate-100/50 pb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Category</span>
                      <span className="text-[10px] md:text-xs font-bold text-slate-800 tracking-tight">GST Regulated</span>
                   </div>
                   <div className="flex flex-col gap-0.5 border-b border-slate-100/50 pb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">GST Rate</span>
                      <span className="text-[10px] md:text-xs font-bold text-indigo-600 tracking-tight">{gst}%</span>
                   </div>
                   <div className="flex flex-col gap-0.5 border-b border-slate-100/50 pb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Lead Time</span>
                      <span className="text-[10px] md:text-xs font-bold text-slate-800 tracking-tight">2-4 Days</span>
                   </div>
                   <div className="flex flex-col gap-0.5 border-b border-slate-100/50 pb-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Warranty</span>
                      <span className="text-[10px] md:text-xs font-bold text-slate-800 tracking-tight">12 Months</span>
                   </div>
                </div>
             </div>

             {/* Price Breakdown Card */}
             <div className="bg-indigo-600 rounded-xl p-3 md:p-6 space-y-2 md:space-y-3 shadow-md shadow-indigo-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                   <Package size={64} className="text-white" />
                </div>
                
                <div className="relative space-y-1 md:space-y-2">
                  <div className="flex justify-between text-indigo-100/80 font-bold text-[10px] md:text-xs">
                     <span>Base List Price</span>
                     <span>₹{fmt(product.price)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-100/80 font-bold text-[10px] md:text-xs">
                     <span>Applicable Tax ({gst}%)</span>
                     <span>+ ₹{fmt(gstAmt)}</span>
                  </div>
                  <div className="pt-2 md:pt-3 border-t border-indigo-500 flex justify-between items-end">
                     <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Inclusive Final Amount</p>
                        <h4 className="text-xl md:text-3xl font-bold text-white tracking-tighter">
                           <span className="text-sm md:text-lg mr-1 opacity-70 font-medium">₹</span>{fmt(grandTotal)}
                        </h4>
                     </div>
                     <div className="text-[8px] md:text-[9px] font-bold text-indigo-600 bg-white px-1.5 py-0.5 md:px-2 md:py-1 rounded uppercase tracking-widest shadow-sm">
                        Premium
                     </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Static/Sticky Footer Actions */}
          <div className="p-3 md:p-6 border-t border-slate-100 bg-white/95 backdrop-blur-md flex flex-row gap-2 sticky bottom-0 shrink-0 z-10 w-full">
             <Button 
               variant="outline" 
               onClick={onClose}
               className="flex-[0.5] h-10 rounded-lg border border-slate-200 text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-tight hover:bg-slate-50 transition-all px-2"
             >
               Dismiss
             </Button>
             <Button 
               onClick={() => {
                 onAddToCart(product);
                 onClose();
               }}
               className="flex-[2] h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] md:text-xs uppercase tracking-tight shadow-md shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-1.5 px-2"
             >
               <ShoppingCart size={14} />
               Add to Order
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
