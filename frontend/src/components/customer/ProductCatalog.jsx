import React, { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Package, Star } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import ProductDetailModal from './ProductDetailModal';
import ProductCard from './ProductCard';

import { API } from '../../config';

const SkeletonCard = () => (
  <div className="bg-white rounded-3xl border border-slate-50 p-0 animate-pulse flex flex-col h-[520px]">
    <div className="h-[240px] bg-slate-50 rounded-t-3xl" />
    <div className="p-6 space-y-6 flex-1 flex flex-col">
      <div className="space-y-2">
        <div className="h-3 bg-slate-50 rounded w-1/4" />
        <div className="h-6 bg-slate-50 rounded w-3/4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-50 rounded w-full" />
        <div className="h-3 bg-slate-50 rounded w-full" />
        <div className="h-3 bg-slate-50 rounded w-2/3" />
      </div>
      <div className="pt-4 border-t border-slate-50">
        <div className="h-14 bg-slate-50 rounded-2xl w-full" />
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
           <Package size={180} />
        </div>
        
        <div className="space-y-2 relative">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em]">
            <Star size={14} className="fill-indigo-600" /> Premium Collection
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Product Catalog
          </h1>
          <p className="text-sm text-slate-400 font-medium max-w-md">Discover our professional-grade inventory with transparent GST-inclusive pricing.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-[400px] group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-focus-within:opacity-10 transition duration-500"></div>
          <div className="relative">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, ID or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 text-sm bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-100 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Package size={64} className="mx-auto mb-4 text-slate-200" strokeWidth={1} />
          <p className="font-black text-slate-600 text-xl tracking-tight">No products matching your search</p>
          <p className="text-sm text-slate-400 mt-1">Try refining your search terms or clearing the filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={handleAddToCart} 
              onViewDetails={handleViewDetails}
            />
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

