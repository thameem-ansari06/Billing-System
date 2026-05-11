import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Package, Clock, MapPin, Phone, FileText, AlertCircle, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import VerticalStepper from './ui/VerticalStepper';
import { API, BASE_URL } from '../config';

export default function DeliveryTasks() {
  const [tasks, setTasks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
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
           // Refresh selected task for the timeline
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

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED': return <Badge className="bg-amber-100 text-amber-700 font-black">Assigned</Badge>;
      case 'PICKED_UP': return <Badge className="bg-blue-100 text-blue-700 font-black">Picked Up</Badge>;
      case 'IN_TRANSIT': return <Badge className="bg-indigo-100 text-indigo-700 font-black">In Transit</Badge>;
      case 'ARRIVED': return <Badge className="bg-violet-100 text-violet-700 font-black">Arrived</Badge>;
      case 'DELIVERED': return <Badge className="bg-emerald-100 text-emerald-700 font-black">Delivered</Badge>;
      case 'CANCELLED':
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 font-black">{status}</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-600 font-black">{status}</Badge>;
    }
  };

  const getTimelineSteps = (task) => [
    { title: 'Assigned', description: 'Driver assigned to order', timestamp: task.timestamp_logs?.ASSIGNED },
    { title: 'Picked Up', description: 'At warehouse', timestamp: task.timestamp_logs?.PICKED_UP },
    { title: 'In Transit', description: 'On the road', timestamp: task.timestamp_logs?.IN_TRANSIT },
    { title: 'Arrived', description: 'At destination', timestamp: task.timestamp_logs?.ARRIVED },
    { title: 'Delivered', description: 'Complete', timestamp: task.timestamp_logs?.DELIVERED }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative min-h-screen">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Delivery Tasks</h1>
            <p className="text-sm font-medium text-slate-500">Manage order fulfillment and dispatch logistics</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(!Array.isArray(tasks) || tasks.length === 0) ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <Package size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-bold">No active delivery tasks found.</p>
          </div>
        ) : (
          Array.isArray(tasks) && tasks.map((task) => {
            const assignedDriver = drivers.find(d => d.id === task.driver_id);
            return (
            <div 
              key={task.id} 
              className={`bg-white rounded-2xl border ${selectedTask?.id === task.id ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-200'} shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col lg:flex-row items-stretch cursor-pointer group`}
              onClick={() => setSelectedTask(task)}
            >
              {/* Section 1: Customer & Status */}
              <div className="p-5 lg:w-1/4 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-center space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                    {task.invoice_number || `#${task.id}`}
                  </p>
                  <div className="lg:hidden">{getStatusBadge(task.status)}</div>
                </div>
                <h3 className="text-base font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{task.customer_name}</h3>
                <div className="hidden lg:block mt-1">{getStatusBadge(task.status)}</div>
              </div>
              
              {/* Section 2: Address & Contact */}
              <div className="p-5 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-center space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Delivery Address</p>
                    <p className="text-sm font-bold text-slate-600 leading-snug line-clamp-2">{task.customer_address}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400 shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Contact Customer</p>
                    <p className="text-sm font-black text-indigo-600">{task.contact_number}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Driver Selection Enhancement */}
              <div className="p-5 lg:w-1/4 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-center bg-slate-50/30" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Truck size={14} className="text-indigo-500" />
                    Delivery Executive
                  </p>
                </div>
                
                {task.driver_id ? (
                  <div className="flex flex-col gap-2 relative group/driver">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-300">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black shrink-0 shadow-inner">
                        {assignedDriver?.full_name?.charAt(0) || assignedDriver?.username?.charAt(0) || (task.driver_id ? 'D' : '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {assignedDriver?.full_name || assignedDriver?.username || `Driver ID: ${task.driver_id}`}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mt-0.5">
                          <CheckCircle size={10} /> {task.status === 'ASSIGNED' ? 'Assigned' : task.status}
                        </p>
                      </div>
                      
                      {assignedDriver?.phone && (
                        <a href={`tel:${assignedDriver.phone}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Call Driver">
                          <Phone size={16} />
                        </a>
                      )}
                    </div>

                    {(user.role === 'admin' || user.role === 'ceo') && (
                      <div className="absolute inset-0 opacity-0 group-hover/driver:opacity-100 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all p-2 border border-indigo-200 shadow-sm z-10">
                        <select
                          className="w-full h-full text-xs font-bold bg-transparent text-indigo-700 outline-none cursor-pointer"
                          value={task.driver_id || ""}
                          onChange={(e) => assignDriver(task.id, e.target.value)}
                        >
                          <option value="">Reassign Driver</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.full_name || d.username}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-rose-50 p-3 rounded-xl border border-rose-100 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
                      <AlertCircle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <select 
                        className="w-full bg-transparent text-sm font-bold text-rose-700 focus:ring-0 outline-none cursor-pointer appearance-none"
                        value={task.driver_id || ""}
                        onChange={(e) => assignDriver(task.id, e.target.value)}
                        disabled={user.role !== 'admin' && user.role !== 'ceo'}
                      >
                        <option value="" className="text-slate-500">Assign Driver...</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id} className="text-slate-800">{d.full_name || d.username}</option>
                        ))}
                      </select>
                      <p className="text-[10px] font-bold text-rose-500 uppercase mt-0.5">Action Required</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Actions */}
              <div className="p-5 lg:w-1/5 bg-slate-50 flex flex-col items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                {task.status === 'ASSIGNED' && (
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black shadow-sm shadow-amber-200"
                    onClick={() => updateStatus(task.id, 'PICKED_UP')}
                  >
                    Mark Picked Up
                  </Button>
                )}
                {task.status === 'PICKED_UP' && (
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-sm shadow-indigo-200"
                    onClick={() => updateStatus(task.id, 'IN_TRANSIT')}
                  >
                    Dispatch Now
                  </Button>
                )}
                {task.status === 'IN_TRANSIT' && (
                  <Button 
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black shadow-sm shadow-violet-200"
                    onClick={() => updateStatus(task.id, 'ARRIVED')}
                  >
                    Mark Arrived
                  </Button>
                )}
                {task.status === 'ARRIVED' && (
                  <Button 
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-sm shadow-emerald-200"
                    onClick={() => updateStatus(task.id, 'DELIVERED')}
                  >
                    Mark Delivered
                  </Button>
                )}
                {task.status === 'DELIVERED' && (
                  <div className="flex flex-col items-center justify-center gap-1 text-emerald-600 font-black text-sm p-2 bg-emerald-50 rounded-xl w-full">
                    <CheckCircle size={20} /> 
                    <span>Completed</span>
                  </div>
                )}
                {(task.status === 'CANCELLED' || task.status === 'REJECTED') && (
                  <div className="flex flex-col items-center justify-center gap-1 text-rose-600 font-black text-sm p-2 bg-rose-50 rounded-xl w-full">
                    <AlertCircle size={20} /> 
                    <span className="text-center">Terminated</span>
                  </div>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Timeline Sidebar/Drawer */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Task Timeline</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Tracking: {selectedTask.invoice_number || `#${selectedTask.id}`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedTask(null)}
              className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <VerticalStepper 
              steps={getTimelineSteps(selectedTask)} 
              currentStep={getTimelineSteps(selectedTask).findLastIndex(s => s.timestamp !== undefined)} 
            />

            <div className="mt-12 space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={14} className="text-indigo-500" /> Task Metadata
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Customer</p>
                    <p className="text-sm font-black text-slate-800">{selectedTask.customer_name}</p>
                 </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                    {getStatusBadge(selectedTask.status)}
                  </div>
                  {selectedTask.status === 'ASSIGNED' && selectedTask.pickup_otp && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Pickup OTP (For Driver)</p>
                      <p className="text-xl font-black text-indigo-700 tracking-[0.2em]">{selectedTask.pickup_otp}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                     {selectedTask.invoice_number && (
                        <Button 
                          variant="ghost" 
                          className="bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase h-10 rounded-xl"
                          onClick={() => window.open(`/invoices/${selectedTask.invoice_number}`, '_blank')}
                        >
                          <FileText size={14} className="mr-2" /> Invoice
                        </Button>
                     )}
                     {selectedTask.order_reference && (
                        <Button 
                          variant="ghost" 
                          className="bg-slate-100 text-slate-600 font-black text-[10px] uppercase h-10 rounded-xl"
                          onClick={() => window.open(`/orders/${selectedTask.order_reference}`, '_blank')}
                        >
                          <Package size={14} className="mr-2" /> Order
                        </Button>
                     )}
                  </div>
                 {selectedTask.challan_url && (
                    <Button 
                      variant="outline" 
                      className="w-full bg-white border-slate-200 font-bold h-12 rounded-xl text-sm"
                      onClick={() => window.open(`${BASE_URL}${selectedTask.challan_url}`, '_blank')}
                    >
                      <FileText size={18} className="mr-2 text-blue-500" /> View Delivery Challan
                    </Button>
                 )}
                 {selectedTask.status === 'DELIVERED' && (selectedTask.delivery_photo_url || selectedTask.signature_url) && (
                   <div className="space-y-4 pt-4 border-t border-slate-100">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle size={14} className="text-emerald-500" /> Proof of Delivery
                     </h4>
                     <div className="grid grid-cols-2 gap-4">
                       {selectedTask.delivery_photo_url && (
                         <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">
                           <p className="text-[10px] font-bold text-center py-2 text-slate-500 uppercase bg-slate-100/50">Photo</p>
                           <img src={`${BASE_URL}${selectedTask.delivery_photo_url}`} alt="Delivery Photo" className="w-full h-32 object-cover" />
                         </div>
                       )}
                       {selectedTask.signature_url && (
                         <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                           <p className="text-[10px] font-bold text-center py-2 text-slate-500 uppercase bg-slate-100/50">Signature</p>
                           <img src={`${BASE_URL}${selectedTask.signature_url}`} alt="Signature" className="w-full h-32 object-contain p-2" />
                         </div>
                       )}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <Button 
               className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl"
               onClick={() => setSelectedTask(null)}
             >
               Close Timeline
             </Button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
