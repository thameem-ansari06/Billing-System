import { useState, useEffect } from 'react';
import { Send, Trash2, FileText, Users, Box, Percent } from 'lucide-react';

export default function InvoicesTab() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [billItems, setBillItems] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // API-la irunthu puthu customer list-a edukkurom
    fetch('http://localhost:8000/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []))
      .catch(err => console.error("Customer Fetch Error:", err));

    fetch('http://localhost:8000/api/products')
      .then(res => res.json())
      .then(data => setProducts(data.products || []))
      .catch(err => console.error("Product Fetch Error:", err));
  }, []);

  const addProductToBill = () => {
    if (!selectedProduct) return;
    const productData = products.find(p => p.product_id === selectedProduct);
    if (productData) {
      setBillItems([...billItems, { item_name: productData.name, price: productData.price }]);
      setSelectedProduct('');
    }
  };

  const calculateTotals = () => {
    const subtotal = billItems.reduce((total, item) => total + parseFloat(item.price), 0);
    const discountAmt = (subtotal * (discountPercent || 0)) / 100;
    const taxable = subtotal - discountAmt;
    const cgst = (taxable * 9) / 100;
    const sgst = (taxable * 9) / 100;
    const grandTotal = taxable + cgst + sgst;
    return { subtotal, discountAmt, cgst, sgst, grandTotal };
  };

  const totals = calculateTotals();

  const generateAndSendInvoice = async () => {
    if (!selectedCustomer) return alert("⚠️ Please select a customer.");
    if (billItems.length === 0) return alert("⚠️ Add at least one item.");

    const customerData = customers.find(c => c.customer_id === selectedCustomer);
    setIsGenerating(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/generate_invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: customerData.email, 
          items: billItems, 
          discount_percent: parseFloat(discountPercent) || 0 
        })
      });
      if (response.ok) {
        alert("🎉 Professional GST Invoice Sent!");
        setBillItems([]);
        setDiscountPercent(0);
        setSelectedCustomer('');
      } else {
        alert("❌ Failed to generate invoice.");
      }
    } catch (err) { alert("❌ Server Error!"); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SELECTION PANEL */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Users size={16}/> 1. Select Client</h3>
          <select 
            className="w-full border rounded-lg px-3 py-2.5 bg-white outline-none focus:border-blue-500 text-gray-700" 
            value={selectedCustomer} 
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">-- Choose Customer --</option>
            {customers.map(c => (
              <option key={c.customer_id} value={c.customer_id}>
                {/* 🔥 ITHU THAAN FIX: combining first and last name */}
                {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Box size={16}/> 2. Add Products</h3>
          <select 
            className="w-full border rounded-lg px-3 py-2.5 mb-3 bg-white outline-none focus:border-blue-500" 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            <option value="">-- Choose Product --</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} (₹{p.price})</option>)}
          </select>
          <button onClick={addProductToBill} className="w-full bg-slate-100 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition">+ Add to Bill</button>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Percent size={16}/> 3. Discount (%)</h3>
          <input 
            type="number" 
            className="w-full border rounded-lg px-3 py-2.5 outline-none focus:border-blue-500" 
            value={discountPercent} 
            onChange={(e) => setDiscountPercent(e.target.value)} 
          />
        </div>
      </div>

      {/* 2. PREVIEW PANEL */}
      <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm flex flex-col">
        <div className="p-5 border-b bg-slate-50 font-bold text-slate-700">Invoice Draft</div>
        <div className="flex-1 p-5 overflow-auto">
          {billItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <FileText size={48} className="opacity-20 mb-2"/>
               <p>Select a customer and add items to preview</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="text-xs uppercase text-gray-400 border-b">
                <tr><th className="pb-3 text-left">Item</th><th className="pb-3 text-right">Price</th><th className="pb-3 text-center">Action</th></tr>
              </thead>
              <tbody>
                {billItems.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0 group">
                    <td className="py-4 font-medium text-slate-700">{item.item_name}</td>
                    <td className="py-4 text-right font-bold text-slate-600">₹ {item.price.toFixed(2)}</td>
                    <td className="py-4 text-center">
                      <button onClick={() => {
                        const newItems = [...billItems];
                        newItems.splice(idx, 1);
                        setBillItems(newItems);
                      }} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* TOTALS SECTION */}
        <div className="p-6 bg-slate-50 border-t rounded-b-xl space-y-3">
          <div className="flex justify-between text-sm text-slate-500 font-medium">
            <span>Subtotal:</span>
            <span>₹ {totals.subtotal.toFixed(2)}</span>
          </div>
          {totals.discountAmt > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 font-bold">
              <span>Discount ({discountPercent}%):</span>
              <span>- ₹ {totals.discountAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-slate-500 font-medium">
            <span>GST (18%):</span>
            <span>₹ {(totals.cgst + totals.sgst).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-2xl font-black pt-4 border-t border-slate-200 mt-2">
            <span className="text-slate-800">Grand Total:</span>
            <span className="text-indigo-600">₹ {totals.grandTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={generateAndSendInvoice} 
            disabled={isGenerating || billItems.length === 0} 
            className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:bg-slate-300 disabled:shadow-none"
          >
            {isGenerating ? "Generating Secure PDF..." : "Finalize & Send via Email"}
          </button>
        </div>
      </div>
    </div>
  );
}