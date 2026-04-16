import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DashboardTab() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/dashboard')
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(err => console.error("API Error: ", err));
  }, []);

  if (!dashboardData) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground font-medium w-full">Loading Dashboard Data...</div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Business Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{dashboardData.total_invoices}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹ {dashboardData.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹ {dashboardData.total_pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border p-5">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <div className="p-0">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow>
                <TableHead className="w-[150px] font-semibold">Invoice ID</TableHead>
                <TableHead className="font-semibold">Client Email</TableHead>
                <TableHead className="font-semibold">Amount (with GST)</TableHead>
                <TableHead className="font-semibold text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData.recent.map((inv, idx) => (
                <TableRow key={idx} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-primary">{inv.invoice_id}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.email}</TableCell>
                  <TableCell className="font-bold">₹ {inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={inv.status.toLowerCase() === 'paid' ? 'default' : 'secondary'} className={inv.status.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-transparent' : 'bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-transparent'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}