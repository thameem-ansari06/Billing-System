import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Shield, Search, Plus, 
  Trash2, UserPlus, ShieldCheck, Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API } from '../config';

export default function StaffManagement() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'sales'
  });

  const fetchStaff = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${API}/admin/staff`, { headers });
      setStaff(res.data);
    } catch (err) {
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchStaff();
  }, [user]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${API}/admin/add-staff`, formData, { headers });
      toast.success("Staff member added successfully");
      setIsModalOpen(false);
      setFormData({ username: '', email: '', password: '', role: 'sales' });
      fetchStaff(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add staff");
    }
  };

  const filteredStaff = staff.filter(s => 
    s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 w-full">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading Personnel...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-slate-500 text-sm font-medium">Manage internal roles and system access</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-indigo-200">
              <UserPlus size={18} /> Add New Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800">Register Staff</DialogTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Grant internal access to the ERP system
              </CardDescription>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Username</Label>
                <Input 
                  required
                  placeholder="john_doe" 
                  className="rounded-xl border-slate-200 h-11"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</Label>
                <Input 
                  required
                  type="email"
                  placeholder="john@enterprise.com" 
                  className="rounded-xl border-slate-200 h-11"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</Label>
                <Input 
                  required
                  type="password"
                  placeholder="••••••••" 
                  className="rounded-xl border-slate-200 h-11"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={val => setFormData({...formData, role: val})}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="accounts">Accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-black text-xs uppercase tracking-widest">
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[3rem] overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
          <div className="relative group max-w-sm w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <Input 
              placeholder="Filter staff by name or role..." 
              className="pl-12 h-11 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:ring-indigo-500 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-lg border-slate-100 text-slate-400 font-bold text-[10px]">
              Total: {staff.length}
            </Badge>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8 h-14">Personnel</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Role</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Contact</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right pr-8">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-20 text-center">
                    <Users className="mx-auto text-slate-200 mb-2" size={40} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No staff members matched your search</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          {s.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-base leading-tight tracking-tight">{s.username}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">ID: {s.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {s.role === 'admin' || s.role === 'ceo' ? 
                          <ShieldCheck size={14} className="text-indigo-500" /> : 
                          <Briefcase size={14} className="text-slate-400" />
                        }
                        <Badge variant="outline" className={`px-2.5 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-widest ${
                          s.role === 'admin' || s.role === 'ceo' ? 'border-indigo-100 text-indigo-600 bg-indigo-50/30' : 'border-slate-100 text-slate-500 bg-slate-50'
                        }`}>
                          {s.role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                        <Mail size={14} className="text-slate-300" />
                        {s.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase px-3 py-1 rounded-full">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
