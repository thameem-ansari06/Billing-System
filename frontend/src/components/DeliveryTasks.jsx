import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Package, Clock, MapPin, Phone, FileText, AlertCircle, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import VerticalStepper from './ui/VerticalStepper';

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
      const res = await fetch('http://localhost:8000/api/delivery-tasks/', {
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
      const res = await fetch('http://localhost:8000/api/delivery-tasks/drivers', {
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
      const res = await fetch(`http://localhost:8000/api/delivery-tasks/${taskId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success(`Task marked as ${newStatus}!`);
        fetchTasks();
        if (selectedTask?.id === taskId) {
           // Refresh selected task for the timeline
           const updatedTaskRes = await fetch(`http://localhost:8000/api/delivery-tasks/${taskId}`, {
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
      const res = await fetch(`http://localhost:8000/api/delivery-tasks/${taskId}/assign?driver_id=${driverId}`, {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(!Array.isArray(tasks) || tasks.length === 0) ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <Package size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-bold">No active delivery tasks found.</p>
          </div>
        ) : (
          Array.isArray(tasks) && tasks.map((task) => (
            <div 
              key={task.id} 
              className={`bg-white rounded-2xl border ${selectedTask?.id === task.id ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-200'} shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group`}
              onClick={() => setSelectedTask(task)}
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Tracking ID: {task.invoice_number || `#${task.id}`}
                  </p>
                  <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{task.customer_name}</h3>
                </div>
                {getStatusBadge(task.status)}
              </div>
              
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Delivery Address</p>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed line-clamp-2">{task.customer_address}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Contact</p>
                    <p className="text-sm font-black text-indigo-600">{task.contact_number}</p>
                  </div>
                </div>

                <div className="pt-2" onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Driver</p>
                  <select 
                    className="w-full p-2 text-xs font-bold border rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                    value={task.driver_id || ""}
                    onChange={(e) => assignDriver(task.id, e.target.value)}
                    disabled={user.role !== 'admin' && user.role !== 'ceo'}
                  >
                    <option value="">Unassigned</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name || d.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex gap-2" onClick={e => e.stopPropagation()}>
                {task.status === 'ASSIGNED' && (
                  <Button 
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black"
                    onClick={() => updateStatus(task.id, 'PICKED_UP')}
                  >
                    Mark Picked Up
                  </Button>
                )}
                {task.status === 'PICKED_UP' && (
                  <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black"
                    onClick={() => updateStatus(task.id, 'IN_TRANSIT')}
                  >
                    Dispatch Now
                  </Button>
                )}
                {task.status === 'IN_TRANSIT' && (
                  <Button 
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black"
                    onClick={() => updateStatus(task.id, 'ARRIVED')}
                  >
                    Mark Arrived
                  </Button>
                )}
                {task.status === 'ARRIVED' && (
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
                    onClick={() => updateStatus(task.id, 'DELIVERED')}
                  >
                    Mark Delivered
                  </Button>
                )}
                {task.status === 'DELIVERED' && (
                  <div className="flex-1 flex items-center justify-center gap-2 text-emerald-600 font-black text-sm py-2">
                    <CheckCircle size={16} /> Completed
                  </div>
                )}
                {(task.status === 'CANCELLED' || task.status === 'REJECTED') && (
                  <div className="flex-1 flex items-center justify-center gap-2 text-red-600 font-black text-sm py-2">
                    <AlertCircle size={16} /> Task Terminated
                  </div>
                )}
              </div>
            </div>
          ))
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
                      onClick={() => window.open(`http://localhost:8000${selectedTask.challan_url}`, '_blank')}
                    >
                      <FileText size={18} className="mr-2 text-blue-500" /> View Delivery Challan
                    </Button>
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
