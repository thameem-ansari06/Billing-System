import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ChevronRight, Loader2, MapPin, UserCheck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { API, BASE_URL } from '../../config';

const fmt = (n) => parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function CartDrawer() {
  const { cartItems, cartCount, cartTotal, removeFromCart, updateQty, clearCart, isOpen, setIsOpen } = useCart();
  const { user, refreshUser } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState({
    address_line: user?.address_line || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    gstin: user?.gstin || ''
  });

  const isAddressMissing = !user?.address_line || !user?.city || !user?.pincode;

  const handleCheckout = async () => {
    if (!cartItems.length) return;

    if (isAddressMissing && !showAddressForm) {
      setShowAddressForm(true);
      toast('Please provide shipping details to continue.', { icon: '📍' });
      return;
    }

    setPlacing(true);
    try {
      if (showAddressForm) {
        await axios.put(`${API}/users/me`, address, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        await refreshUser();
      }

      const payload = {
        items: cartItems.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
        })),
      };
      const response = await axios.post(`${API}/orders/`, payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      clearCart();
      setIsOpen(false);
      setShowAddressForm(false);
      
      const { routing, item_count } = response.data;
      if (routing === 'QUOTE') {
        toast.success(`Bulk order (${item_count} units) sent for Admin review in Quotes. 🎉`, { duration: 5000 });
      } else if (routing === 'INVOICE') {
        toast.success(`Small order (${item_count} units) processed — Invoice auto-generated! 🎉`, { duration: 5000 });
      } else {
        toast.success('Order placed successfully! 🎉');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to place order. Try again.';
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  };

  // Overlay
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3 text-white">
            <ShoppingBag size={22} />
            <h2 className="text-lg font-bold tracking-tight">Your Cart</h2>
            {cartCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cartCount} item{cartCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items or Address Form */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {showAddressForm ? (
            <div className="animate-in slide-in-from-right duration-300 space-y-5 px-2">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                  <MapPin size={14} className="text-indigo-500" /> Shipping Details
                </h3>
                <button onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-indigo-600 hover:underline">
                  Back to Cart
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Address Line</label>
                  <input 
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Street, Apartment, Suite..."
                    value={address.address_line}
                    onChange={e => setAddress({...address, address_line: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">City</label>
                    <input 
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="City"
                      value={address.city}
                      onChange={e => setAddress({...address, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">State</label>
                    <input 
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="State"
                      value={address.state}
                      onChange={e => setAddress({...address, state: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Pincode</label>
                    <input 
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="600001"
                      value={address.pincode}
                      onChange={e => setAddress({...address, pincode: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">GSTIN (Optional)</label>
                    <input 
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      placeholder="29AAAAA0000A1Z5"
                      value={address.gstin}
                      onChange={e => setAddress({...address, gstin: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                <div className="p-2 bg-white rounded-lg text-indigo-600 h-fit shadow-sm"><UserCheck size={16}/></div>
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                  We'll save these details to your profile so your next checkout is even faster!
                </p>
              </div>
            </div>
          ) : (
            cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-slate-400 py-20">
                <ShoppingBag size={56} strokeWidth={1} />
                <div>
                  <p className="font-semibold text-slate-600">Your cart is empty</p>
                  <p className="text-sm mt-1">Browse the catalog and add items!</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="mt-4 flex items-center gap-1 text-indigo-600 font-semibold text-sm hover:underline"
                >
                  Continue Shopping <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const gst    = item.gst_percentage ?? 18;
                const gstAmt = (item.price * gst) / 100;
                const total  = (item.price + gstAmt) * item.quantity;

                return (
                  <div key={item.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={`${BASE_URL}/${item.image_url}`}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ₹{fmt(item.price)} + {gst}% GST = <span className="font-bold text-slate-700">₹{fmt(item.price + gstAmt)}</span>
                        </p>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                          >
                            <Plus size={12} />
                          </button>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Line total */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-slate-800">₹{fmt(total)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer – GST Summary + Checkout */}
        {cartItems.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-4 bg-white">
            {/* Breakdown */}
            <div className="space-y-1.5 text-sm">
              {(() => {
                const base    = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
                const gstAmt  = cartTotal - base;
                return (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal (Base)</span>
                      <span>₹{fmt(base)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>GST (avg.)</span>
                      <span>₹{fmt(gstAmt)}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 text-base pt-1 border-t border-slate-100">
                      <span>Grand Total</span>
                      <span>₹{fmt(cartTotal)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              onClick={handleCheckout}
              disabled={placing}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {placing ? <><Loader2 size={18} className="animate-spin" /> Placing Order…</> : 'Place Order →'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
