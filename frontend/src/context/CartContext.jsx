import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage when user changes
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`cart_${user.id}`);
      setCartItems(saved ? JSON.parse(saved) : []);
    } else {
      setCartItems([]);
    }
  }, [user?.id]);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cartItems));
    }
  }, [cartItems, user?.id]);

  const addToCart = useCallback((product, qty = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    toast.success(`"${product.name}" added to cart!`, { icon: '🛒' });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems(prev => prev.filter(i => i.id !== productId));
    toast('Item removed from cart', { icon: '🗑️' });
  }, []);

  const updateQty = useCallback((productId, qty) => {
    if (qty < 1) return;
    setCartItems(prev =>
      prev.map(i => i.id === productId ? { ...i, quantity: qty } : i)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Re-populate cart from a previous order's items
  const reorderItems = useCallback((orderItems) => {
    const newItems = orderItems
      .filter(oi => oi.product)
      .map(oi => ({ ...oi.product, quantity: oi.quantity }));

    setCartItems(prev => {
      const merged = [...prev];
      newItems.forEach(ni => {
        const idx = merged.findIndex(i => i.id === ni.id);
        if (idx > -1) {
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + ni.quantity };
        } else {
          merged.push(ni);
        }
      });
      return merged;
    });
    toast.success('Items added back to cart!', { icon: '🔄' });
    setIsOpen(true);
  }, []);

  const cartCount  = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal  = cartItems.reduce((s, i) => {
    const gstAmt = (i.price * (i.gst_percentage ?? 18)) / 100;
    return s + (i.price + gstAmt) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems, cartCount, cartTotal,
      addToCart, removeFromCart, updateQty, clearCart, reorderItems,
      isOpen, setIsOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
};
