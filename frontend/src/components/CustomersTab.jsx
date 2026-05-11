import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Phone, MapPin, Eye, Search, RefreshCw, 
  ChevronRight, Plus, Building2, CreditCard, FileText, 
  Briefcase, Globe, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { API } from '../config';

export default function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const navigate = useNavigate();

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
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shadow-inner">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Customer CRM</h1>
            <p className="text-sm font-medium text-slate-500">Manage business entities and their billing profiles.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={fetchCustomers} variant="outline" className="gap-2 h-11 font-bold border-slate-200 text-slate-600 flex-1 md:flex-none">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync
          </Button>
          <Button onClick={() => navigate('/customers/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 flex-1 md:flex-none gap-2">
            <Plus size={18} /> New Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                className="pl-11 h-11 border-slate-200 rounded-xl focus:ring-blue-500" 
                placeholder="Search by name, company, or email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</TableHead>
                  <TableHead className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Company</TableHead>
                  <TableHead className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</TableHead>
                  <TableHead className="p-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center text-slate-400 font-medium">
                      {loading ? "Loading customers..." : "No customers found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow 
                      key={c.id} 
                      className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedCustomer?.id === c.id ? 'bg-blue-50/30' : ''}`}
                      onClick={() => setSelectedCustomer(c)}
                    >
                      <TableCell className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
                            {(c.display_name || c.first_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 leading-none">{c.display_name || `${c.first_name} ${c.last_name}`}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{c.customer_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-5">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-600">{c.company_name || 'Individual'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                            <Mail size={12} className="text-slate-400"/> {c.email || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Phone size={12} className="text-slate-400"/> {c.phone_work || c.phone_mobile || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-5 text-center">
                        <Badge className={`${c.customer_type === 'Business' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} font-black text-[10px] uppercase tracking-widest`}>
                          {c.customer_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Profile Details Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in slide-in-from-right duration-300">
               <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-200">
                    {(selectedCustomer.display_name || selectedCustomer.first_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">{selectedCustomer.display_name || 'Unnamed Customer'}</h2>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 mt-1 uppercase text-[10px] font-black tracking-widest">
                       ID: {selectedCustomer.customer_id}
                    </Badge>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-3">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Info size={14} /> Tax & Billing Info
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Treatment</p>
                          <p className="text-xs font-bold text-slate-700">{selectedCustomer.gst_treatment || 'Unregistered'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Place of Supply</p>
                          <p className="text-xs font-bold text-slate-700">{selectedCustomer.place_of_supply || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PAN Number</p>
                          <p className="text-xs font-mono font-bold text-slate-700 uppercase">{selectedCustomer.pan || 'Not Provided'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={14} /> Billing Address
                     </h3>
                     <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-sm text-slate-600 leading-relaxed">
                           {selectedCustomer.billing_address_1 || 'No address set'}<br/>
                           {selectedCustomer.billing_address_2 && <>{selectedCustomer.billing_address_2}<br/></>}
                           {selectedCustomer.billing_city && `${selectedCustomer.billing_city}, `}
                           {selectedCustomer.billing_state && `${selectedCustomer.billing_state} `}
                           {selectedCustomer.billing_pincode}
                        </p>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex gap-2">
                     <Button className="flex-1 bg-slate-900 text-white font-bold h-11 rounded-xl">Edit</Button>
                     <Button variant="outline" className="flex-1 border-slate-200 font-bold h-11 rounded-xl text-slate-600">Statement</Button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center h-[400px]">
               <Users size={48} className="text-slate-200 mb-4" />
               <p className="font-bold text-slate-500">Select a Customer</p>
               <p className="text-sm text-slate-400 mt-1 max-w-[180px]">Select a row to see full profile, tax details, and addresses.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}