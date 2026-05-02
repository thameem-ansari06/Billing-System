import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Eye, Search, RefreshCw, ShoppingCart, UserCheck, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = 'http://localhost:8000';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { user } = useAuth();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/customers`, {
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
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Customer Directory</h1>
            <p className="text-sm font-medium text-slate-500">Manage portal users and their shipping profiles.</p>
          </div>
        </div>
        <Button onClick={fetchCustomers} variant="outline" className="gap-2 h-11 font-bold border-slate-200 text-slate-600">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync Directory
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                className="pl-11 h-11 border-slate-200 rounded-xl focus:ring-indigo-500" 
                placeholder="Search customers..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="p-5">Customer Identity</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5">Primary Location</th>
                  <th className="p-5 text-center">Total Orders</th>
                  <th className="p-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr 
                    key={c.id} 
                    className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedCustomer?.id === c.id ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
                          {c.full_name?.[0] || c.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 leading-none">{c.full_name || 'Incomplete Profile'}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">@{c.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                          <Mail size={12} className="text-slate-400"/> {c.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Phone size={12} className="text-slate-400"/> {c.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                        <MapPin size={14} className="text-indigo-400"/> {c.city || 'Location unset'}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-black">
                         {c.total_orders} Orders
                      </Badge>
                    </td>
                    <td className="p-5 text-center">
                       <Button variant="ghost" size="sm" className="font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg h-9 px-4">
                          View Details <ChevronRight size={14} className="ml-1" />
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profile Details Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in slide-in-from-right duration-300">
               <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-200">
                    {selectedCustomer.full_name?.[0] || selectedCustomer.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">{selectedCustomer.full_name || 'Guest User'}</h2>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mt-1 uppercase text-[10px] font-black tracking-widest">
                       <UserCheck size={10} className="mr-1"/> Portal Member
                    </Badge>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-3">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield size={14} /> Shipping Information
                     </h3>
                     <div className="space-y-4">
                        <div className="flex gap-3">
                           <div className="p-2 bg-slate-50 text-slate-400 rounded-lg h-fit"><MapPin size={16}/></div>
                           <div className="text-sm">
                              <p className="font-bold text-slate-700">Residential Address</p>
                              <p className="text-slate-500 leading-relaxed mt-0.5">
                                 {selectedCustomer.address_line || 'No address provided'}<br/>
                                 {selectedCustomer.city && `${selectedCustomer.city}, ${selectedCustomer.state} ${selectedCustomer.pincode}`}
                              </p>
                           </div>
                        </div>
                        <div className="flex gap-3">
                           <div className="p-2 bg-slate-50 text-slate-400 rounded-lg h-fit"><ShoppingCart size={16}/></div>
                           <div className="text-sm">
                              <p className="font-bold text-slate-700">Billing Identity</p>
                              <p className="text-slate-500 mt-0.5 font-mono text-xs uppercase tracking-tighter">
                                 GSTIN: {selectedCustomer.gstin || 'No GSTIN provided'}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex gap-2">
                     <Button className="flex-1 bg-slate-900 text-white font-bold h-11 rounded-xl">Edit User</Button>
                     <Button variant="outline" className="flex-1 border-slate-200 font-bold h-11 rounded-xl text-slate-600">View Orders</Button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center h-[400px]">
               <Users size={48} className="text-slate-200 mb-4" />
               <p className="font-bold text-slate-500">Select a customer</p>
               <p className="text-sm text-slate-400 mt-1 max-w-[180px]">Click on a row to see full profile and shipping details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
