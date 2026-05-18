import React from 'react';
import { ShoppingCart, Eye, Tag, Package, Star } from 'lucide-react';

import { API, BASE_URL } from '../../config';
import { getCleanImageUrl } from '../../utils/imageUtils';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ProductCard({ product, onAddToCart, onViewDetails }) {
  const gst = product.gst_percentage ?? 18;
  const gstAmt = (product.price * gst) / 100;
  const grandTotal = product.price + gstAmt;

  return (
    <div className="group bg-white sm:rounded-xl border border-slate-200 shadow-sm sm:hover:shadow-md transition-all duration-300 flex flex-row sm:flex-col h-auto sm:h-full relative overflow-hidden">
      {/* Image Section */}
      <div 
        className="relative w-[120px] sm:w-full h-auto min-h-[120px] sm:h-[160px] bg-slate-50 flex items-center justify-center p-2 cursor-pointer overflow-hidden shrink-0 border-r sm:border-r-0 sm:border-b border-slate-100"
        onClick={() => onViewDetails(product)}
      >
        {product.image_url ? (
          <img
            src={getCleanImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 sm:group-hover:scale-105"
            onError={e => { e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image'; }}
          />
        ) : (
          <div className="text-slate-200 flex flex-col items-center gap-2">
            <Package size={48} strokeWidth={1} />
          </div>
        )}

        {/* Quick Action Overlay (Desktop Only) */}
        <div className="hidden sm:flex absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors duration-300 items-center justify-center pointer-events-none">
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5 pointer-events-auto">
            <Eye size={14} /> Quick View
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-2 sm:p-3 flex flex-col flex-1 min-w-0 bg-white justify-between sm:justify-start">
        {/* Header Area */}
        <div className="space-y-1 sm:mb-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1 mr-2">
              {product.product_id || 'PROD-ITEM'}
            </span>
            <div className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">
               <Tag size={8} /> OFF
            </div>
          </div>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight line-clamp-2 sm:line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
          {/* Mock Rating for Amazon feel */}
          <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
            <div className="flex text-amber-400">
               <Star size={10} className="fill-amber-400" />
               <Star size={10} className="fill-amber-400" />
               <Star size={10} className="fill-amber-400" />
               <Star size={10} className="fill-amber-400" />
               <Star size={10} className="fill-slate-200 text-slate-200" />
            </div>
            <span className="text-[9px] text-indigo-600 hover:underline cursor-pointer">128</span>
          </div>
        </div>

        {/* Scrollable Description Area (Desktop Only or very truncated on mobile) */}
        <div className="hidden sm:block flex-1 mb-4">
          <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
            {product.description || "Premium inventory item. Contact support for detailed specifications and data sheets."}
          </p>
        </div>

        {/* Footer: Price & Action */}
        <div className="mt-auto sm:pt-3 sm:border-t border-slate-50 flex sm:flex-col justify-between items-end sm:items-stretch gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-500 line-through">₹{fmt(grandTotal * 1.2)}</span>
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">₹{fmt(grandTotal)}</span>
            </div>
            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter leading-none mt-0.5">Incl. GST &bull; Prime</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="sm:w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-1.5 px-3 sm:py-2 rounded-full sm:rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm shrink-0"
          >
            <ShoppingCart size={14} /> <span className="hidden sm:inline">Add to Cart</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
