import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, RefreshCw, Eye, MoreHorizontal, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import QuoteDetailModal from './QuoteDetailModal';

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  const fetchQuotes = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/quotes/', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      } else {
        console.error('Quote fetch failed:', response.status);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchQuotes();
  }, [user?.token]);

  const getStatusBadge = (status) => {
    if (!status) return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold px-3 py-1">Unknown</Badge>;
    switch (status.toLowerCase()) {
      case 'approved':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold px-3 py-1">Approved</Badge>;
      case 'rejected':
      case 'declined':
        return <Badge className="bg-red-100 text-red-700 border-red-200 font-bold px-3 py-1">Rejected</Badge>;
      case 'pending_approval':
      case 'sent':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-3 py-1">Pending Approval</Badge>;
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-bold px-3 py-1">Draft</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold px-3 py-1">{status}</Badge>;
    }
  };

  const pendingCount = quotes.filter(q => q.status === 'pending_approval' || q.status === 'sent').length;
  const bulkCount = quotes.filter(q => q.is_bulk_request).length;

  // Live search + filter
  const displayedQuotes = useMemo(() => {
    let list = quotes;

    if (filterMode === 'pending') list = list.filter(q => q.status === 'pending_approval' || q.status === 'sent');
    if (filterMode === 'bulk') list = list.filter(q => q.is_bulk_request);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(quote =>
        (quote.quote_number || '').toLowerCase().includes(q) ||
        (quote.customer_name || '').toLowerCase().includes(q) ||
        (quote.reference_number || '').toLowerCase().includes(q) ||
        (quote.status || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [quotes, searchQuery, filterMode]);

  return (
    <>
      <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Global Quotes Dashboard</h1>
            <p className="text-sm font-medium text-slate-500">
              {quotes.length} total &mdash;
              {pendingCount > 0 && <span className="ml-1 text-amber-600 font-semibold">{pendingCount} awaiting review</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={fetchQuotes} variant="outline" className="gap-2 h-11 font-bold border-slate-200 text-slate-600">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
          {canEdit() && (
            <Button onClick={() => navigate('/quotes/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-lg shadow-indigo-100">
              Create New Quote
            </Button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              className="pl-11 h-11 border-slate-200 rounded-xl"
              placeholder="Search by quote number or customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Quick-filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-sm font-semibold">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${filterMode === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All ({quotes.length})
            </button>
            <button
              onClick={() => setFilterMode('pending')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${filterMode === 'pending' ? 'bg-white shadow text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterMode('bulk')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${filterMode === 'bulk' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Package size={13} /> Bulk ({bulkCount})
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-8 text-center text-slate-400 animate-pulse">
            <RefreshCw size={32} className="mx-auto mb-2 opacity-30 animate-spin" />
            <p className="text-sm">Loading quotes…</p>
          </div>
        )}

        {!isLoading && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5">Reference</th>
                  <th className="p-5">Customer Identity</th>
                  <th className="p-5">Issue Date</th>
                  <th className="p-5 text-center">Current Status</th>
                  <th className="p-5 text-right">Grand Total</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedQuotes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-20 text-center text-slate-400">
                      <FileText size={56} className="mx-auto mb-4 opacity-10" />
                      <p className="font-bold text-slate-600">No quotes found</p>
                      <p className="text-sm mt-1">
                        {searchQuery ? `No results for "${searchQuery}"` : 'Quotes will appear here once generated.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedQuotes.map((q) => (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50/50 transition-colors group ${q.is_bulk_request ? 'border-l-2 border-l-purple-400' : ''}`}
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shadow-sm ${q.status === 'pending_approval' || q.status === 'sent' ? 'bg-amber-400 shadow-amber-300' : 'bg-indigo-500 shadow-indigo-200'}`} style={{ boxShadow: '0 0 8px currentColor' }} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-800 leading-none">{q.quote_number}</p>
                              {q.is_bulk_request && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 font-bold hover:bg-purple-100">
                                  <Package size={9} className="mr-0.5" /> Bulk
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Ref: {q.reference_number || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <p className="font-bold text-slate-700">{q.customer_name}</p>
                      </td>
                      <td className="p-5 text-sm font-medium text-slate-500">{q.quote_date || '—'}</td>
                      <td className="p-5 text-center">{getStatusBadge(q.status)}</td>
                      <td className="p-5 text-right">
                        <p className="font-black text-indigo-600 tracking-tight">₹{parseFloat(q.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="View Quote Detail"
                            onClick={() => setSelectedQuoteId(q.id)}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                            <MoreHorizontal size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && displayedQuotes.length > 0 && (
          <div className="p-3 border-t border-slate-100 text-xs text-slate-400 text-right pr-5">
            Showing {displayedQuotes.length} of {quotes.length} quotes
          </div>
        )}
      </div>
      </div>

      {/* Quote Detail Modal — rendered as Fragment sibling so it can use fixed positioning */}
      {selectedQuoteId && (
        <QuoteDetailModal
          quoteId={selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          onStatusChange={() => { fetchQuotes(); setSelectedQuoteId(null); }}
        />
      )}
    </>
  );
}
