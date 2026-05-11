import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  RefreshCw, Download, Trash2, Search, Filter, 
  FileDown, TrendingUp, TrendingDown, Clock, 
  CreditCard, Wallet, Banknote, Landmark, CheckCircle2, 
  AlertCircle, X, LayoutDashboard, Calendar
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { API } from '../config';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PaymentsReceivedTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_billed: 0,
    total_received: 0,
    total_pending: 0,
    received_today: 0,
    collection_velocity: 0,
    trend_month_vs_last: 0,
    method_breakdown: {}
  });
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    customer_name: '',
    payment_method: 'all',
    start_date: '',
    end_date: ''
  });

  // Void Modal State
  const [voidModal, setVoidModal] = useState({ open: false, payment: null });
  const [voiding, setVoiding] = useState(false);

  // Record Payment Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    invoice_number: '',
    invoice_id: null,
    user_id: null,
    customer_name: '',
    balance_due: 0,
    wallet_balance: 0,
    amount: '',
    payment_method: 'UPI',
    transaction_id: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [fetchingInvoice, setFetchingInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Drill-down Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalCategory, setModalCategory] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, ledgerRes] = await Promise.all([
        axios.get(`${API}/payments/stats`, { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get(`${API}/payments/ledger`, { 
          params: {
            customer_name: filters.customer_name || undefined,
            payment_method: filters.payment_method === 'all' ? undefined : filters.payment_method,
            start_date: filters.start_date || undefined,
            end_date: filters.end_date || undefined
          },
          headers: { Authorization: `Bearer ${user.token}` } 
        })
      ]);
      setStats(statsRes.data);
      setLedger(ledgerRes.data);
    } catch (error) {
      console.error("Error fetching payment data:", error);
      toast.error("Failed to load payment data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.payment_method, filters.start_date, filters.end_date]); 

  const handleSearch = () => fetchData();

  const handleCardClick = async (category, title) => {
    setIsDrilldownLoading(true);
    setModalCategory(category);
    setModalTitle(title);
    try {
      const res = await axios.get(`${API}/payments/drilldown/${category}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setModalData(res.data);
      setIsModalOpen(true);
    } catch (err) {
      toast.error("Failed to fetch drill-down details");
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  const fetchInvoiceDetails = async (number) => {
    if (!number) return;
    setFetchingInvoice(true);
    try {
      const res = await axios.get(`${API}/invoices/${number}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const inv = res.data;
      setRecordForm(prev => ({
        ...prev,
        invoice_id: inv.id,
        user_id: inv.user_id,
        customer_name: inv.customer_name,
        balance_due: inv.grand_total - inv.amount_paid,
        wallet_balance: inv.user?.wallet_balance || 0
      }));
    } catch (error) {
      toast.error("Invoice not found or unauthorized");
      setRecordForm(prev => ({ ...prev, invoice_id: null, balance_due: 0 }));
    } finally {
      setFetchingInvoice(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!recordForm.invoice_id) return toast.error("Please select a valid invoice");
    if (!recordForm.amount || recordForm.amount <= 0) return toast.error("Please enter a valid amount");
    
    setSubmitting(true);
    try {
      const payload = {
        invoice_id: recordForm.invoice_id,
        user_id: recordForm.user_id,
        amount: parseFloat(recordForm.amount),
        payment_method: recordForm.payment_method,
        transaction_id: recordForm.transaction_id,
        date: recordForm.date
      };
      
      const res = await axios.post(`${API}/payments/record`, payload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      toast.success(res.data.message);
      setRecordModalOpen(false);
      setRecordForm({
        invoice_number: '',
        invoice_id: null,
        user_id: null,
        customer_name: '',
        balance_due: 0,
        wallet_balance: 0,
        amount: '',
        payment_method: 'UPI',
        transaction_id: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async () => {
    if (!voidModal.payment) return;
    setVoiding(true);
    try {
      await axios.post(`${API}/payments/${voidModal.payment.id}/void`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Transaction voided successfully");
      setVoidModal({ open: false, payment: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to void transaction");
    } finally {
      setVoiding(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      const response = await axios.get(`${API}/payments/${paymentId}/receipt`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download receipt");
    }
  };

  const exportCSV = () => {
    if (ledger.length === 0) return;
    const headers = ["ID", "Customer", "Invoice", "Amount", "Method", "Status", "Date"];
    const rows = ledger.map(p => [p.id, p.customer_name, p.invoice_number, p.amount, p.payment_method, p.status, p.payment_date]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Payments_Ledger.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportDetailsToCSV = () => {
    if (!modalData.length) return;
    const headers = Object.keys(modalData[0]).join(",");
    const rows = modalData.map(row => Object.values(row).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${modalTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const chartData = useMemo(() => {
    return Object.entries(stats.method_breakdown).map(([name, value]) => ({ name, value }));
  }, [stats.method_breakdown]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Landmark className="h-10 w-10 text-blue-600" />
            Payments Received
          </h1>
          <p className="text-muted-foreground text-lg">Financial analytics and transaction ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setRecordModalOpen(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700">
            <Banknote className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button variant="outline" onClick={exportCSV} className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50">
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Received Today', value: stats.received_today, icon: TrendingUp, color: 'text-emerald-500', cat: 'today' },
          { label: 'Total Pending', value: stats.total_pending, icon: Clock, color: 'text-amber-500', cat: 'pending' },
          { label: 'Collection Velocity', value: `${stats.collection_velocity}%`, icon: TrendingUp, color: 'text-blue-500', isPerc: true },
          { label: 'Total Received MTD', value: stats.total_received, icon: Calendar, color: 'text-indigo-500', cat: 'mtd' }
        ].map((card, idx) => (
          <Card key={idx} className="cursor-pointer hover:shadow-md transition-all border-slate-200" onClick={() => card.cat && handleCardClick(card.cat, card.label)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{card.isPerc ? card.value : formatCurrency(card.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-black text-slate-800">Transaction Ledger</CardTitle>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search customer..." 
                    className="h-9 w-48 rounded-lg"
                    value={filters.customer_name}
                    onChange={(e) => setFilters(f => ({ ...f, customer_name: e.target.value }))}
                  />
                  <Button size="sm" onClick={handleSearch} className="rounded-lg h-9">Search</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Invoice</TableHead>
                    <TableHead className="text-right font-bold">Amount</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="text-center font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50 group">
                      <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-bold text-slate-800">{p.customer_name}</TableCell>
                      <TableCell className="font-mono text-xs text-blue-600">{p.invoice_number}</TableCell>
                      <TableCell className="text-right font-black">{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={p.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => downloadReceipt(p.id)}><Download className="h-4 w-4" /></Button>
                          {p.status !== 'VOIDED' && <Button variant="ghost" size="icon" onClick={() => setVoidModal({ open: true, payment: p })}><Trash2 className="h-4 w-4 text-rose-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader><CardTitle className="text-lg font-black">Method Distribution</CardTitle></CardHeader>
            <CardContent>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                      {chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drill-down Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-0 rounded-3xl">
          <div className="p-6 bg-white border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-black text-slate-900">{modalTitle}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={exportDetailsToCSV} className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  {modalCategory === 'pending' ? (
                    <>
                      <TableHead className="font-bold text-slate-800">Customer</TableHead>
                      <TableHead className="font-bold text-slate-800">Invoice</TableHead>
                      <TableHead className="text-right font-bold text-slate-800">Total Amount</TableHead>
                      <TableHead className="text-right font-bold text-rose-600">Amount Due</TableHead>
                      <TableHead className="text-center font-bold text-slate-800">Due Date</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="font-bold text-slate-800">Customer</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600">Amount</TableHead>
                      <TableHead className="text-center font-bold text-slate-800">Method</TableHead>
                      <TableHead className="text-center font-bold text-slate-800">{modalCategory === 'today' ? 'Time' : 'Date'}</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDrilldownLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center"><RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" /></TableCell></TableRow>
                ) : modalData.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                    {modalCategory === 'pending' ? (
                      <>
                        <TableCell className="font-bold text-slate-700">{item.customer_name}</TableCell>
                        <TableCell className="font-mono text-xs text-blue-600">{item.invoice_number}</TableCell>
                        <TableCell className="text-right font-medium text-slate-600">{formatCurrency(item.total_amount)}</TableCell>
                        <TableCell className="text-right font-black text-rose-600">{formatCurrency(item.amount_due)}</TableCell>
                        <TableCell className="text-center text-slate-500 font-medium">{item.due_date}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-bold">{item.customer_name}</TableCell>
                        <TableCell className="text-right font-black text-emerald-600">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{item.method}</Badge></TableCell>
                        <TableCell className="text-center text-slate-500">{modalCategory === 'today' ? item.time : item.date}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t bg-slate-50 flex justify-end">
            <Button onClick={() => setIsModalOpen(false)} className="rounded-xl px-8">Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={recordModalOpen} onOpenChange={setRecordModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Record Payment</DialogTitle>
            <DialogDescription>Apply manual payment and handle overpayments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input placeholder="Invoice Number" value={recordForm.invoice_number} onChange={(e) => setRecordForm(f => ({ ...f, invoice_number: e.target.value }))} className="rounded-xl" />
              <Button onClick={() => fetchInvoiceDetails(recordForm.invoice_number)} disabled={fetchingInvoice} className="rounded-xl"><Search className="h-4 w-4" /></Button>
            </div>
            {recordForm.invoice_id && (
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase">Customer</p><p className="font-bold">{recordForm.customer_name}</p></div>
                  <div className="text-right"><p className="text-[10px] font-bold text-slate-500 uppercase">Due</p><p className="font-bold text-rose-600">{formatCurrency(recordForm.balance_due)}</p></div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Select value={recordForm.payment_method} onValueChange={(v) => setRecordForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Wallet">Wallet</SelectItem></SelectContent>
              </Select>
              <Input type="number" placeholder="Amount" value={recordForm.amount} onChange={(e) => setRecordForm(f => ({ ...f, amount: e.target.value }))} className="rounded-xl font-bold" />
            </div>
            <Input placeholder="Transaction ID (Optional)" value={recordForm.transaction_id} onChange={(e) => setRecordForm(f => ({ ...f, transaction_id: e.target.value }))} className="rounded-xl" />
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setRecordModalOpen(false)}>Cancel</Button><Button onClick={handleRecordPayment} disabled={submitting || !recordForm.invoice_id} className="bg-blue-600 rounded-xl">Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Modal */}
      <Dialog open={voidModal.open} onOpenChange={(o) => !o && setVoidModal({ open: false, payment: null })}>
        <DialogContent className="max-w-md rounded-2xl text-center">
          <DialogHeader><DialogTitle className="text-xl font-black">Void Transaction?</DialogTitle><DialogDescription>Reverts invoice amount and wallet adjustments.</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4"><Button variant="ghost" onClick={() => setVoidModal({ open: false, payment: null })}>Cancel</Button><Button variant="destructive" onClick={handleVoid} disabled={voiding}>{voiding ? "Processing..." : "Confirm Void"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}