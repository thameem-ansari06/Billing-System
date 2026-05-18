import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Package, MapPin, Truck, CheckCircle, ShieldCheck, 
  Loader2, Navigation, AlertCircle, Clock
} from 'lucide-react';
import { API } from '../../config';
import VerticalStepper from '../ui/VerticalStepper';
import { Badge } from '@/components/ui/badge';

export default function CustomerTracking() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTracking = async () => {
    try {
      // Note: Tracking might need a public endpoint or special token, 
      // but for now we'll assume it's protected or handled via existing auth for simplicity
      // or we can use a non-auth endpoint if we implement it.
      // Let's assume standard auth for now since the user is likely logged in as 'customer'.
      const res = await fetch(`${API}/delivery-tasks/${taskId}`);
      if (!res.ok) throw new Error("Tracking info not found");
      const data = await res.json();
      setTask(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [taskId]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Locating your package...</p>
    </div>
  );

  if (!task) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-50">
      <AlertCircle size={64} className="text-red-400 mb-4" />
      <h1 className="text-2xl font-black text-slate-800">Invalid Tracking ID</h1>
      <p className="text-slate-500 font-bold max-w-xs">The tracking link you followed is invalid or has expired.</p>
    </div>
  );

  const steps = [
    { title: 'Order Assigned', description: 'Driver has been assigned to your order', timestamp: (task.timestamp_logs || {}).ASSIGNED },
    { title: 'Picked Up', description: 'Package collected from warehouse', timestamp: (task.timestamp_logs || {}).PICKED_UP },
    { title: 'In Transit', description: 'Package is on its way to you', timestamp: (task.timestamp_logs || {}).IN_TRANSIT },
    { title: 'Arrived', description: 'Driver is at your location', timestamp: (task.timestamp_logs || {}).ARRIVED },
    { title: 'Delivered', description: 'Handed over successfully', timestamp: (task.timestamp_logs || {}).DELIVERED }
  ];

  const currentStepIndex = steps.findIndex(s => s.title.toUpperCase().replace(' ', '_') === task.status) || 0;
  const isFailed = ['CANCELLED', 'REJECTED'].includes(task.status);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Header */}
      <div className="bg-indigo-600 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Truck size={100} />
        </div>
        
        <div className="max-w-md mx-auto relative z-10 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck size={16} className="text-indigo-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-100">Secured by OTP</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight">Tracking<br />Your Order</h1>
          <p className="text-indigo-100 font-bold text-xs">Tracking ID: {task.invoice_number || `#${task.id}`} • {task.customer_name}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-xl p-4 shadow-md shadow-indigo-100/50 border border-slate-100">
          {isFailed ? (
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-lg"><AlertCircle size={24} /></div>
              <div>
                <h2 className="text-lg font-bold">Delivery Failed</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status: {task.status}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg animate-pulse"><Clock size={24} /></div>
              <div>
                <h2 className="text-lg font-bold">
                  {task.status === 'DELIVERED' ? 'Order Delivered' : 'Delivery in Progress'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Estimated Arrival: Today
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stepper Card */}
        <div className="bg-white rounded-xl p-4 shadow-md shadow-indigo-100/20 border border-slate-100">
          <VerticalStepper steps={steps} currentStep={currentStepIndex} />
          
          {task.status === 'ARRIVED' && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-2">
              <div className="p-1 bg-emerald-500 text-white rounded-md mt-0.5"><ShieldCheck size={14} /></div>
              <p className="text-[10px] font-bold text-emerald-800 leading-relaxed">
                The driver has arrived. Please share the 4-digit OTP sent to your phone to receive the package.
              </p>
            </div>
          )}
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm shadow-slate-100 border border-slate-100 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-indigo-500" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery Location</h3>
          </div>
          <p className="text-xs font-bold text-slate-700 leading-relaxed ml-6">
            {task.customer_address}
          </p>
        </div>
      </div>
    </div>
  );
}
