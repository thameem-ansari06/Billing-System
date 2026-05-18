import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Search, RefreshCw, Eye, MoreHorizontal, Zap, 
  Plus, Download, Send, Calendar, ArrowUpRight, CheckCircle2,
  AlertCircle, Clock, Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { API } from '../config';
import { cn } from "@/lib/utils";

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); 
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canEdit } = usePermissions();

  const fetchInvoices = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/invoices/`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchInvoices();
  }, [user?.token]);

  const getStatusConfig = (status) => {
    const s = (status || 'Draft').toLowerCase();
    switch (s) {
      case 'paid':
        return { label: 'Paid', variant: 'success', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'partially paid':
        return { label: 'Partial', variant: 'secondary', icon: Clock, className: 'bg-cyan-50 text-cyan-700 border-cyan-100' };
      case 'sent':
        return { label: 'Sent', variant: 'default', icon: Send, className: 'bg-blue-50 text-blue-700 border-blue-100' };
      case 'overdue':
        return { label: 'Overdue', variant: 'destructive', icon: AlertCircle, className: 'bg-rose-50 text-rose-700 border-rose-100' };
      case 'pending approval':
        return { label: 'Pending', variant: 'warning', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'draft':
      case 'auto-generated':
        return { label: status || 'Draft', variant: 'outline', icon: FileText, className: 'bg-slate-50 text-slate-600 border-slate-200' };
      default:
        return { label: status, variant: 'outline', icon: FileText, className: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
  };

  const autoCount = invoices.filter(inv => inv.is_auto_generated).length;
  const manualCount = invoices.length - autoCount;

  const displayedInvoices = useMemo(() => {
    let list = invoices;
    if (filterMode === 'auto') list = list.filter(inv => inv.is_auto_generated);
    if (filterMode === 'manual') list = list.filter(inv => !inv.is_auto_generated);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(inv =>
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.customer_name || '').toLowerCase().includes(q) ||
        (inv.reference_number || '').toLowerCase().includes(q) ||
        (inv.status || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, searchQuery, filterMode]);

  const [isDownloading, setIsDownloading] = useState(null);
  const handleDownload = async (e, invoiceNumber) => {
    e.preventDefault(); e.stopPropagation();
    if (!user?.token) return;
    setIsDownloading(invoiceNumber);
    try {
      const response = await fetch(`${API}/invoices/generate/${encodeURIComponent(invoiceNumber)}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.file_url) window.open(`${API.replace('/api', '')}${data.file_url}`, '_blank');
      }
    } catch (err) {
      toast.error("Error generating invoice PDF.");
    } finally {
      setIsDownloading(null);
    }
  };

  const [isSending, setIsSending] = useState(null);
  const handleSend = async (invoiceId) => {
    if (!user?.token) return;
    setIsSending(invoiceId);
    try {
      const response = await fetch(`${API}/invoices/${invoiceId}/send/`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        toast.success("Invoice transmitted successfully!");
        fetchInvoices();
      }
    } catch (err) {
      toast.error("Network error during transmission.");
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm border border-indigo-100">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Financial Ledger</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="rounded-md font-bold text-[9px] uppercase tracking-widest bg-slate-50 px-1.5 py-0 h-4">
                {invoices.length} Registered Records
              </Badge>
              {autoCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500">
                  <Zap size={10} className="fill-indigo-500" />
                  <span>{autoCount} Automated Syncs</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Button onClick={fetchInvoices} variant="outline" className="rounded-lg gap-1.5 h-8 font-bold text-xs border-slate-200 text-slate-600 px-3">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Sync
          </Button>
          {canEdit() && (
            <Button onClick={() => navigate('/invoices/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 px-4 text-xs rounded-lg shadow-sm gap-1.5">
              <Plus size={14} /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Advanced Toolbar */}
        <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/30">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <Input
              className="pl-8 h-8 text-xs border-slate-200 rounded-lg bg-white focus-visible:ring-indigo-500/20 font-medium"
              placeholder="Filter by invoice ID, entity name, or tracking reference..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm h-8">
            {[
              { id: 'all', label: 'All', count: invoices.length, icon: Filter },
              { id: 'auto', label: 'Auto', count: autoCount, icon: Zap },
              { id: 'manual', label: 'Manual', count: manualCount, icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-md transition-all font-bold text-[9px] uppercase tracking-widest h-full",
                  filterMode === tab.id 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <tab.icon size={10} className={cn(filterMode === tab.id ? "text-white" : "text-slate-300")} />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table Core */}
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b border-slate-100 h-8">
                <TableHead className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Record Identity</TableHead>
                <TableHead className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Business Entity</TableHead>
                <TableHead className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Timestamp</TableHead>
                <TableHead className="px-3 py-1 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Accounting Status</TableHead>
                <TableHead className="px-3 py-1 text-right text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Ledger Amount</TableHead>
                <TableHead className="px-3 py-1 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <RefreshCw size={24} className="animate-spin text-indigo-500" />
                      <p className="font-bold text-[10px] uppercase tracking-widest">Synchronizing Ledger...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <FileText size={40} className="text-slate-200" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-600 text-sm">No Invoices Detected</p>
                        <p className="text-[10px] font-medium text-slate-400 max-w-xs mx-auto">No records found matching your current filter criteria in the central database.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedInvoices.map((inv) => {
                  const statusConfig = getStatusConfig(inv.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <TableRow
                      key={inv.id}
                      className={cn(
                        "hover:bg-indigo-50/30 transition-all group h-10",
                        inv.is_auto_generated && "border-l-4 border-l-indigo-500"
                      )}
                    >
                      <TableCell className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-md flex items-center justify-center shadow-sm border",
                            inv.status?.toLowerCase() === 'paid' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-400"
                          )}>
                            <FileText size={12} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-slate-800 tracking-tight leading-none">{inv.invoice_number}</p>
                              {inv.is_auto_generated && (
                                <Badge className="bg-indigo-600 text-white border-none text-[8px] px-1 py-0 h-3 flex items-center justify-center font-bold rounded-sm">
                                  AUTO
                                </Badge>
                              )}
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                              REF: {inv.reference_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-1.5">
                        <p className="font-bold text-slate-700 text-xs">{inv.customer_name || 'Individual Client'}</p>
                      </TableCell>

                      <TableCell className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar size={10} className="text-slate-300" />
                          <span className="text-[10px] font-bold">{inv.invoice_date || '—'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-1.5 text-center">
                        <Badge className={cn("rounded-md font-bold text-[9px] uppercase tracking-widest px-1.5 py-0 h-4 gap-1", statusConfig.className)}>
                          <StatusIcon size={10} />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-3 py-1.5 text-right">
                        <p className="font-bold text-indigo-600 text-sm tracking-tight">
                          ₹{parseFloat(inv.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </TableCell>

                      <TableCell className="px-3 py-1.5">
                        <div className="flex items-center justify-center gap-1">
                          {(inv.status === 'Draft' || inv.status === 'Auto-Generated' || !inv.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSending === inv.id}
                              className="h-7 w-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                              onClick={() => handleSend(inv.id)}
                            >
                              {isSending === inv.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isDownloading === inv.invoice_number}
                            className="h-7 w-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                            onClick={(e) => handleDownload(e, inv.invoice_number)}
                          >
                            {isDownloading === inv.invoice_number ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                <MoreHorizontal size={12} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-lg p-1 w-40">
                              <DropdownMenuItem className="rounded-md font-bold text-[10px]" onClick={() => navigate(`/invoices/${inv.id}`)}>
                                <Eye className="mr-2 h-3 w-3" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-md font-bold text-[10px]">
                                <ArrowUpRight className="mr-2 h-3 w-3" /> Export XML
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="rounded-md font-bold text-[10px] text-rose-600 focus:bg-rose-50">
                                <AlertCircle className="mr-2 h-3 w-3" /> Mark Overdue
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Detailed Footer Summary */}
        {!isLoading && displayedInvoices.length > 0 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Data Integrity Verified &bull; Active Ledger Registry
             </div>
             <div className="text-xs font-bold text-slate-500">
                Displaying {displayedInvoices.length} of {invoices.length} Registered Invoices
             </div>
          </div>
        )}
      </div>
    </div>
  );
}