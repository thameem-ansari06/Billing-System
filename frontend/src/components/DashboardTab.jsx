import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Package, FileText, 
  IndianRupee, ShoppingBag, Activity, History,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  AlertCircle, MoreHorizontal, LayoutDashboard,
  Filter, Calendar, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API } from '../config';
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { user, activeUsers, isWsConnected } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [statsRes, invRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard-stats`, { headers }),
        axios.get(`${API}/invoices`, { headers })
      ]);
      setStats(statsRes.data);
      const invList = Array.isArray(invRes.data) ? invRes.data : (invRes.data.invoices || []);
      setRecentInvoices(invList.slice(0, 5));
    } catch (err) {
      toast.error("Failed to synchronize Command Center data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchDashboardData();
  }, [user]);

  // Chart Data Mapping
  const revenueData = useMemo(() => {
    // If API data is missing, use realistic placeholders as requested
    return stats?.monthly_sales?.length > 0 ? stats.monthly_sales : [
      { month: 'Jan', sales: 45000 },
      { month: 'Feb', sales: 52000 },
      { month: 'Mar', sales: 48000 },
      { month: 'Apr', sales: 61000 },
      { month: 'May', sales: 55000 },
      { month: 'Jun', sales: 67000 },
      { month: 'Jul', sales: 72000 }
    ];
  }, [stats]);

  const invoiceStatusData = useMemo(() => {
    return [
      { name: 'Paid', value: stats?.paid_invoices_count || 45, color: '#10b981' },
      { name: 'Pending', value: stats?.pending_invoices_count || 20, color: '#f59e0b' },
      { name: 'Overdue', value: stats?.overdue_invoices_count || 12, color: '#ef4444' }
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 w-full">
        <RefreshCw size={48} className="animate-spin text-indigo-500 opacity-30" />
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Initializing Intelligence Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-700 pb-8 max-w-[1600px] mx-auto">
      
      {/* --- Top Row: KPI Overlays --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Revenue" 
          value={`₹${(stats?.total_revenue || 1254300).toLocaleString('en-IN')}`} 
          trend="+12.5%" 
          trendUp={true}
          icon={IndianRupee}
          description="Gross platform turnover"
          color="indigo"
        />
        <KPICard 
          title="Active Customers" 
          value={stats?.total_customers || "1,240"} 
          trend="+4.2%" 
          trendUp={true}
          icon={Users}
          description="Registered business entities"
          color="emerald"
        />
        <KPICard 
          title="Pending Invoices" 
          value={stats?.pending_invoices_count || "24"} 
          trend="-2 today" 
          trendUp={false}
          icon={FileText}
          description="Awaiting payment confirmation"
          color="amber"
        />
        <KPICard 
          title="Stock Inventory" 
          value={stats?.total_products_count || "842"} 
          trend="12 Low Stock" 
          trendUp={false}
          icon={Package}
          description="Total SKUs in warehouse"
          color="rose"
        />
      </div>

      {/* --- Middle Row: Interactive Analytics --- */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* Revenue Area Chart (8 Columns) */}
        <Card className="col-span-12 lg:col-span-8 rounded-xl border-slate-200 shadow-md overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Activity className="text-indigo-600" size={18} /> Revenue Flow
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400">Monthly revenue aggregation and growth analysis</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 hover:bg-slate-50"><Filter size={14}/></Button>
              <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 hover:bg-slate-50"><Calendar size={14}/></Button>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] p-4 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  tickFormatter={(v) => `₹${v/1000}k`} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px', padding: '8px'}} 
                  cursor={{stroke: '#6366f1', strokeWidth: 1}}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Invoice Status Pie Chart (4 Columns) */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl border-slate-200 shadow-md overflow-hidden bg-white flex flex-col">
          <CardHeader className="p-4 pb-2 border-b border-slate-50">
            <CardTitle className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <FileText className="text-amber-500" size={18} /> Invoice Distribution
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400">Current status of all active invoices</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px', padding: '8px'}} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 w-full mt-4">
               {invoiceStatusData.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}} />
                       <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 text-xs">{item.value}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* --- Bottom Row: Activity Feed --- */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* Recent Invoices Table */}
        <Card className="col-span-12 lg:col-span-8 rounded-xl border-slate-200 shadow-md overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-slate-50">
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">Recent Financial Activity</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400">Latest 5 invoices processed in the system</CardDescription>
            </div>
            <Button variant="ghost" onClick={() => navigate('/invoices')} className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 rounded-lg px-3 h-8 gap-1">
              Full Ledger <ArrowUpRight size={14} />
            </Button>
          </CardHeader>
          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400 pl-4 h-10">Invoice ID</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400 h-10">Entity Name</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400 text-right h-10">Amount</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400 text-center h-10">Accounting Status</TableHead>
                  <TableHead className="w-8 pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-indigo-50/20 transition-colors border-slate-50">
                    <TableCell className="font-bold text-indigo-600 pl-4 py-2 text-xs">#{inv.invoice_number}</TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 py-2">{inv.customer_name || 'Individual'}</TableCell>
                    <TableCell className="font-bold text-slate-900 text-xs py-2 text-right">₹{parseFloat(inv.grand_total || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-center py-2">
                      <Badge className={cn(
                        "font-bold text-[9px] uppercase px-2 py-0 rounded-md border-none shadow-sm",
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {inv.status || 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4 py-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-300 hover:text-slate-600">
                        <MoreHorizontal size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Online Monitoring / Secondary Insight */}
        <Card className="col-span-12 lg:col-span-4 rounded-xl border-slate-200 shadow-md overflow-hidden bg-white flex flex-col">
          <CardHeader className="p-4 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">Active Pulse</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400">Real-time team monitoring</CardDescription>
              </div>
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isWsConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-300"
              )} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-4">
            {activeUsers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-30 py-4">
                 <History size={32} className="text-slate-300" />
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Standby Mode</p>
              </div>
            ) : (
              activeUsers.slice(0, 4).map((u, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm group-hover:scale-110 transition-all">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{u.name}</p>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{u.role}</p>
                  </div>
                  <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                </div>
              ))
            )}
            <div className="pt-4 border-t border-slate-100 mt-auto">
               <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                  <div className="flex items-center gap-2 mb-2">
                     <Clock className="text-indigo-600" size={14} />
                     <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Next Scheduled Sync</p>
                  </div>
                  <p className="text-sm font-bold text-indigo-900 tracking-tight">In 12 Minutes</p>
               </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function KPICard({ title, value, trend, trendUp, icon: Icon, description, color }) {
  const colorVariants = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100"
  };

  return (
    <Card className="rounded-xl border-slate-200 shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden bg-white border border-slate-100">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm group-hover:scale-110 transition-all duration-300", colorVariants[color])}>
            <Icon size={18} />
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest",
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
          )}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
          <p className="text-[10px] font-medium text-slate-400">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
