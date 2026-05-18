import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { API } from '../../config';

export default function CustomerInvoiceView() {
  const { id } = useParams(); // This is the invoice_number
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    // Dynamically load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    fetchInvoice();

    return () => {
      document.body.removeChild(script);
    };
  }, [id, user?.token]);

  const fetchInvoice = async () => {
    if (!user?.token) return;
    try {
      // Decode the ID in case it contains slashes like INV/2026/001
      const invoiceNumber = decodeURIComponent(id);
      const res = await fetch(`${API}/invoices/invoices/${encodeURIComponent(invoiceNumber)}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        if (data.status === 'Paid') {
          setPaymentSuccess(true);
        }
      } else {
        toast.error("Invoice not found");
        navigate('/customer/invoices');
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsPaying(true);
    try {
      // 1. Create Order
      const orderRes = await fetch(`${API}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ invoice_number: invoice.invoice_number })
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        throw new Error(errorData.detail || "Failed to create order");
      }

      const orderData = await orderRes.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key_id, 
        amount: orderData.amount, 
        currency: orderData.currency,
        name: "Enterprise GST Billing",
        description: `Payment for Invoice ${invoice.invoice_number}`,
        order_id: orderData.order_id,
        callback_url: `${API}/payments/verify?invoice_number=${invoice.invoice_number}&invoice_id=${invoice.id}`,
        notes: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number
        },
        handler: async function (response) {
          try {
            // 3. Verify Payment Signature on Backend
            const verifyRes = await fetch(`${API}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_number: invoice.invoice_number,
                invoice_id: invoice.id
              })
            });

            if (verifyRes.ok) {
              setPaymentSuccess(true);
              toast.success("Payment verified and logistics triggered!");
              fetchInvoice(); // Refresh to get the challan URL and paid status
            } else {
              throw new Error("Signature verification failed");
            }
          } catch (err) {
            toast.error(err.message);
            setIsPaying(false);
          }
        },
        prefill: {
          name: user.full_name || invoice.customer_name,
          email: user.email || invoice.email,
          contact: user.phone || ""
        },
        theme: {
          color: "#4f46e5" // Indigo 600
        },
        modal: {
          ondismiss: function() {
            setIsPaying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        toast.error(`Payment Failed: ${response.error.description}`);
        setIsPaying(false);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.message);
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" className="text-slate-500" onClick={() => navigate('/customer/invoices')}>
          <ArrowLeft size={20} className="mr-2" /> Back to Invoices
        </Button>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        {paymentSuccess && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 p-2 text-center text-white font-bold text-xs animate-in slide-in-from-top duration-500">
            Payment Successful! Your logistics are being arranged.
          </div>
        )}
        
        <div className={`transition-all duration-500 ${paymentSuccess ? 'mt-6' : ''}`}>
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-1">
                Invoice {invoice.invoice_number}
              </h1>
              <div className="flex items-center gap-2">
                <Badge className={
                  invoice.status === 'Paid' ? "bg-emerald-100 text-emerald-700" :
                  invoice.status === 'Sent' ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                }>
                  {invoice.status}
                </Badge>
                <span className="text-[10px] font-medium text-slate-500">Issued: {invoice.invoice_date}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium text-slate-500 mb-0.5">Total Amount Due</p>
              <h2 className="text-2xl sm:text-3xl font-black text-indigo-600">
                ₹{parseFloat(invoice.grand_total).toLocaleString('en-IN')}
              </h2>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-bold text-slate-800">Itemized Breakdown</h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              {invoice.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                  <div>
                    <p className="font-bold text-xs text-slate-700">{item.item_details}</p>
                    <p className="text-[10px] text-slate-500">Qty: {item.quantity} × ₹{item.rate}</p>
                  </div>
                  <div className="font-bold text-sm text-slate-800">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pr-4 space-y-1">
              <div className="w-56">
                <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal}</span>
                </div>
                
                {invoice.customer_company_name ? (
                  <>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>CGST (9%)</span>
                      <span>₹{invoice.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>SGST (9%)</span>
                      <span>₹{invoice.sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>GST Total</span>
                    <span>₹{parseFloat(invoice.cgst + invoice.sgst + invoice.igst).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-base font-black text-slate-800 mt-2 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span>₹{parseFloat(invoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {invoice.settled_amount > 0 && (
                  <>
                    <div className="flex justify-between text-[10px] font-bold text-blue-600 mt-1">
                      <span>Settled from Advance</span>
                      <span>- ₹{parseFloat(invoice.settled_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 mt-1 pt-1 border-t-2 border-slate-900 border-dashed">
                      <span>Balance Due</span>
                      <span>₹{Math.max(0, invoice.grand_total - invoice.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* B2B Bill To Section */}
          {invoice.customer_company_name && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Bill To (Business)</p>
                <h4 className="text-sm font-bold text-slate-800">{invoice.customer_company_name}</h4>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold text-[9px] px-1 py-0 h-4">
                    GSTIN: {invoice.customer_gst_no}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm inline-block">
                  <p className="text-[8px] uppercase font-bold text-blue-600 tracking-widest leading-none mb-1">Tax Type</p>
                  <p className="font-bold text-[10px] text-slate-700">GST B2B Invoice</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100 gap-4">
            <div className="flex items-center gap-3 text-indigo-800">
              <ShieldCheck size={20} className="text-indigo-600" />
              <div>
                <p className="font-bold text-sm">Secure Checkout</p>
                <p className="text-[10px] font-medium text-indigo-600/80">Powered by Razorpay</p>
              </div>
            </div>
            
            {invoice.status !== 'Paid' ? (
              <Button 
                onClick={handlePayment} 
                disabled={isPaying}
                className="bg-indigo-600 w-full sm:w-auto hover:bg-indigo-700 text-white font-bold text-sm px-6 h-10 rounded-lg shadow-md shadow-indigo-200 transition-all active:scale-95"
              >
                {isPaying ? <Loader2 className="mr-2 animate-spin" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                Accept & Pay ₹{parseFloat(invoice.grand_total).toLocaleString('en-IN')}
              </Button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {invoice.challan_url && (
                  <Button 
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 font-bold bg-white h-10 px-4 text-xs"
                    onClick={() => window.open(`${API.replace('/api', '')}${invoice.challan_url}`, '_blank')}
                  >
                    <FileText size={14} className="mr-1.5" /> View Delivery Challan
                  </Button>
                )}
                <Button 
                  disabled
                  className="bg-emerald-100 text-emerald-700 font-bold text-sm px-6 h-10 rounded-lg opacity-100"
                >
                  <CheckCircle className="mr-1.5" size={14} /> Paid
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
