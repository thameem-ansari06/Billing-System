import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Plus, RefreshCw, Package, ShoppingCart, Minus, CheckCircle2, Pencil, FileSpreadsheet, Upload, Download, X, AlertCircle, Info, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import EditProductModal from './EditProductModal';
import { BASE_URL, API } from '../config';
import { getCleanImageUrl } from '../utils/imageUtils';
import { cn } from "@/lib/utils";

export default function InventoryTab() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // User Cart States
  const [quantities, setQuantities] = useState({});
  const [cart, setCart] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEdit } = usePermissions();
  
  // Checking roles: If not 'user', treat as Admin/Provider
  const isUserRole = user?.role === 'user';

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/products`);
      const data = await res.json();
      setProducts(data.products || []);
      setSelectedIds([]); // Clear selection after fetch
    } catch (err) {
      console.error("❌ Inventory Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.product_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // -- Add to Cart Logic --
  const handleQuantityChange = (productId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleAddToCart = (product) => {
    const qty = quantities[product.product_id] || 1;
    
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
      
      const response = await fetch(`${API}/orders/`, {
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

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setUploadResults(null);
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    try {
      const response = await fetch(`${API}/products/upload-bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (response.ok) {
        setUploadResults(data);
        fetchProducts();
        setToastMessage(`Import Complete: ${data.created} created, ${data.updated} updated.`);
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        alert(data.detail || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm(`Are you sure you want to delete product ${productId}?`)) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        setToastMessage(`Product deleted successfully.`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.detail || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error during delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API}/products/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(selectedIds)
      });
      
      if (response.ok) {
        setToastMessage(`${selectedIds.length} products deleted successfully.`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.detail || "Bulk delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error during bulk delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.product_id));
    }
  };

  const toggleSelect = (productId) => {
    setSelectedIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const downloadTemplate = () => {
    window.open(`${API}/products/template`, '_blank');
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/products/export`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setToastMessage("Inventory exported successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to export inventory. Check if you are logged in correctly.");
    }
  };


  return (
    <div className="animate-in fade-in duration-500 space-y-6 relative">
      
      {/* Absolute Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-bounce">
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
      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              {isUserRole ? <ShoppingCart size={20} /> : <Package size={20} />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                {isUserRole ? 'Product Catalog' : 'Inventory Management'}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                {isUserRole ? 'Browse and purchase our software plans securely.' : 'Track and manage your backend product stock'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {!isUserRole && canEdit() && (
              <>
                <Button 
                  onClick={() => setIsBulkModalOpen(true)} 
                  variant="outline"
                  className="rounded-lg border-slate-200 font-bold h-8 px-3 text-xs shadow-sm"
                >
                  <FileSpreadsheet size={14} className="mr-1.5 text-indigo-500" /> Bulk Import
                </Button>
                <Button 
                  onClick={handleExport} 
                  variant="outline"
                  className="rounded-lg border-slate-200 font-bold h-8 px-3 text-xs shadow-sm"
                >
                  <Download size={14} className="mr-1.5 text-indigo-500" /> Export
                </Button>
                <Button onClick={() => navigate('/inventory/new')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 px-3 text-xs shadow-md rounded-lg">
                  <Plus size={14} className="mr-1.5" /> Add Item
                </Button>
              </>
            )}
            <Button onClick={fetchProducts} variant="outline" className="rounded-lg h-8 px-3 text-xs font-bold border-slate-200">
              <RefreshCw size={14} className={cn("mr-1.5", isLoading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center mt-1">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input 
              placeholder="Search by name or SKU ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-indigo-500/20 rounded-lg transition-all"
            />
          </div>
          
          {!isUserRole && canEdit() && selectedIds.length > 0 && (
            <Button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              variant="destructive"
              className="h-8 px-4 text-xs font-bold shadow-sm rounded-lg animate-in zoom-in-95"
            >
              <Trash2 size={14} className="mr-1.5" /> Delete ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Render Product Grid for USER, standard Table for ADMIN */}
      {isUserRole ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium bg-white rounded-xl shadow-sm border border-slate-100">
              <Box size={32} className="mx-auto mb-2 text-slate-300" />
              No products found matching your search.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const qty = quantities[p.product_id] || 1;
              return (
                <div key={p.product_id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group flex flex-col">
                  {/* Image/Thumbnail Area */}
                  <div className="h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative overflow-hidden group">
                    {p.image_url ? (
                        <img 
                            src={getCleanImageUrl(p.image_url)} 
                            alt={p.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.target.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=Image+Not+Found' }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                            <Package size={40} className="text-slate-200 group-hover:scale-105 group-hover:text-indigo-100 transition-transform duration-300" />
                        </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-emerald-700 border-emerald-100 shadow-sm font-bold text-[8px] px-1.5 py-0">
                      In Stock
                    </Badge>
                  </div>
                  
                  {/* Product Metadata */}
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</h3>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2 line-clamp-2 leading-tight">
                        {p.description ? p.description : `Standard enterprise SKU. Includes standard GST processing integration natively mapped.`}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex items-end gap-1 mb-2">
                        <span className="text-lg font-bold text-slate-900 tracking-tight">₹{parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      {/* Action Trays */}
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                          <button onClick={() => handleQuantityChange(p.product_id, -1)} className="p-1 hover:bg-white rounded-md text-slate-600 transition-all">
                            <Minus size={12} />
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{qty}</span>
                          <button onClick={() => handleQuantityChange(p.product_id, 1)} className="p-1 hover:bg-white rounded-md text-slate-600 transition-all">
                            <Plus size={12} />
                          </button>
                        </div>
                        <Button 
                          onClick={() => handleAddToCart(p)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-7 text-xs rounded-lg shadow-sm"
                        >
                          <ShoppingCart size={12} className="mr-1" /> Add
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
        /* ADMIN / PROVIDER TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-8">
                {!isUserRole && canEdit() && (
                  <TableHead className="w-10 text-center px-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="py-2 text-[10px] font-bold uppercase">SKU ID</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase">Product Name</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase text-right">Selling Price (₹)</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase text-center">Status</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                      <Box size={24} className="mb-2 opacity-30" />
                      <p>No products found in backend inventory.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => (
                  <TableRow key={p.product_id} className={cn("transition-colors h-8", selectedIds.includes(p.product_id) && 'bg-indigo-50/50')}>
                    {!isUserRole && canEdit() && (
                      <TableCell className="text-center px-2 py-1">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                          checked={selectedIds.includes(p.product_id)}
                          onChange={() => toggleSelect(p.product_id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="py-1 font-mono text-[9px] text-slate-500 font-bold">{p.product_id}</TableCell>
                    <TableCell className="py-1 text-xs font-bold text-slate-700">{p.name}</TableCell>
                    <TableCell className="py-1 text-xs text-right font-bold text-slate-800 tracking-tight">
                      ₹{parseFloat(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[9px] px-2 py-0 rounded-md">
                        Active Stock
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit() && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingProduct(p)} 
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-6 w-6 rounded-md"
                            >
                              <Pencil size={12} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={isDeleting}
                              onClick={() => handleDeleteProduct(p.product_id)} 
                              className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 h-6 w-6 rounded-md"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkModalOpen} onOpenChange={(open) => { if(!open) { setIsBulkModalOpen(false); setUploadFile(null); setUploadResults(null); }}}>
        <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-row justify-between items-center space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">Bulk Import</DialogTitle>
                <DialogDescription className="text-[10px] text-slate-500 font-medium">Sync your stock via Excel/CSV</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {!uploadResults ? (
              <>
                <div 
                  onClick={() => document.getElementById('bulk-file-input').click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300",
                    uploadFile ? "border-emerald-400 bg-emerald-50/40" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
                  )}
                >
                  <input 
                    id="bulk-file-input" 
                    type="file" 
                    hidden 
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "p-3 rounded-xl mb-3 transition-transform group-hover:scale-105",
                      uploadFile ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                    )}>
                      {uploadFile ? <CheckCircle2 size={24} /> : <Upload size={24} />}
                    </div>
                    <p className="font-bold text-slate-700 text-sm">
                      {uploadFile ? uploadFile.name : 'Click to select file'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Excel or CSV preferred (Max 10MB)</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2">
                    <Info className="text-amber-600 shrink-0" size={16} />
                    <p className="text-[10px] text-amber-800 font-bold leading-tight">Use our official template to ensure perfect data mapping.</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={downloadTemplate}
                    className="text-amber-700 hover:bg-amber-100 font-bold text-[9px] uppercase tracking-[0.1em] h-7 px-2"
                  >
                    <Download size={12} className="mr-1" /> Template
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">New Created</p>
                    <p className="text-2xl font-bold text-emerald-700">{uploadResults.created}</p>
                  </div>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">Stock Updated</p>
                    <p className="text-2xl font-bold text-blue-700">{uploadResults.updated}</p>
                  </div>
                </div>

                {uploadResults.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto p-4 bg-rose-50 border border-rose-100 rounded-xl custom-scrollbar">
                    <div className="flex items-center gap-2 text-rose-700 mb-2">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Validation Errors</span>
                    </div>
                    <div className="space-y-1.5">
                      {uploadResults.errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-rose-600 font-bold border-b border-rose-100/50 pb-1.5 last:border-0">{err}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 rounded-lg font-bold border-slate-200 h-8 text-xs"
              onClick={() => { setIsBulkModalOpen(false); setUploadFile(null); setUploadResults(null); }}
            >
              {uploadResults ? 'Finish & Close' : 'Cancel'}
            </Button>
            {!uploadResults && (
              <Button 
                disabled={!uploadFile || isUploading}
                onClick={handleFileUpload}
                className="flex-[2] rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs shadow-sm"
              >
                {isUploading ? (
                  <div className="flex items-center gap-1.5">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Data...</span>
                  </div>
                ) : 'Start Sync Process'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}