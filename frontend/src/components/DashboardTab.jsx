import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, Package, Truck, FileText, 
  AlertTriangle, Search, Filter, ArrowUpRight, 
  Clock, CheckCircle, MoreHorizontal, UserPlus,
  IndianRupee, ShoppingBag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:8000/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [datasets, setDatasets] = useState({
    sales: { invoices: [], orders: [] },
    logistics: [],
    inventory: [],
    users: []
  });

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [statsRes, logsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard-stats`, { headers }),
        axios.get(`${API}/admin/activity-logs`, { headers })
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      toast.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchTabDataset = async (tab) => {
    const headers = { Authorization: `Bearer ${user.token}` };
    try {
      if (tab === 'sales') {
        const [invRes, ordRes] = await Promise.all([
          axios.get(`${API}/invoices`, { headers }),
          axios.get(`${API}/orders`, { headers })
        ]);
        const invList = Array.isArray(invRes.data) ? invRes.data : (invRes.data.invoices || []);
        const ordList = Array.isArray(ordRes.data) ? ordRes.data : (ordRes.data.orders || []);
        setDatasets(prev => ({ ...prev, sales: { invoices: invList, orders: ordList } }));
      } else if (tab === 'logistics') {
        const res = await axios.get(`${API}/delivery-tasks`, { headers });
        setDatasets(prev => ({ ...prev, logistics: res.data }));
      } else if (tab === 'inventory') {
        const res = await axios.get(`${API}/products`, { headers });
        setDatasets(prev => ({ ...prev, inventory: res.data.products || [] }));
      } else if (tab === 'users') {
        const res = await axios.get(`${API}/admin/customers`, { headers });
        setDatasets(prev => ({ ...prev, users: res.data }));
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch ${tab} data`);
    }
  };

  useEffect(() => {
    if (user?.token) fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (user?.token && activeTab !== 'overview') fetchTabDataset(activeTab);
  }, [activeTab, user]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 w-full">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Control Center...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Command Center</h1>
          <p className="text-slate-500 text-sm font-medium">Global operations & real-time synchronization</p>
        </div>
        <div className="relative group max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <Input 
            placeholder="Search Invoice #, Customer Phone..." 
            className="pl-12 h-12 bg-white border-slate-100 rounded-2xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Revenue" value={`₹${stats?.total_revenue?.toLocaleString('en-IN')}`} icon={<IndianRupee />} color="indigo" trend="+12% from last month" />
        <MetricCard title="Pending Invoices" value={stats?.pending_invoices_count} icon={<FileText />} color="amber" trend="Action required" />
        <MetricCard title="Active Shipments" value={stats?.active_delivery_tasks_count} icon={<Truck />} color="emerald" trend="Real-time tracking" />
        <MetricCard title="Inventory Alerts" value={stats?.low_stock_products_count} icon={<AlertTriangle />} color="rose" trend="Items near zero stock" />
      </div>

      <div className="space-y-6">
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
          {['overview', 'sales', 'logistics', 'inventory', 'users'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-800">Revenue Analysis</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Sales Trends</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.monthly_sales || []}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '12px'}} />
                    <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-800">Operational Log</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Real-time actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {logs.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <Clock className="mx-auto text-slate-200" size={32} />
                    <p className="text-xs font-bold text-slate-400">No activity yet</p>
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700 leading-tight">{log.action}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{log.category}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-slate-400">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'logistics' && (
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
              <div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Logistics Control</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Unified shipment tracking by invoice_number</CardDescription>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest">Assign Driver</Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8">Tracking ID</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Destination</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Personnel</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.logistics.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center text-xs font-black text-slate-400 uppercase tracking-widest">No active shipments found</TableCell></TableRow>
                ) : (
                  datasets.logistics.map((task) => (
                    <TableRow key={task.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                      <TableCell className="font-black text-indigo-600 pl-8">#{task.invoice_number || task.id}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600 max-w-[200px] truncate">{task.customer_address}</TableCell>
                      <TableCell className="text-xs font-black text-slate-800">{task.customer_name}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-none font-black text-[9px] uppercase">{task.status}</Badge></TableCell>
                      <TableCell className="text-right pr-8"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg"><MoreHorizontal size={14} /></Button></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === 'inventory' && (
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
              <div><CardTitle className="text-xl font-black text-slate-800 tracking-tight">Inventory Catalog</CardTitle><CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Stock levels and SKU management</CardDescription></div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest">Add Product</Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8">Product</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">SKU</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Stock</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-8">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.inventory.map((prod) => (
                  <TableRow key={prod.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                    <TableCell className="pl-8"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">{prod.image_url ? <img src={`http://localhost:8000/${prod.image_url}`} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={16} />}</div><span className="font-black text-slate-800 text-sm tracking-tight">{prod.name}</span></div></TableCell>
                    <TableCell className="text-xs font-bold text-slate-400">{prod.product_id}</TableCell>
                    <TableCell className={`font-black text-sm ${prod.stock_quantity < 10 ? 'text-rose-600' : 'text-slate-700'}`}>{prod.stock_quantity}</TableCell>
                    <TableCell className="text-center"><Badge className={prod.stock_quantity < 10 ? 'bg-rose-100 text-rose-700 border-none text-[9px]' : 'bg-emerald-100 text-emerald-700 border-none text-[9px]'}>{prod.stock_quantity < 10 ? 'LOW STOCK' : 'IN STOCK'}</Badge></TableCell>
                    <TableCell className="text-right pr-8 font-black text-slate-900 text-sm">₹{prod.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
              <div><CardTitle className="text-xl font-black text-slate-800 tracking-tight">User Management</CardTitle><CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Customers, Drivers and Staff roles</CardDescription></div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest">Invite User</Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8">Name</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Email</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Role</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Orders</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-8">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                    <TableCell className="pl-8 font-black text-slate-800 text-sm">{u.full_name || u.username}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-500">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200">{u.role}</Badge></TableCell>
                    <TableCell className="text-center font-black text-sm text-indigo-600">{u.total_orders}</TableCell>
                    <TableCell className="text-right pr-8 text-xs font-bold text-slate-400">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden bg-white">
              <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
                <div><CardTitle className="text-xl font-black text-slate-800 tracking-tight">Recent Invoices</CardTitle><CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Finance & billing history</CardDescription></div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest">New Invoice</Button>
              </CardHeader>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8">Invoice #</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Customer</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Amount</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-8">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.sales.invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                      <TableCell className="pl-8 font-black text-indigo-600">#{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">{inv.customer_name}</TableCell>
                      <TableCell className="font-black text-slate-900 text-sm">₹{inv.grand_total}</TableCell>
                      <TableCell className="text-center"><Badge className={inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-none' : 'bg-amber-100 text-amber-700 border-none'}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-right pr-8 text-xs font-bold text-slate-400">{inv.invoice_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, trend }) {
  const colors = {
    indigo: "from-indigo-600 to-indigo-700 shadow-indigo-200 text-white",
    amber: "from-amber-500 to-amber-600 shadow-amber-200 text-white",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-200 text-white",
    rose: "from-rose-500 to-rose-600 shadow-rose-200 text-white"
  };
  return (
    <Card className={`border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br ${colors[color]} p-1`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">{React.cloneElement(icon, { size: 24 })}</div>
          <ArrowUpRight size={20} className="text-white/40" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
          <h3 className="text-3xl font-black tracking-tight mt-1">{value}</h3>
          <p className="text-[9px] font-bold opacity-60 mt-2 uppercase tracking-wider">{trend}</p>
        </div>
      </CardContent>
    </Card>
  );
}