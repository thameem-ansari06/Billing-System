import React, { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Package, Star } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import ProductDetailModal from './ProductDetailModal';
import ProductCard from './ProductCard';

const API = 'http://localhost:8000';

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 animate-pulse">
    <div className="aspect-square bg-slate-100 rounded-xl" />
    <div className="space-y-2">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-6 bg-slate-100 rounded w-3/4" />
      <div className="h-12 bg-slate-100 rounded" />
    </div>
    <div className="h-10 bg-slate-100 rounded-xl" />
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
    axios.get(`${API}/api/products/`)
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
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-red-500">
      <AlertCircle size={44} />
      <p className="font-semibold">{error}</p>
      <button onClick={() => window.location.reload()} className="text-sm font-bold text-indigo-600 hover:underline">Try Again</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
            <Star size={14} className="fill-indigo-600" /> Premium Catalog
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Explore Products
          </h1>
          <p className="text-sm text-slate-400 font-medium">Browse our exclusive collection of GST-compliant inventory items.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, ID or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 text-sm bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-inner"
          />
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

