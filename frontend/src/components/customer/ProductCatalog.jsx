import React, { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Package, Star } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import ProductDetailModal from './ProductDetailModal';
import ProductCard from './ProductCard';

import { API } from '../../config';

const SkeletonCard = () => (
  <div className="bg-white sm:rounded-xl border border-slate-200 p-0 animate-pulse flex flex-row sm:flex-col h-[140px] sm:h-[380px]">
    <div className="w-[140px] sm:w-full h-full sm:h-[180px] bg-slate-50 border-r sm:border-r-0 sm:border-b border-slate-100 shrink-0" />
    <div className="p-3 sm:p-4 space-y-4 flex-1 flex flex-col justify-between sm:justify-start">
      <div className="space-y-2">
        <div className="h-2 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
      </div>
      <div className="hidden sm:block flex-1 space-y-1 mt-2">
        <div className="h-2 bg-slate-100 rounded w-full" />
        <div className="h-2 bg-slate-100 rounded w-2/3" />
      </div>
      <div className="mt-auto sm:pt-3">
        <div className="h-8 bg-slate-100 sm:rounded-lg w-full" />
      </div>
    </div>
  </div>
);

export default function ProductCatalog() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API}/products/`)
      .then(res => setProducts(res.data?.products || []))
      .catch(() => setError('Could not load products. Please check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.product_id || '').toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  );

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    toast.success(`${product.name} added to cart!`);
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (error) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-red-500">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
        <AlertCircle size={32} />
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-slate-800">Connection Error</p>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-100">Try Again</button>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Header - Condensed */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
           <Package size={80} />
        </div>
        
        <div className="space-y-1 relative">
          <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[9px] uppercase tracking-widest">
            <Star size={10} className="fill-indigo-600" /> Premium Collection
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-[10px] text-slate-500 font-medium max-w-sm">Discover our professional-grade inventory with transparent GST-inclusive pricing.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-[320px] group relative z-10">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, ID or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-300 transition-all outline-none shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-2.5 -mx-4 sm:mx-0">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white sm:rounded-xl border-y sm:border border-slate-200 shadow-sm -mx-4 sm:mx-0">
          <Package size={40} className="mx-auto mb-2 text-slate-200" strokeWidth={1} />
          <p className="font-bold text-slate-600 text-sm tracking-tight">No products matching your search</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Try refining your search terms or clearing the filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-2.5 -mx-4 sm:mx-0 border-y sm:border-y-0 border-slate-200 sm:border-transparent">
          {filtered.map(product => (
            <div key={product.id} className="border-b border-slate-100 sm:border-b-0 last:border-b-0">
              <ProductCard 
                product={product} 
                onAddToCart={handleAddToCart} 
                onViewDetails={handleViewDetails}
              />
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal Overlay */}
      <ProductDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

