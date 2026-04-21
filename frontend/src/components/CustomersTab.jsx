import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';

export default function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const navigate = useNavigate();

  const fetchCustomers = () => {
    fetch('http://localhost:8000/api/customers/')
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []));
  };

  useEffect(() => { fetchCustomers(); }, []);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        {/* 🔥 REDIRECTION LOGIC */}
        <Button onClick={() => navigate('/customers/new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 w-full md:w-auto">
          <Plus size={18} className="mr-2" /> New Customer
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase">Display Name</TableHead>
              <TableHead className="font-bold text-xs uppercase">Company Name</TableHead>
              <TableHead className="font-bold text-xs uppercase">Email</TableHead>
              <TableHead className="font-bold text-xs uppercase">Work Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c, i) => (
              <TableRow key={i} className="hover:bg-slate-50">
                <TableCell className="text-blue-600 font-bold">{c.display_name || `${c.first_name} ${c.last_name}`}</TableCell>
                <TableCell className="text-slate-600">{c.company_name || '-'}</TableCell>
                <TableCell className="text-slate-500">{c.email}</TableCell>
                <TableCell className="text-slate-500">{c.phone_work || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}