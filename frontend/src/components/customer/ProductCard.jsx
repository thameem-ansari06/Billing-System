import React from 'react';
import { ShoppingCart, Eye, Tag, Package } from 'lucide-react';

import { API, BASE_URL } from '../../config';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ProductCard({ product, onAddToCart, onViewDetails }) {
  const gst = product.gst_percentage ?? 18;
  const gstAmt = (product.price * gst) / 100;
  const grandTotal = product.price + gstAmt;

  return (
    <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[520px] relative">
      {/* Image Section - Editorial Style */}
      <div 
        className="relative h-[240px] bg-slate-50 flex items-center justify-center p-8 cursor-pointer overflow-hidden shrink-0"
        onClick={() => onViewDetails(product)}
      >
        {product.image_url ? (
          <img
            src={`${BASE_URL}/${product.image_url}`}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-110"
            onError={e => { e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image'; }}
          />
        ) : (
          <div className="text-slate-200 flex flex-col items-center gap-3">
            <Package size={80} strokeWidth={0.5} />
          </div>
        )}

        {/* Floating Price Badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-end">
           <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter leading-none mb-0.5">Incl. GST</span>
           <span className="text-sm font-black text-slate-900 tracking-tight">₹{fmt(grandTotal)}</span>
        </div>

        {/* Quick Action Overlay */}
        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors duration-500 flex items-center justify-center">
          <button className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] shadow-2xl opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 flex items-center gap-2">
            <Eye size={12} /> Details
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1 min-h-0 bg-white">
        {/* Header Area */}
        <div className="space-y-1 mb-4 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
              {product.product_id || 'PROD-ITEM'}
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
               <Tag size={8} /> 20% OFF
            </div>
          </div>
          <h3 className="font-black text-slate-800 text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors tracking-tight">
            {product.name}
          </h3>
        </div>

        {/* Scrollable Description Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mb-6">
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {product.description || "No description available for this premium inventory item. Please contact support for detailed specifications and technical data sheets."}
          </p>
        </div>

        {/* Static Footer Action */}
        <div className="pt-4 border-t border-slate-50 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl shadow-indigo-100 hover:shadow-indigo-200"
          >
            <ShoppingCart size={14} strokeWidth={3} /> Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
