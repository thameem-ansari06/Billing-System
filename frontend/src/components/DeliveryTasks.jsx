import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, CheckCircle, Package, Clock, MapPin, Phone, 
  FileText, AlertCircle, X, Info, ChevronRight, Layers, 
  Calendar, ExternalLink, Navigation, PhoneCall, ShieldCheck,
  Search, Filter, Warehouse, TrendingUp, MoreVertical,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import VerticalStepper from './ui/VerticalStepper';
import { API, BASE_URL } from '../config';
import { getCleanImageUrl } from '../utils/imageUtils';
import { cn } from '@/lib/utils';

export default function DeliveryTasks() {
  const [tasks, setTasks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [verifyingBatch, setVerifyingBatch] = useState(null);
  const [batchOtpInput, setBatchOtpInput] = useState('');
  const { user } = useAuth();

  const fetchTasks = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/delivery-tasks/`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(Array.isArray(data) ? data : []);
      } else {
        setTasks([]);
        toast.error("Failed to load delivery tasks.");
      }
    } catch (err) {
      setTasks([]);
      toast.error("Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrivers = async () => {
    if (!user?.token || (user.role !== 'admin' && user.role !== 'ceo')) return;
    try {
      const res = await fetch(`${API}/delivery-tasks/drivers`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      setDrivers(data || []);
    } catch (err) {
      console.error("Failed to load drivers", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchDrivers();
  }, [user?.token]);

  // Real-time updates via WebSocket
  useEffect(() => {
    let socket;
    if (user?.token) {
      const wsUrl = `wss://${new URL(API).host}/api/auth/ws/status?token=${user.token}`;
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'payment_received' || message.type === 'status_update') {
            console.log("[WS] New delivery event received, refreshing tasks...");
            fetchTasks();
          }
        } catch (err) {
          console.error("[WS] Message error:", err);
        }
      };

      socket.onclose = () => {
        console.log("[WS] Delivery Dashboard disconnected");
      };
    }

    return () => {
      if (socket) socket.close();
    };
  }, [user?.token]);

  const updateStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success(`Task marked as ${newStatus}!`);
        fetchTasks();
        if (selectedTask?.id === taskId) {
           const updatedTaskRes = await fetch(`${API}/delivery-tasks/${taskId}`, {
             headers: { 'Authorization': `Bearer ${user.token}` }
           });
           const updatedTask = await updatedTaskRes.json();
           setSelectedTask(updatedTask);
        }
      }
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const assignDriver = async (taskId, driverId) => {
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}/assign?driver_id=${driverId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success("Driver assigned!");
        fetchTasks();
      }
    } catch (err) {
      toast.error("Failed to assign driver.");
    }
  };

  const handleBulkAssign = async (driverId) => {
    try {
      const res = await fetch(`${API}/delivery-tasks/bulk-assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}` 
        },
        body: JSON.stringify({ task_ids: selectedTaskIds, driver_id: parseInt(driverId) })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully assigned ${selectedTaskIds.length} tasks!`);
        setBatchResult(data);
        setSelectedTaskIds([]);
        fetchTasks();
      } else {
        toast.error(data.detail || "Bulk assignment failed");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const handleBatchVerify = async () => {
    try {
      const res = await fetch(`${API}/delivery-tasks/batch-verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}` 
        },
        body: JSON.stringify({ batch_id: verifyingBatch.id, otp: batchOtpInput })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Batch picked up successfully!");
        setVerifyingBatch(null);
        setBatchOtpInput('');
        fetchTasks();
      } else {
        toast.error(data.detail || "Invalid OTP");
      }
    } catch (err) {
      toast.error("Verification failed");
    }
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Stats Calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => ['PENDING DELIVERY', 'ASSIGNED'].includes(t.status?.toUpperCase())).length;
    const outForDelivery = tasks.filter(t => ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(t.status?.toUpperCase())).length;
    const completed = tasks.filter(t => t.status?.toUpperCase() === 'DELIVERED').length;
    
    return { total, pending, outForDelivery, completed };
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    return Array.isArray(tasks) ? tasks.reduce((groups, task) => {
      const date = task.created_at?.split('T')[0] || 'Unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
      return groups;
    }, {}) : {};
  }, [tasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => new Date(b) - new Date(a));
  }, [groupedTasks]);

  const getTimelineSteps = (task) => [
    { title: 'Ordered', description: 'Order received', timestamp: task.timestamp_logs?.['Pending Delivery'] || task.timestamp_logs?.ASSIGNED },
    { title: 'Picked Up', description: 'At warehouse', timestamp: task.timestamp_logs?.PICKED_UP },
    { title: 'Out for Delivery', description: 'On the road', timestamp: task.timestamp_logs?.IN_TRANSIT || task.timestamp_logs?.ARRIVED },
    { title: 'Delivered', description: 'Complete', timestamp: task.timestamp_logs?.DELIVERED }
  ];

  const getStatusIndex = (status) => {
    const s = status?.toUpperCase();
    if (['PENDING DELIVERY', 'ASSIGNED'].includes(s)) return 0;
    if (s === 'PICKED_UP') return 1;
    if (['IN_TRANSIT', 'ARRIVED'].includes(s)) return 2;
    if (s === 'DELIVERED') return 3;
    return -1;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative min-h-screen bg-slate-50/50 pb-20">
      {/* Executive Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        <StatCard 
          title="Total Tasks" 
          value={stats.total} 
          icon={Layers} 
          color="blue" 
          trend="All scheduled orders"
        />
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          icon={Clock} 
          color="amber" 
          trend="Waiting for pickup"
        />
        <StatCard 
          title="Out for Delivery" 
          value={stats.outForDelivery} 
          icon={Truck} 
          color="indigo" 
          trend="Currently in transit"
        />
        <StatCard 
          title="Completed" 
          value={stats.completed} 
          icon={CheckCircle} 
          color="emerald" 
          trend="Successfully delivered"
        />
      </div>

      {/* Bulk Action Header */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-800">
            <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-xs">
                {selectedTaskIds.length}
              </div>
              <span className="text-sm font-bold text-slate-300">Tasks Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 rounded-xl gap-2"
              >
                <Layers size={16} /> Bulk Assign Driver
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedTaskIds([])}
                className="text-slate-400 hover:text-white hover:bg-slate-800 font-bold h-10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection Grid */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" /> Dispatch Calendar
          </h2>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="text-[10px] font-bold border-slate-200">
               {sortedDates.length} Days Active
             </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sortedDates.map((date) => {
            const dateObj = new Date(date);
            const isToday = date === new Date().toISOString().split('T')[0];
            const dayName = date === 'Unknown' ? 'Unknown' : dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
            const dayNum = date === 'Unknown' ? '--' : dateObj.getDate();
            const monthName = date === 'Unknown' ? '---' : dateObj.toLocaleDateString('en-GB', { month: 'short' });
            const isSelected = selectedDate === date;
            
            const dayTasks = groupedTasks[date];
            const completedCount = dayTasks.filter(t => t.status?.toUpperCase() === 'DELIVERED').length;
            const progress = (completedCount / dayTasks.length) * 100;

            return (
              <button 
                key={date}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className={cn(
                  "p-3 rounded-2xl border-2 transition-all duration-300 text-left group relative overflow-hidden",
                  isSelected 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                    : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-md"
                )}
              >
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", isSelected ? "text-blue-100" : "text-slate-400")}>
                      {dayName}
                    </p>
                    <h3 className="text-xl font-black leading-none mt-1">
                      {dayNum} {monthName}
                    </h3>
                  </div>
                  {isToday && (
                    <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase", isSelected ? "bg-white text-blue-600" : "bg-blue-50 text-blue-600")}>
                      Today
                    </div>
                  )}
                </div>

                <div className="mt-4 relative z-10">
                   <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className={isSelected ? "text-blue-100" : "text-slate-500"}>
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                      <span className={isSelected ? "text-white" : "text-blue-600"}>
                        {Math.round(progress)}%
                      </span>
                   </div>
                   <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isSelected ? "bg-white/20" : "bg-slate-100")}>
                      <div 
                        className={cn("h-full transition-all duration-1000", isSelected ? "bg-white" : "bg-blue-600")}
                        style={{ width: `${progress}%` }}
                      />
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Task View */}
      <div className="space-y-4">
        {selectedDate ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue-600 rounded-full" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Tasks for <span className="text-blue-600">{new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search tasks..." 
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none w-48 md:w-64"
                    />
                 </div>
              </div>
            </div>

            <div className="space-y-3">
              {groupedTasks[selectedDate]?.map((task) => (
                <TaskCard 
                  key={task.id}
                  task={task}
                  drivers={drivers}
                  isSelected={selectedTask?.id === task.id}
                  isBulkSelected={selectedTaskIds.includes(task.id)}
                  onSelect={() => setSelectedTask(task)}
                  onToggleSelection={() => toggleTaskSelection(task.id)}
                  onUpdateStatus={updateStatus}
                  onAssignDriver={assignDriver}
                  onVerifyBatch={(batch) => setVerifyingBatch(batch)}
                  user={user}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Calendar size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Select a Date</h3>
            <p className="text-slate-500 font-medium mb-6">Choose a date from the calendar to view and manage delivery tasks.</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-blue-100">
               Go to Today
            </Button>
          </div>
        )}

        {(!Array.isArray(tasks) || tasks.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-8 relative">
                <Package size={56} className="text-blue-200" />
                <div className="absolute -right-2 -top-2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                   <AlertCircle size={24} className="text-blue-600" />
                </div>
             </div>
             <h3 className="text-2xl font-black text-slate-800 mb-3">No Tasks Assigned</h3>
             <p className="text-slate-500 font-medium mb-8 text-center max-w-sm">
                There are no delivery tasks currently available. New tasks will appear here automatically when payments are confirmed.
             </p>
             <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl px-10 h-14 text-lg shadow-xl shadow-slate-200 flex items-center gap-2">
                <Layers size={20} /> Assign New Task
             </Button>
          </div>
        )}
      </div>

      {/* Timeline Side Drawer */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-500">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl shadow-lg",
                selectedTask.status === 'DELIVERED' ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
              )}>
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Delivery Details</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] font-black uppercase bg-slate-50 border-slate-200">
                    {selectedTask.invoice_number || `#${selectedTask.id}`}
                  </Badge>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(selectedTask.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedTask(null)}
              className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
             {/* Customer Brief */}
             <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="space-y-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Customer Information</label>
                      <h3 className="text-lg font-black text-slate-800">{selectedTask.customer_name}</h3>
                      <div className="flex items-start gap-2 mt-2">
                         <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                         <p className="text-sm font-bold text-slate-600 leading-snug">{selectedTask.customer_address}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                         <Phone size={16} className="text-slate-400 shrink-0" />
                         <p className="text-sm font-black text-blue-600">{selectedTask.contact_number}</p>
                      </div>
                   </div>

                   <div className="flex gap-2">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl text-xs font-black uppercase tracking-wider gap-2">
                         <Navigation size={16} /> Open Maps
                      </Button>
                      <Button variant="outline" className="flex-1 border-slate-200 hover:bg-white h-11 rounded-xl text-xs font-black uppercase tracking-wider gap-2">
                         <PhoneCall size={16} className="text-emerald-500" /> Call Now
                      </Button>
                   </div>
                </div>
             </div>

             {/* Tracking Timeline */}
             <div className="p-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-8 flex items-center gap-2">
                  <TrendingUp size={14} className="text-blue-500" /> Activity Timeline
                </h3>
                <VerticalStepper 
                  steps={getTimelineSteps(selectedTask)} 
                  currentStep={getTimelineSteps(selectedTask).findLastIndex(s => s.timestamp !== undefined)} 
                />
             </div>

             {/* Documents & Proof */}
             <div className="p-8 space-y-6 bg-slate-50/30 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2">
                  <FileText size={14} className="text-indigo-500" /> Documents & Verification
                </h3>

                <div className="grid grid-cols-1 gap-4">
                   {selectedTask.status === 'ASSIGNED' && (selectedTask.batch?.batch_otp || selectedTask.pickup_otp) && (
                     <div className="p-5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100">
                        <div className="flex justify-between items-center mb-3">
                           <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest flex items-center gap-2">
                              <ShieldCheck size={14} /> Pickup Authentication
                           </p>
                           <Badge className="bg-white/20 text-white border-none text-[8px]">Secure</Badge>
                        </div>
                        <p className="text-4xl font-black tracking-[0.2em] mb-1">
                           {selectedTask.batch?.batch_otp || selectedTask.pickup_otp}
                        </p>
                        <p className="text-[10px] text-indigo-200 font-bold italic">
                           Share this OTP with warehouse staff for pickup.
                        </p>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-3">
                      {selectedTask.invoice_number && (
                        <button 
                          onClick={() => window.open(`/invoices/${selectedTask.invoice_number}`, '_blank')}
                          className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-500 transition-all group"
                        >
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                             <FileText size={20} className="text-blue-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-500">Invoice</span>
                        </button>
                      )}
                      {selectedTask.challan_url && (
                        <button 
                          onClick={() => window.open(getCleanImageUrl(selectedTask.challan_url), '_blank')}
                          className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-2 hover:border-indigo-500 transition-all group"
                        >
                          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                             <ExternalLink size={20} className="text-indigo-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-500">Challan</span>
                        </button>
                      )}
                   </div>

                   {selectedTask.status === 'DELIVERED' && (selectedTask.delivery_photo_url || selectedTask.signature_url) && (
                     <div className="space-y-4 mt-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proof of Delivery</h4>
                       <div className="grid grid-cols-2 gap-4">
                         {selectedTask.delivery_photo_url && (
                           <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm group cursor-pointer" onClick={() => window.open(getCleanImageUrl(selectedTask.delivery_photo_url), '_blank')}>
                             <div className="aspect-square relative">
                                <img src={getCleanImageUrl(selectedTask.delivery_photo_url)} alt="Delivery Photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <Search size={24} className="text-white" />
                                </div>
                             </div>
                             <p className="text-[10px] font-black text-center py-3 text-slate-500 uppercase tracking-wider">Photo Evidence</p>
                           </div>
                         )}
                         {selectedTask.signature_url && (
                           <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm group cursor-pointer" onClick={() => window.open(getCleanImageUrl(selectedTask.signature_url), '_blank')}>
                             <div className="aspect-square relative flex items-center justify-center p-4">
                                <img src={getCleanImageUrl(selectedTask.signature_url)} alt="Signature" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <Search size={24} className="text-white" />
                                </div>
                             </div>
                             <p className="text-[10px] font-black text-center py-3 text-slate-500 uppercase tracking-wider">Customer Signature</p>
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
             <Button 
               className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-lg shadow-xl shadow-slate-200"
               onClick={() => setSelectedTask(null)}
             >
               Close Control Panel
             </Button>
          </div>
        </div>
      )}

      {/* Batch OTP Verification Modal */}
      <Dialog open={!!verifyingBatch} onOpenChange={() => setVerifyingBatch(null)}>
        <DialogContent className="max-w-md rounded-[32px] border-none p-0 overflow-hidden shadow-2xl">
          <div className="bg-amber-500 p-8 text-center text-white">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md ring-8 ring-white/10">
                <ShieldCheck size={32} />
             </div>
             <h2 className="text-2xl font-black">Verify Pickup</h2>
             <p className="text-amber-100 font-bold mt-1 uppercase text-[10px] tracking-widest">Authentication Required</p>
          </div>
          <div className="p-8 space-y-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-sm font-bold text-slate-700 text-center">Entering the OTP will mark <span className="text-amber-600">{verifyingBatch?.tasks?.length || 'all'} orders</span> in Batch #{verifyingBatch?.id} as <span className="text-blue-600">Picked Up</span>.</p>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block text-center">Enter Unified Batch OTP</label>
              <input 
                type="text" 
                maxLength={6}
                placeholder="••••••"
                className="w-full h-20 bg-slate-50 border-3 border-slate-200 rounded-[24px] text-center text-5xl font-black tracking-[0.5em] outline-none focus:border-amber-500 transition-all shadow-inner placeholder:text-slate-200"
                value={batchOtpInput}
                onChange={(e) => setBatchOtpInput(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
               <Button 
                variant="ghost" 
                onClick={() => setVerifyingBatch(null)}
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-xs"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBatchVerify}
                className="flex-[2] h-14 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-lg shadow-lg shadow-amber-100"
              >
                Verify & Pick Up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-md rounded-[32px] border-none p-0 overflow-hidden shadow-2xl">
           <div className="bg-blue-600 p-8 text-center text-white">
             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md ring-8 ring-white/10">
                <Layers size={32} />
             </div>
             <h2 className="text-2xl font-black">Bulk Assignment</h2>
             <p className="text-blue-100 font-bold mt-1 uppercase text-[10px] tracking-widest">Grouping {selectedTaskIds.length} Tasks</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-sm font-bold text-blue-700">Assigning these orders to a single batch. One unified OTP will be generated for warehouse pickup.</p>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Delivery Executive</label>
              <div className="relative group">
                <select 
                  id="bulk-driver-select"
                  className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAssign(e.target.value);
                      setIsBulkModalOpen(false);
                    }
                  }}
                >
                  <option value="">Choose a Driver...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name || d.username}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setIsBulkModalOpen(false)}
              className="w-full h-12 font-black text-slate-400 text-xs uppercase"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Success Modal */}
      {batchResult && (
        <Dialog open={!!batchResult} onOpenChange={() => setBatchResult(null)}>
          <DialogContent className="max-w-sm rounded-[40px] border-none shadow-2xl p-0 overflow-hidden">
            <div className="bg-emerald-500 p-10 text-center text-white">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ring-8 ring-white/20">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Batch Created!</h2>
              <p className="text-emerald-100 font-black mt-2 uppercase text-[10px] tracking-[0.2em]">Group ID: #{batchResult.id}</p>
            </div>
            <div className="p-10 text-center space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Unified Pickup OTP</p>
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] py-6 shadow-inner">
                  <p className="text-5xl font-black text-slate-800 tracking-[0.3em]">{batchResult.batch_otp}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-6 italic">This code must be verified at the warehouse for bulk pickup.</p>
              </div>
              <Button 
                onClick={() => setBatchResult(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-16 rounded-[24px] text-lg shadow-xl shadow-slate-200"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Overlay */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-500"
          onClick={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

// Sub-components for cleaner structure
const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", colors[color])}>
          <Icon size={24} />
        </div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
           LIVE
        </div>
      </div>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">{value}</h3>
      <p className="text-xs font-bold text-slate-500 truncate">{title}</p>
      <div className="mt-3 flex items-center gap-2">
         <span className={cn("w-1 h-1 rounded-full", `bg-${color}-500`)} />
         <p className="text-[9px] font-black uppercase text-slate-400 tracking-tight">{trend}</p>
      </div>
    </div>
  );
};

const TaskCard = ({ 
  task, 
  drivers, 
  isSelected, 
  isBulkSelected, 
  onSelect, 
  onToggleSelection, 
  onUpdateStatus, 
  onAssignDriver, 
  onVerifyBatch,
  user 
}) => {
  const assignedDriver = drivers.find(d => d.id === task.driver_id);
  
  function getStatusIndex(status) {
    const s = status?.toUpperCase();
    if (['PENDING DELIVERY', 'ASSIGNED'].includes(s)) return 0;
    if (s === 'PICKED_UP') return 1;
    if (['IN_TRANSIT', 'ARRIVED'].includes(s)) return 2;
    if (s === 'DELIVERED') return 3;
    return -1;
  }

  const StatusStepper = ({ status }) => {
    const currentIndex = getStatusIndex(status);
    const steps = [
      { label: 'Ordered', icon: Package },
      { label: 'Picked Up', icon: Warehouse },
      { label: 'Transit', icon: Truck },
      { label: 'Delivered', icon: CheckCircle },
    ];

    return (
      <div className="flex items-center w-full px-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center relative group/step">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 z-10",
                  isActive ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-slate-100 text-slate-400",
                  isCurrent && "ring-4 ring-blue-50"
                )}>
                  <Icon size={12} />
                </div>
                <span className={cn(
                  "absolute -bottom-4 text-[7px] font-black uppercase tracking-tight whitespace-nowrap",
                  isActive ? "text-blue-600" : "text-slate-400"
                )}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 mb-0 rounded-full",
                  idx < currentIndex ? "bg-blue-600" : "bg-slate-100"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-[24px] border transition-all duration-300 overflow-hidden flex flex-col lg:flex-row items-stretch cursor-pointer group hover:border-blue-200",
        isSelected ? "border-blue-600 ring-4 ring-blue-50 shadow-xl" : "border-slate-100 shadow-sm hover:shadow-md"
      )}
      onClick={onSelect}
    >
      {/* Selection Checkbox */}
      {(user.role === 'admin' || user.role === 'ceo') && (
        <div 
          className={cn(
            "px-4 flex items-center justify-center border-r border-slate-50 transition-colors",
            isBulkSelected ? "bg-blue-50" : "bg-slate-50/30 group-hover:bg-slate-50"
          )} 
          onClick={e => e.stopPropagation()}
        >
          <Checkbox 
            checked={isBulkSelected}
            onCheckedChange={onToggleSelection}
            className="w-5 h-5 rounded-md border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      )}

      {/* Left Section: Info */}
      <div className="p-5 lg:w-[25%] flex flex-col justify-center space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg">
            {task.invoice_number || `#${task.id}`}
          </span>
          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
             <Clock size={10} /> {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors truncate">
          {task.customer_name}
        </h3>
        <p className="text-[10px] font-bold text-slate-400 line-clamp-1 flex items-center gap-1">
          <MapPin size={10} /> {task.customer_address}
        </p>
      </div>

      {/* Middle Section: Status Stepper */}
      <div className="p-5 lg:w-[40%] flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-50">
        <StatusStepper status={task.status} />
      </div>

      {/* Right Section: Actions */}
      <div className="p-5 lg:w-[35%] flex flex-col sm:flex-row items-center gap-3 bg-slate-50/30" onClick={e => e.stopPropagation()}>
         <div className="flex-1 w-full grid grid-cols-3 gap-2">
            <button className="h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all group/btn shadow-sm">
               <Phone size={16} className="group-hover/btn:scale-110 transition-transform" />
            </button>
            <button className="h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all group/btn shadow-sm">
               <Navigation size={16} className="group-hover/btn:scale-110 transition-transform" />
            </button>
            <button className="h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all group/btn shadow-sm">
               <MoreVertical size={16} />
            </button>
         </div>
         
         <div className="w-full sm:w-auto min-w-[120px]">
            {task.status === 'ASSIGNED' && (
              <Button 
                size="sm" 
                className="w-full bg-amber-500 hover:bg-amber-600 text-[10px] font-black uppercase h-10 rounded-xl shadow-lg shadow-amber-100" 
                onClick={() => {
                  if (task.batch_id && task.batch) {
                    onVerifyBatch(task.batch);
                  } else {
                    onUpdateStatus(task.id, 'PICKED_UP');
                  }
                }}
              >
                Track Order
              </Button>
            )}
            {task.status === 'PICKED_UP' && (
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-[10px] font-black uppercase h-10 rounded-xl shadow-lg shadow-blue-100" onClick={() => onUpdateStatus(task.id, 'IN_TRANSIT')}>Dispatch</Button>
            )}
            {task.status === 'IN_TRANSIT' && (
              <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase h-10 rounded-xl shadow-lg shadow-indigo-100" onClick={() => onUpdateStatus(task.id, 'ARRIVED')}>Arrived</Button>
            )}
            {task.status === 'ARRIVED' && (
              <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-[10px] font-black uppercase h-10 rounded-xl shadow-lg shadow-emerald-100" onClick={() => onUpdateStatus(task.id, 'DELIVERED')}>Deliver</Button>
            )}
            {task.status === 'DELIVERED' && (
              <div className="h-10 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center gap-2">
                 <CheckCircle size={14} strokeWidth={3} />
                 <span className="text-[10px] font-black uppercase">Delivered</span>
              </div>
            )}
         </div>
      </div>

      {/* Card Footer: Metadata */}
      <div className="bg-slate-50 px-5 py-2 flex items-center justify-between border-t border-slate-100 lg:hidden">
         <div className="flex gap-2">
            {task.batch_id && (
              <Badge variant="outline" className="bg-white text-[8px] font-black border-slate-200">
                BATCH #{task.batch_id}
              </Badge>
            )}
            {task.driver_id && (
               <Badge variant="outline" className="bg-white text-[8px] font-black border-slate-200">
                  DRIVER: {assignedDriver?.username || task.driver_id}
               </Badge>
            )}
         </div>
         <button className="text-[10px] font-black text-blue-600 flex items-center gap-1 uppercase">
            Details <ChevronRight size={12} />
         </button>
      </div>
      
      {/* Absolute Badges for Desktop Footer/Overlay */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 hidden lg:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
          {task.batch_id && (
            <Badge className="bg-white/90 backdrop-blur-md text-slate-800 border-slate-200 text-[8px] font-black shadow-sm">
              BATCH #{task.batch_id}
            </Badge>
          )}
          {task.driver_id && (
             <Badge className="bg-white/90 backdrop-blur-md text-slate-800 border-slate-200 text-[8px] font-black shadow-sm">
                DRIVER: {assignedDriver?.username || task.driver_id}
             </Badge>
          )}
      </div>
    </div>
  );
};
