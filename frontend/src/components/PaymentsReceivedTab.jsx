import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Clock, CheckCircle, IndianRupee } from 'lucide-react';

export default function PaymentsReceivedTab() {
  const [stats, setStats] = useState({
    total_billed: 0,
    total_received: 0,
    total_pending: 0,
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/payments/stats');
      setStats(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching payment stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments Received</h1>
          <p className="text-muted-foreground mt-1">Overview of your billing and received payments</p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
              <Clock className="h-4 w-4" />
              Last Updated: {lastUpdated.toLocaleTimeString('en-IN')}
            </span>
          )}
          <button 
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <IndianRupee className="h-16 w-16 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider relative z-10">
              Total Billed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black relative z-10 ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
              {formatCurrency(stats.total_billed)}
            </div>
            <p className="text-xs text-muted-foreground mt-2 relative z-10 font-medium">Total amount from all invoices</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider relative z-10">
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black text-emerald-600 relative z-10 ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
              {formatCurrency(stats.total_received)}
            </div>
            <p className="text-xs text-muted-foreground mt-2 relative z-10 font-medium">Successfully collected payments</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-2 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="h-16 w-16 text-rose-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider relative z-10">
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black text-rose-600 relative z-10 ${loading ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
              {formatCurrency(stats.total_pending)}
            </div>
            <p className="text-xs text-muted-foreground mt-2 relative z-10 font-medium">Awaiting payment from customers</p>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
