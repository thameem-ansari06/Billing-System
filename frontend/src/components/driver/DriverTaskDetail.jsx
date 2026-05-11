import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Truck, MapPin, Phone, CheckCircle, Navigation, 
  Camera, Edit3, X, Loader2, ArrowLeft, Send, ShieldCheck,
  AlertTriangle, RotateCcw, Package, Clock, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import SignaturePad from 'react-signature-canvas'
import VerticalStepper from '../ui/VerticalStepper';
import { API } from '../../config';

export default function DriverTaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Verification states
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [otpInput, setOtpInput] = useState('');

  // Proof states
  const sigCanvas = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchTaskDetail = async () => {
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("Task not found");
      const data = await res.json();
      setTask(data);
    } catch (err) {
      toast.error(err.message);
      navigate('/driver/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchTaskDetail();
  }, [taskId, user?.token]);

  const handleStatusUpdate = async (newStatus) => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchTaskDetail();
      }
    } catch (err) {
      toast.error("Failed to update status.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleVerifyPickup = async () => {
    if (!pickupCodeInput) return toast.error("Enter Pickup Code");
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}/verify-pickup?otp=${pickupCodeInput}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success("Pickup Verified!");
        fetchTaskDetail();
      } else {
        toast.error("Invalid Pickup Code");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setIsActionLoading(false);
    }
  };  const handleArrive = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}/arrive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success("OTP sent to customer's email");
        fetchTaskDetail();
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to notify arrival");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`${API}/delivery-tasks/${taskId}/resend-otp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success("OTP resent to customer's email");
      } else {
        toast.error("Failed to resend OTP.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleVerifyOTPAndComplete = async () => {
    if (!otpInput) return toast.error("Enter OTP");
    if (!photo) return toast.error("Take a delivery photo");
    if (sigCanvas.current.isEmpty()) return toast.error("Customer signature required");

    setIsActionLoading(true);

    try {
      const signatureBase64 = sigCanvas.current.getCanvas().toDataURL('image/png');
      
      const formData = new FormData();
      formData.append('otp', otpInput);
      formData.append('signature', signatureBase64);
      formData.append('photo', photo);

      const res = await fetch(`${API}/delivery-tasks/verify-delivery/${taskId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: formData
      });

      if (res.ok) {
        toast.success("Delivery Completed Successfully!");
        fetchTaskDetail();
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to verify OTP.");
      }
    } catch (err) {
      console.error("Complete Delivery Error:", err);
      toast.error("An error occurred. Check console for details.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const openGoogleMaps = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <Truck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
      </div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Syncing Task Data...</p>
    </div>
  );

  const steps = [
    { title: 'Assigned', description: 'Task assigned', timestamp: (task.timestamp_logs || {}).ASSIGNED },
    { title: 'Picked Up', description: 'At warehouse', timestamp: (task.timestamp_logs || {}).PICKED_UP },
    { title: 'In Transit', description: 'On the road', timestamp: (task.timestamp_logs || {}).IN_TRANSIT },
    { title: 'Arrived', description: 'At location', timestamp: (task.timestamp_logs || {}).ARRIVED },
    { title: 'Delivered', description: 'Handed over', timestamp: (task.timestamp_logs || {}).DELIVERED }
  ];

  const currentStepIndex = steps.findIndex(s => s.title.toUpperCase().replace(' ', '_') === task.status) || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Mobile-First Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/driver/dashboard')} 
            className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full flex items-center justify-center transition-all active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-none">
              {task.invoice_number ? `Invoice #${task.invoice_number}` : `Order #${task.id}`}
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Delivery Task</p>
          </div>
        </div>
        <Badge className={
          task.status === 'DELIVERED' ? "bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-black uppercase text-[10px]" :
          task.status === 'CANCELLED' || task.status === 'REJECTED' ? "bg-red-100 text-red-700 border-none px-3 py-1 font-black uppercase text-[10px]" :
          "bg-indigo-100 text-indigo-700 border-none px-3 py-1 font-black uppercase text-[10px]"
        }>
          {task.status?.replace('_', ' ')}
        </Badge>
      </div>

      <div className="p-4 space-y-6">
        {/* Customer & Location Card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Customer Info</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact & Location</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-50 rounded-xl shrink-0 mt-0.5">
                <MapPin size={18} className="text-indigo-500" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination Address</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">{task.customer_address}</p>
                <button 
                  onClick={() => openGoogleMaps(task.customer_address)}
                  className="text-xs font-black text-indigo-600 flex items-center gap-1 mt-1 uppercase tracking-wider"
                >
                  <Navigation size={12} /> View on Map
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-50 rounded-xl shrink-0 mt-0.5">
                <Phone size={18} className="text-indigo-400" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Contact</p>
                <p className="text-sm font-black text-slate-800">{task.customer_name}</p>
                <a href={`tel:${task.contact_number}`} className="text-xs font-black text-indigo-600 uppercase tracking-wider block mt-0.5">
                  {task.contact_number}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stepper Card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Delivery Timeline</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step-by-step tracking</p>
            </div>
          </div>
          <VerticalStepper steps={steps} currentStep={currentStepIndex} />
        </div>

        {/* Dynamic Action Zone */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-indigo-900/20 text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Driver Action</h2>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Authentication Required</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            {/* ASSIGNED -> PICKED_UP */}
            {task.status === 'ASSIGNED' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  Enter the <span className="text-white font-black">Pickup OTP</span> provided by the warehouse to confirm collection.
                </p>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="------"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-5 text-center text-4xl font-black tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-all placeholder:text-white/10"
                  value={pickupCodeInput}
                  onChange={(e) => setPickupCodeInput(e.target.value)}
                />
                <Button 
                  className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-600/20"
                  onClick={handleVerifyPickup}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="animate-spin" /> : "Verify Collection"}
                </Button>
              </div>
            )}

            {/* PICKED_UP -> ARRIVED */}
            {task.status === 'PICKED_UP' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  Head to the destination. Once you reach the customer, tap <span className="text-white font-black">I Have Arrived</span>.
                </p>
                <Button 
                  variant="outline"
                  className="w-full h-14 border-white/10 hover:bg-white/5 text-white font-black rounded-2xl flex gap-2"
                  onClick={() => openGoogleMaps(task.customer_address)}
                >
                  <ExternalLink size={18} /> Open Navigation
                </Button>
                <Button 
                  className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-600/20 flex gap-2 justify-center items-center"
                  onClick={handleArrive}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <><Loader2 className="animate-spin" /> Sending OTP...</> : "I Have Arrived"}
                </Button>
              </div>
            )}

            {/* ARRIVED -> OTP Verification & Proof */}
            {task.status === 'ARRIVED' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Delivery OTP</label>
                    <button onClick={handleResendOTP} disabled={isActionLoading} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">
                      Resend OTP
                    </button>
                  </div>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="------"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-5 text-center text-4xl font-black tracking-[0.5em] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-white/10"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div 
                    className="border-2 border-dashed border-white/10 rounded-2xl p-4 text-center hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden group"
                    onClick={() => document.getElementById('photo-input').click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                    ) : (
                      <div className="py-6 flex flex-col items-center gap-3 text-slate-500 group-hover:text-slate-300">
                        <Camera size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Capture Delivery Photo</p>
                      </div>
                    )}
                    <input id="photo-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Signature</label>
                      <button onClick={() => sigCanvas.current.clear()} className="text-[10px] font-black text-red-400 uppercase tracking-widest">Reset</button>
                    </div>
                    <div className="border border-white/10 rounded-2xl bg-white overflow-hidden shadow-inner">
                      <SignaturePad ref={sigCanvas} penColor="black" canvasProps={{className: "w-full h-32 cursor-crosshair"}} />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-600/20"
                  onClick={handleVerifyOTPAndComplete}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="animate-spin" /> : "Complete Delivery"}
                </Button>
              </div>
            )}

            {/* DELIVERED SUCCESS */}
            {task.status === 'DELIVERED' && (
              <div className="text-center py-10 space-y-6">
                <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 animate-in zoom-in-50 duration-500">
                  <CheckCircle size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">Mission Success</h3>
                  <p className="text-slate-400 text-sm font-bold">The package has been successfully handed over and verified.</p>
                </div>
                <Button 
                  className="bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl px-8"
                  onClick={() => navigate('/driver/dashboard')}
                >
                  Back to Hub
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Exception Handling Buttons */}
        {task.status !== 'DELIVERED' && task.status !== 'CANCELLED' && task.status !== 'REJECTED' && (
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <AlertTriangle size={12} className="text-amber-500" /> Support & Exceptions
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="p-4 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl border border-slate-100 hover:border-red-100 transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2"
                onClick={() => handleStatusUpdate('CANCELLED')}
              >
                <X size={18} /> Not Home
              </button>
              <button 
                className="p-4 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl border border-slate-100 hover:border-red-100 transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2"
                onClick={() => handleStatusUpdate('REJECTED')}
              >
                <RotateCcw size={18} /> Rejected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
