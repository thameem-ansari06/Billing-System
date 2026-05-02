import React from 'react';
import { ShoppingCart, Eye, Tag, Package } from 'lucide-react';

const API = 'http://localhost:8000';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ProductCard({ product, onAddToCart, onViewDetails }) {
  const gst = product.gst_percentage ?? 18;
  const gstAmt = (product.price * gst) / 100;
  const grandTotal = product.price + gstAmt;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
      {/* Image Section */}
      <div 
        className="relative aspect-square bg-slate-50 flex items-center justify-center p-4 cursor-pointer overflow-hidden"
        onClick={() => onViewDetails(product)}
      >
        {product.image_url ? (
          <img
            src={`${API}/${product.image_url}`}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
            onError={e => { e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image'; }}
          />
        ) : (
          <div className="text-slate-300 flex flex-col items-center gap-2">
            <Package size={64} strokeWidth={1} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No Image</span>
          </div>
        )}
        
        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="bg-white/90 backdrop-blur text-slate-800 px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            <Eye size={14} /> Quick View
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            <Tag size={10} />
            <span>{product.product_id}</span>
          </div>
          
          <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
          
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed min-h-[3rem]">
            {product.description || "No description available for this item."}
          </p>
        </div>

        {/* Pricing & Action */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Price (Incl. {gst}% GST)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-900">₹{fmt(grandTotal)}</span>
                <span className="text-[10px] text-slate-400 line-through">₹{fmt(grandTotal * 1.2)}</span>
              </div>
            </div>
            <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              SAVE 20%
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-indigo-100 hover:shadow-indigo-200"
          >
            <ShoppingCart size={16} /> Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
