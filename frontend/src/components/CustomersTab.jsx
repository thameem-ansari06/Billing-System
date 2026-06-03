import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Phone, MapPin, Eye, Search, RefreshCw, 
  ChevronRight, Plus, Building2, CreditCard, FileText, 
  Briefcase, Globe, Info, Trash2, Pencil, ExternalLink,
  History, Wallet, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../config';
import { cn } from "@/lib/utils";
import { usePermissions } from '../hooks/usePermissions';

export default function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const navigate = useNavigate();
  const { canDelete, role } = usePermissions();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/customers/`);
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("Fetch Customers Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => 
    (c.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await axios.delete(`${API}/customers/${id}`);
      fetchCustomers();
      setIsDetailsOpen(false);
    } catch (err) {
      alert("Failed to delete customer");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Customer CRM</h1>
            <p className="text-sm font-medium text-slate-500">Manage business entities and their billing profiles.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={fetchCustomers} variant="outline" className="rounded-xl gap-2 h-11 font-bold border-slate-200 text-slate-600">
            <RefreshCw size={16} className={cn(loading && "animate-spin")} /> Sync
          </Button>
          <Button 
            onClick={() => navigate('/customers/new')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black h-11 rounded-xl shadow-lg shadow-indigo-100 gap-2"
          >
            <Plus size={18} /> Add Customer
          </Button>
        </div>
      </div>

      {/* CRM Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              className="pl-11 h-12 border-slate-200 rounded-xl focus-visible:ring-indigo-500/20 bg-slate-50/50" 
              placeholder="Filter by name, company, email or ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
             {filtered.length} total entities
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Organization</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Communication</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status & Balance</TableHead>
                <TableHead className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                       <Users size={64} className="text-slate-300" />
                       <p className="font-bold text-slate-500">
                         {loading ? "Establishing CRM link..." : "No matching business entities found."}
                       </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow 
                    key={c.id} 
                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    onClick={() => handleRowClick(c)}
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                          {(c.display_name || c.first_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-none mb-1">{c.display_name || `${c.first_name} ${c.last_name}`}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.customer_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                          <Building2 size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-600">{c.company_name || 'Individual Entity'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                          <Mail size={14} className="text-indigo-400"/> {c.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                          <Phone size={14} className="text-slate-300"/> {c.phone_work || c.phone_mobile || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                       <div className="flex flex-col gap-2">
                          <Badge className={cn(
                            "w-fit font-black text-[9px] uppercase tracking-widest rounded-lg px-2",
                            c.customer_type === 'Business' ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}>
                            {c.customer_type}
                          </Badge>
                          {/* Placeholder for balance logic if added later */}
                          <p className="text-[10px] font-bold text-slate-400 ml-1">Balance: ₹0.00</p>
                       </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                           <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="rounded-xl p-1 w-48">
                           <DropdownMenuItem className="rounded-lg font-bold text-xs" onClick={() => handleRowClick(c)}>
                             <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Profile
                           </DropdownMenuItem>
                           <DropdownMenuItem className="rounded-lg font-bold text-xs" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                             <Pencil className="mr-2 h-4 w-4 text-slate-400" /> Edit Details
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem 
                              className="rounded-lg font-bold text-xs text-rose-600 focus:bg-rose-50" 
                              onClick={() => handleDelete(c.id)}
                              disabled={!canDelete()}
                           >
                             <Trash2 className="mr-2 h-4 w-4" /> Delete Entity
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Customer Details Slide-out Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
          {selectedCustomer && (
            <>
              <SheetHeader className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative">
                <div className="absolute top-4 right-4 text-white/40">
                   <Users size={80} />
                </div>
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black shadow-lg">
                    {(selectedCustomer.display_name || selectedCustomer.first_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="text-3xl font-black text-white leading-tight">
                      {selectedCustomer.display_name || 'Individual Account'}
                    </SheetTitle>
                    <SheetDescription className="text-white/70 font-bold uppercase tracking-[0.2em] text-[11px] mt-2 flex items-center gap-2">
                       <CreditCard size={12} /> Account: {selectedCustomer.customer_id}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 bg-slate-50/50">
                 {/* Contact & Business Profile */}
                 <section className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone (Work)</p>
                       <p className="font-bold text-slate-800">{selectedCustomer.phone_work || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Contact</p>
                       <p className="font-bold text-slate-800">{selectedCustomer.phone_mobile || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Corporate Email</p>
                       <p className="font-bold text-slate-800">{selectedCustomer.email || 'N/A'}</p>
                    </div>
                 </section>

                 {/* Tax & Compliance Details */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <ShieldCheck size={16} className="text-indigo-500" /> Compliance & Tax Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST Treatment</p>
                          <p className="text-sm font-bold text-slate-700">{selectedCustomer.gst_treatment || 'Unregistered'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supply Zone</p>
                          <p className="text-sm font-bold text-slate-700">{selectedCustomer.place_of_supply || 'N/A'}</p>
                       </div>
                       <div className="col-span-2 pt-4 mt-2 border-t border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Permanent Account Number (PAN)</p>
                          <p className="text-sm font-mono font-bold text-indigo-600 uppercase tracking-widest">{selectedCustomer.pan || 'Not Disclosed'}</p>
                       </div>
                    </div>
                 </section>

                 {/* Address Mapping */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <MapPin size={16} className="text-rose-500" /> Billing Infrastructure
                    </h3>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                       <p className="text-sm text-slate-600 leading-relaxed font-medium">
                          {selectedCustomer.billing_address_1 || 'No primary address recorded'}<br/>
                          {selectedCustomer.billing_address_2 && <>{selectedCustomer.billing_address_2}<br/></>}
                          {selectedCustomer.billing_district && <span className="font-bold text-slate-800">{selectedCustomer.billing_district}, </span>}
                          {selectedCustomer.billing_state && <span className="font-bold text-slate-800">{selectedCustomer.billing_state} </span>}
                          {selectedCustomer.billing_pincode && <Badge variant="secondary" className="ml-2 font-mono">{selectedCustomer.billing_pincode}</Badge>}
                       </p>
                    </div>
                 </section>

                 {/* Activity Summary (Placeholder) */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <History size={16} className="text-indigo-500" /> Transaction History
                    </h3>
                    <div className="bg-slate-100/50 p-10 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                       <FileText size={32} className="text-slate-300 mb-3" />
                       <p className="text-xs font-bold text-slate-500">No recent transactions indexed.</p>
                       <p className="text-[10px] text-slate-400 mt-1">Order and invoice history will sync once linked.</p>
                    </div>
                 </section>
              </div>

              {/* Sheet Footer */}
              <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
                 <Button className="flex-1 bg-slate-900 text-white font-black h-12 rounded-xl shadow-lg" onClick={() => navigate(`/customers/${selectedCustomer.id}/edit`)}>
                   <Pencil size={18} className="mr-2" /> Edit Entity
                 </Button>
                 <Button variant="outline" className="flex-1 border-slate-200 font-black h-12 rounded-xl text-slate-600 gap-2">
                   <Wallet size={18} className="text-indigo-500" /> Statement
                 </Button>
                 {canDelete() && (
                   <Button 
                    variant="ghost" 
                    className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 p-0"
                    onClick={() => handleDelete(selectedCustomer.id)}
                   >
                     <Trash2 size={20} />
                   </Button>
                 )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}