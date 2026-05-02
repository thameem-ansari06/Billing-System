import React, { useState, useEffect } from 'react';
import { Box, Plus, RefreshCw, Package, ShoppingCart, Minus, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import EditProductModal from './EditProductModal';

export default function InventoryTab() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // User Cart States
  const [quantities, setQuantities] = useState({});
  const [cart, setCart] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [editingProduct, setEditingProduct] = useState(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  
  // Checking roles: If not 'user', treat as Admin/Provider
  const isUserRole = user?.role === 'user';

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("❌ Inventory Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // -- Add to Cart Logic --
  const handleQuantityChange = (productId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleAddToCart = (product) => {
    const qty = quantities[product.product_id] || 1;
    
    // Add to real cart map
    setCart(prev => ({
      ...prev,
      [product.id]: {
         product_id: product.id,
         name: product.name,
         price: product.price,
         quantity: (prev[product.id]?.quantity || 0) + qty
      }
    }));
    
    setToastMessage(`Added ${qty} x ${product.name} to cart!`);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  const submitCheckout = async () => {
    setIsSubmitting(true);
    try {
      const itemsPayload = Object.values(cart).map(item => ({
         product_id: item.product_id,
         quantity: item.quantity
      }));
      
      const response = await fetch('http://localhost:8000/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ items: itemsPayload })
      });
      
      if(response.ok){
         setCart({});
         setToastMessage(`🎉 Order submitted successfully! Admins have been notified!`);
         setTimeout(() => setToastMessage(null), 5000);
      } else {
         alert("Checkout failed. Check network link.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6 relative">
      
      {/* Absolute Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={24} />
          {toastMessage}
        </div>
      )}

      {/* Edit Product Modal (Admin Level Only) */}
      <EditProductModal 
        isOpen={!!editingProduct} 
        onClose={() => setEditingProduct(null)} 
        product={editingProduct} 
        onSuccess={(prodName) => {
          setToastMessage(`Product '${prodName}' updated successfully!`);
          setTimeout(() => setToastMessage(null), 3000);
          fetchProducts();
        }}
      />

      {/* Floating Checkout Tray */}
      {Object.keys(cart).length > 0 && (
         <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-zinc-700 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-8 w-[90%] md:w-auto animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400">
                    <ShoppingCart size={20} />
                </div>
                <div>
                   <p className="font-bold whitespace-nowrap text-sm">Cart Active</p>
                   <p className="text-zinc-400 text-xs">{Object.keys(cart).length} unique items lined up</p>
                </div>
            </div>
            
            <div className="font-black text-xl tracking-tight text-white whitespace-nowrap">
                ₹{Object.values(cart).reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            
            <Button 
                onClick={submitCheckout} 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold px-8 shadow-md"
            >
               {isSubmitting ? "Processing..." : "Checkout Securely ->"}
            </Button>
         </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            {isUserRole ? <ShoppingCart size={28} /> : <Package size={28} />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {isUserRole ? 'Product Catalog' : 'Inventory Management'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {isUserRole ? 'Browse and purchase our software plans securely.' : 'Track and manage your backend product stock'}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Hide internal actions from customers completely */}
          {!isUserRole && canEdit() && (
            <Button onClick={() => navigate('/inventory/new')} className="bg-primary hover:bg-primary/90 text-white font-bold w-full md:w-auto h-11 shadow-md">
              <Plus size={18} className="mr-2" /> Add Item
            </Button>
          )}
          <Button onClick={fetchProducts} variant="outline" className="gap-2 w-full md:w-auto h-11 font-semibold border-slate-300 text-slate-700">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </div>

      {/* Render Product Grid for USER, standard Table for ADMIN */}
      {isUserRole ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400 font-medium bg-white rounded-xl shadow-sm border border-slate-100">
              <Box size={48} className="mx-auto mb-3 text-slate-300" />
              No products mapped to catalog yet.
            </div>
          ) : (
            products.map((p) => {
              const qty = quantities[p.product_id] || 1;
              return (
                <div key={p.product_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all group flex flex-col">
                  {/* Image/Thumbnail Area */}
                  <div className="h-48 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative overflow-hidden group">
                    {p.image_url ? (
                        <img 
                            src={`http://localhost:8000/${p.image_url}`} 
                            alt={p.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                            <Package size={64} className="text-slate-200 group-hover:scale-110 group-hover:text-indigo-100 transition-transform duration-500" />
                        </div>
                    )}
                    <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm font-bold">
                      Available Stock
                    </Badge>
                  </div>
                  
                  {/* Product Metadata */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{p.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                        {p.description ? p.description : `Standard enterprise SKU. Includes standard GST processing integration natively mapped.`}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex items-end gap-1 mb-4">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">₹{parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      {/* Action Trays */}
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                          <button onClick={() => handleQuantityChange(p.product_id, -1)} className="p-1 px-2 hover:bg-white rounded-md text-slate-600 transition-colors">
                            <Minus size={16} />
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{qty}</span>
                          <button onClick={() => handleQuantityChange(p.product_id, 1)} className="p-1 px-2 hover:bg-white rounded-md text-slate-600 transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                        <Button 
                          onClick={() => handleAddToCart(p)}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 shadow-md"
                        >
                          <ShoppingCart size={16} className="mr-2" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ADMN / PROVIDER TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b">
              <tr className="text-slate-500 text-sm font-semibold tracking-wide">
                <th className="p-4">SKU ID</th>
                <th className="p-4">Product Name</th>
                <th className="p-4 text-right">Selling Price (₹)</th>
                <th className="p-4 text-center">Status Window</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-slate-400 font-medium">
                    <Box size={48} className="mx-auto mb-3 opacity-30" />
                    No products captured in backend inventory.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500 font-medium">{p.product_id}</td>
                    <td className="p-4 font-bold text-slate-700">{p.name}</td>
                    <td className="p-4 text-right font-black text-slate-800 tracking-tight">
                      ₹{parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-3">Active Pipeline</Badge>
                    </td>
                    <td className="p-4 text-right">
                      {canEdit() && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingProduct(p)} 
                          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <Pencil size={16} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}