import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Phone, CheckCircle, Loader2, 
  ArrowRight, RefreshCw, Navigation, Package,
  Clock, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function DriverDashboard() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchMyTasks = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/delivery-tasks/my-tasks', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(Array.isArray(data) ? data : []);
      } else {
        setTasks([]);
        toast.error(data.detail?.[0]?.msg || "Failed to load tasks");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user?.token]);

  const filteredTasks = tasks.filter(task => 
    task.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.customer_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.id?.toString().includes(searchQuery)
  );

  const getStatusConfig = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED': return { label: 'Assigned', color: 'bg-amber-100 text-amber-700', progress: 20 };
      case 'PICKED_UP': return { label: 'Picked Up', color: 'bg-blue-100 text-blue-700', progress: 40 };
      case 'IN_TRANSIT': return { label: 'In Transit', color: 'bg-indigo-100 text-indigo-700', progress: 70 };
      case 'ARRIVED': return { label: 'Arrived', color: 'bg-violet-100 text-violet-700', progress: 90 };
      case 'DELIVERED': return { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', progress: 100 };
      default: return { label: status, color: 'bg-slate-100 text-slate-600', progress: 0 };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky App Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">Deliveries</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {isLoading ? 'Updating list...' : `${filteredTasks.length} Active Tasks`}
              </p>
            </div>
          </div>
          <button 
            onClick={fetchMyTasks}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all active:scale-90 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Unified Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Package size={16} />
          </div>
          <input
            type="text"
            placeholder="Search Invoice #, Name, or Address..."
            className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {isLoading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Fetching Orders...</p>
          </div>
        ) : (!Array.isArray(filteredTasks) || filteredTasks.length === 0) ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 p-8 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-800">No tasks found</h3>
            <p className="text-sm font-bold text-slate-400 mt-1 max-w-[200px] mx-auto">Try adjusting your search or refresh the list.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const config = getStatusConfig(task.status);
            return (
              <div 
                key={task.id} 
                onClick={() => navigate(`/driver/task/${task.id}`)}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col active:scale-[0.98] transition-all cursor-pointer group hover:border-indigo-200"
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {task.invoice_number ? `Invoice: #${task.invoice_number}` : `Order: #${task.id}`}
                    </span>
                  </div>
                  <Badge className={`${config.color} border-none shadow-none font-black text-[10px] uppercase px-3 py-1 rounded-full`}>
                    {config.label}
                  </Badge>
                </div>
                
                {/* Driver Info if assigned */}
                <div className="px-5 pt-4 flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                      {user?.username?.charAt(0).toUpperCase()}
                   </div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Pilot: {user?.username}
                   </p>
                </div>
                
                {/* Card Content */}
                <div className="p-5 space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {task.customer_name}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={12} className="shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-wide">Due Today</p>
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shadow-indigo-100">
                      <ArrowRight size={20} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg shrink-0 mt-0.5">
                        <MapPin size={16} className="text-indigo-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-600 leading-snug line-clamp-2">
                        {task.customer_address}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                        <Phone size={16} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black text-slate-800">{task.contact_number}</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Progress Bar */}
                <div className="px-5 pb-5">
                  <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-indigo-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]" 
                      style={{ width: `${config.progress}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Progress</p>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{config.progress}% Complete</p>
                  </div>
                </div>

                {/* Quick Action Navigation if in transit */}
                {task.status === 'ASSIGNED' && (
                  <div className="px-5 pb-5 pt-0">
                    <Button 
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs h-10 rounded-xl flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/driver/task/${task.id}`);
                      }}
                    >
                      <Package size={14} /> Mark Picked Up
                    </Button>
                  </div>
                )}
                {task.status === 'IN_TRANSIT' && (
                  <div className="px-5 pb-5 pt-0">
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-10 rounded-xl flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.customer_address)}`, '_blank');
                      }}
                    >
                      <Navigation size={14} /> GPS Navigation
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Info (Optional/Generic) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-sm">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center justify-between shadow-2xl shadow-slate-900/20 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Driver Active</p>
          </div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            {user?.username || 'Pilot'}
          </p>
        </div>
      </div>
    </div>
  );
}
