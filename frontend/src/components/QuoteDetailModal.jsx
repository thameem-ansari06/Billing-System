import React, { useState, useEffect } from 'react';
import { X, Download, FileText, User, Calendar, Package, RefreshCw, Zap, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const StatusPill = ({ status }) => {
  if (!status) return null;
  const s = status.toLowerCase();
  const map = {
    pending_approval: { label: 'Pending Approval', icon: Clock,        cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    sent:             { label: 'Pending Approval', icon: Clock,        cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved:         { label: 'Approved',         icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    accepted:         { label: 'Approved',         icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected:         { label: 'Rejected',         icon: XCircle,      cls: 'bg-red-100 text-red-700 border-red-200' },
    declined:         { label: 'Rejected',         icon: XCircle,      cls: 'bg-red-100 text-red-700 border-red-200' },
    draft:            { label: 'Draft',            icon: FileText,     cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  const { label, icon: Icon, cls } = map[s] || { label: status, icon: FileText, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <Badge className={`${cls} font-bold px-3 py-1 flex items-center gap-1.5 text-sm`}>
      <Icon size={13} /> {label}
    </Badge>
  );
};

export default function QuoteDetailModal({ quoteId, onClose, onStatusChange }) {
  const { user } = useAuth();
  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quoteId || !user?.token) return;
    const headers = { Authorization: `Bearer ${user.token}` };
    setIsLoading(true);
    setError(null);
    fetch(`http://localhost:8000/api/quotes/${quoteId}/detail`, { headers })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — check backend logs`);
        return r.json();
      })
      .then(data => { setQuote(data); setIsLoading(false); })
      .catch(e => { setError(e.message); setIsLoading(false); });
  }, [quoteId, user?.token]);

  const handleDownloadPdf = async () => {
    if (!user?.token) return;
    const headers = { Authorization: `Bearer ${user.token}` };
    setIsGeneratingPdf(true);
    try {
      const res = await fetch(`http://localhost:8000/api/quotes/${quoteId}/pdf`, { headers });
      if (!res.ok) throw new Error('PDF generation failed — HTTP ' + res.status);
      const data = await res.json();
      if (data.file_url) {
        window.open(`http://localhost:8000${data.file_url}`, '_blank');
      } else {
        throw new Error("No file URL received");
      }
    } catch (e) {
      alert('PDF download failed: ' + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!user?.token) return;
    const headers = { Authorization: `Bearer ${user.token}` };
    setStatusUpdating(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/quotes/${quoteId}/status?status=${newStatus}`,
        { method: 'PUT', headers }
      );
      if (!res.ok) throw new Error('Status update failed — HTTP ' + res.status);
      const data = await res.json();
      setQuote(prev => ({ ...prev, status: data.status }));
      onStatusChange?.(newStatus);
    } catch (e) {
      alert('Status update failed: ' + e.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Trap keyboard escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Sticky Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 leading-none">
                {isLoading ? 'Loading…' : quote?.quote_number ?? 'Quote Detail'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Quote Bill Preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
              <RefreshCw size={36} className="animate-spin mb-3 opacity-30" />
              <p className="text-sm">Fetching quote details…</p>
            </div>
          )}

          {error && (
            <div className="p-10 text-center text-red-500">
              <XCircle size={40} className="mx-auto mb-2 opacity-40" />
              <p className="font-bold">Failed to load quote</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && quote && (
            <div className="p-6 space-y-6">

              {/* Meta cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><User size={10} /> Customer</span>
                  <p className="font-bold text-slate-800 text-sm leading-tight">{quote.customer_name || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Calendar size={10} /> Quote Date</span>
                  <p className="font-bold text-slate-800 text-sm">{quote.quote_date || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Calendar size={10} /> Expires</span>
                  <p className="font-bold text-slate-800 text-sm">{quote.expiry_date || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                  <StatusPill status={quote.status} />
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {quote.is_bulk_request && (
                  <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                    <Package size={12} /> Bulk Order (&gt;5 items)
                  </span>
                )}
                {quote.order_id && (
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                    <Zap size={12} /> Auto-Routed from Order #{quote.order_id}
                  </span>
                )}
              </div>

              {/* Items table */}
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Item / Description</th>
                      <th className="p-3 text-center">GST Type</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Rate (₹)</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quote.items?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 text-xs">No line items found for this quote.</td>
                      </tr>
                    ) : (
                      quote.items?.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-slate-400 font-bold text-xs">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-700">{item.item_details}</td>
                          <td className="p-3 text-center">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {item.tax_type || '—'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-600">₹{fmt(item.rate)}</td>
                          <td className="p-3 text-right font-black text-indigo-600">₹{fmt(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tax & Totals summary */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{fmt(quote.subtotal)}</span>
                  </div>
                  {quote.igst > 0 ? (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>IGST</span>
                      <span className="font-semibold">₹{fmt(quote.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>CGST</span>
                        <span className="font-semibold">₹{fmt(quote.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>SGST</span>
                        <span className="font-semibold">₹{fmt(quote.sgst)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between">
                    <span className="font-black text-slate-800">Grand Total</span>
                    <span className="font-black text-indigo-600 text-lg">₹{fmt(quote.grand_total)}</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Sticky Footer Actions ──────────────────────────────────────── */}
        {!isLoading && !error && quote && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 sticky bottom-0 flex flex-wrap items-center justify-between gap-3">
            {/* Status actions — only for pending */}
            <div className="flex items-center gap-2">
              {(quote.status === 'pending_approval' || quote.status === 'sent') && (
                <>
                  <Button
                    disabled={statusUpdating}
                    onClick={() => handleStatusUpdate('approved')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 text-sm gap-2"
                  >
                    <CheckCircle size={15} /> Approve
                  </Button>
                  <Button
                    disabled={statusUpdating}
                    onClick={() => handleStatusUpdate('rejected')}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-9 px-4 text-sm gap-2"
                  >
                    <XCircle size={15} /> Reject
                  </Button>
                </>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm font-bold border-slate-200 text-slate-600">
                Close
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 text-sm gap-2"
              >
                {isGeneratingPdf
                  ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                  : <><Download size={14} /> Download PDF</>
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
