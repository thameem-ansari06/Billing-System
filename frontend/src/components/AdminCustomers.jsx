import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Eye, Search, RefreshCw, ShoppingCart, UserCheck, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import { API } from '../config';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { user } = useAuth();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/customers`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setCustomers(res.data || []);
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
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-inner">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Customer Directory</h1>
            <p className="text-[10px] font-medium text-slate-500">Manage portal users and their shipping profiles.</p>
          </div>
        </div>
        <Button onClick={fetchCustomers} variant="outline" className="gap-1.5 h-8 px-3 text-xs font-bold border-slate-200 text-slate-600 rounded-lg shadow-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                className="pl-8 h-8 text-xs border-slate-200 rounded-lg focus:ring-indigo-500" 
                placeholder="Search customers..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-500 text-[9px] font-bold uppercase tracking-widest h-8">
                  <th className="px-3 py-1">Customer Identity</th>
                  <th className="px-3 py-1">Contact Details</th>
                  <th className="px-3 py-1">Primary Location</th>
                  <th className="px-3 py-1 text-center">Total Orders</th>
                  <th className="px-3 py-1 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr 
                    key={c.id} 
                    className={`hover:bg-slate-50/50 transition-colors group cursor-pointer h-10 ${selectedCustomer?.id === c.id ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200 text-[10px]">
                          {c.full_name?.[0] || c.username[0].toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 leading-none">{c.full_name || 'Incomplete Profile'}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">@{c.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                          <Mail size={10} className="text-slate-400"/> {c.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <Phone size={10} className="text-slate-400"/> {c.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                        <MapPin size={10} className="text-indigo-400"/> {c.district || 'Location unset'}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[9px] px-1.5 py-0 h-4">
                         {c.total_orders} Orders
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                       <Button variant="ghost" size="sm" className="font-bold text-[10px] text-indigo-600 hover:bg-indigo-50 rounded-md h-6 px-2">
                          View <ChevronRight size={12} className="ml-1" />
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profile Details Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {selectedCustomer ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 animate-in slide-in-from-right duration-300">
               <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-indigo-200">
                    {selectedCustomer.full_name?.[0] || selectedCustomer.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">{selectedCustomer.full_name || 'Guest User'}</h2>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mt-1 uppercase text-[8px] font-bold tracking-widest px-1.5 py-0">
                       <UserCheck size={8} className="mr-1"/> Portal Member
                    </Badge>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Shield size={12} /> Shipping Information
                     </h3>
                     <div className="space-y-3">
                        <div className="flex gap-2">
                           <div className="p-1.5 bg-slate-50 text-slate-400 rounded-md h-fit"><MapPin size={12}/></div>
                           <div className="text-xs">
                              <p className="font-bold text-slate-700 text-[10px]">Residential Address</p>
                              <p className="text-slate-500 text-[10px] leading-tight mt-0.5">
                                 {selectedCustomer.address_line || 'No address provided'}<br/>
                                 {selectedCustomer.district && `${selectedCustomer.district}, ${selectedCustomer.state} ${selectedCustomer.pincode}`}
                              </p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <div className="p-1.5 bg-slate-50 text-slate-400 rounded-md h-fit"><ShoppingCart size={12}/></div>
                           <div className="text-xs">
                              <p className="font-bold text-slate-700 text-[10px]">Billing Identity</p>
                              <p className="text-slate-500 mt-0.5 font-mono text-[9px] uppercase tracking-tighter">
                                 GSTIN: {selectedCustomer.gstin || 'No GSTIN provided'}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                     <Button className="flex-1 bg-slate-900 text-white text-xs font-bold h-8 rounded-lg">Edit</Button>
                     <Button variant="outline" className="flex-1 border-slate-200 text-xs font-bold h-8 rounded-lg text-slate-600">Orders</Button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center flex flex-col items-center justify-center h-full min-h-[250px]">
               <Users size={32} className="text-slate-200 mb-2" />
               <p className="font-bold text-slate-500 text-xs">Select a customer</p>
               <p className="text-[10px] text-slate-400 mt-1 max-w-[150px]">Click on a row to see full profile details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
