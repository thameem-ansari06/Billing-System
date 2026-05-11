import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Loader2, 
  CheckCircle, Building2, MapPin, CreditCard, FileText, ChevronLeft 
} from 'lucide-react';

import { API } from '../config';

// Password strength checker
const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  return score; // 0-4
};

const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['bg-slate-200', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-500'];

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Selection, 2: Form
  const [accountType, setAccountType] = useState('individual'); // 'individual' or 'enterprise'
  const [form, setForm] = useState({
    username:  '',
    full_name: '',
    email:     '',
    phone:     '',
    password:  '',
    confirm:   '',
    // Enterprise Fields
    company_name: '',
    gst_no: '',
    pan_no: '',
    business_address: '',
  });
  const [file, setFile] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showConf, setShowConf] = useState(false);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const pwStrength = getStrength(form.password);
  const pwMatch    = form.confirm && form.confirm === form.password;
  const pwMismatch = form.confirm && form.confirm !== form.password;

  const handleAccountSelect = (type) => {
    setAccountType(type);
    setStep(2);
    
    // Data Sanitization: If switching to individual, clear enterprise fields
    if (type === 'individual') {
      setForm(prev => ({
        ...prev,
        company_name: '',
        gst_no: '',
        pan_no: '',
        business_address: '',
      }));
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username.trim()) return toast.error('Username is required.');
    if (!form.full_name.trim()) return toast.error('Full Name is required.');
    if (!form.email.trim()) return toast.error('Email is required.');
    if (!form.phone.trim()) return toast.error('Phone number is required.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return toast.error('Passwords do not match.');

    if (accountType === 'enterprise') {
      if (!form.company_name.trim()) return toast.error('Company Name is required for Enterprise.');
      if (!form.gst_no.trim()) return toast.error('GST Number is required.');
      if (!GST_REGEX.test(form.gst_no.trim())) return toast.error('Invalid GST Number format.');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', form.username.trim());
      formData.append('password', form.password);
      formData.append('full_name', form.full_name.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('account_type', accountType);

      if (accountType === 'enterprise') {
        formData.append('company_name', form.company_name.trim());
        formData.append('gst_no', form.gst_no.trim());
        formData.append('pan_no', form.pan_no.trim());
        formData.append('business_address', form.business_address.trim());
        if (file) {
          formData.append('document', file);
        }
      }

      await axios.post(`${API}/auth/signup`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Account created! Please sign in.', { duration: 4000 });
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Signup failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 py-12 px-4">
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-slate-100 overflow-hidden">

        {/* Header gradient strip */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-7">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-lg font-black text-white">AR</span>
              </div>
              <span className="text-white font-bold tracking-wide">AR Hub</span>
            </div>
            {step === 2 && (
              <button 
                onClick={() => setStep(1)}
                className="text-white/80 hover:text-white flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {step === 1 ? 'Choose Account Type' : 'Create your account'}
          </h1>
          <p className="text-indigo-200 text-sm mt-1">
            {step === 1 ? 'Select how you want to use AR Hub' : `Joining as an ${accountType}`}
          </p>
        </div>

        {step === 1 ? (
          /* Selection Step */
          <div className="px-8 py-10 space-y-4">
            <button 
              onClick={() => handleAccountSelect('individual')}
              className="w-full group p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                <User size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Individual</h3>
                <p className="text-sm text-slate-500 mt-0.5">Personal use, basic tracking and dashboard.</p>
              </div>
            </button>

            <button 
              onClick={() => handleAccountSelect('enterprise')}
              className="w-full group p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">Enterprise</h3>
                <p className="text-sm text-slate-500 mt-0.5">Business use, GST billing, and team collaboration.</p>
              </div>
            </button>

            <p className="text-center text-sm text-slate-500 pt-4">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        ) : (
          /* Form Step */
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            
            <div className="space-y-4">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-1">Basic Information</h3>
              
              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={12} /> Username <span className="text-red-400">*</span>
                </label>
                <input
                  id="signup-username"
                  type="text"
                  required
                  value={form.username}
                  onChange={set('username')}
                  placeholder="e.g. john_doe"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={12} /> Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="signup-fullname"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={set('full_name')}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={12} /> Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone size={12} /> Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="signup-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                </div>
              </div>
            </div>

            {accountType === 'enterprise' && (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black text-violet-600 uppercase tracking-widest border-b border-violet-100 pb-1">Enterprise Details</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={12} /> Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.company_name}
                    onChange={set('company_name')}
                    placeholder="Acme Corp Pvt Ltd"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard size={12} /> GST Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.gst_no}
                      onChange={set('gst_no')}
                      placeholder="22AAAAA0000A1Z5"
                      className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition shadow-sm ${
                        form.gst_no && !GST_REGEX.test(form.gst_no) ? 'border-red-300 focus:ring-red-400' : 'border-slate-200 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard size={12} /> PAN Number
                    </label>
                    <input
                      type="text"
                      value={form.pan_no}
                      onChange={set('pan_no')}
                      placeholder="ABCDE1234F"
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={12} /> Business Address
                  </label>
                  <textarea
                    rows={2}
                    value={form.business_address}
                    onChange={set('business_address')}
                    placeholder="Full registered address..."
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} /> GST/PAN Document (Optional)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="hidden"
                      id="signup-doc"
                    />
                    <label 
                      htmlFor="signup-doc"
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-500 truncate mr-2">
                        {file ? file.name : 'Upload business proof...'}
                      </span>
                      <FileText size={16} className="text-slate-400" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-1">Security</h3>
              
              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={12} /> Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= pwStrength ? strengthColor[pwStrength] : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={12} /> Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm"
                    type={showConf ? 'text' : 'password'}
                    required
                    value={form.confirm}
                    onChange={set('confirm')}
                    placeholder="Re-enter password"
                    className={`w-full px-4 py-2.5 pr-10 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition shadow-sm ${
                      pwMismatch ? 'border-red-300 focus:ring-red-400'
                      : pwMatch   ? 'border-emerald-300 focus:ring-emerald-400'
                                   : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01] active:scale-95"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Creating account…</>
                : <>Complete Signup <ArrowRight size={16} /></>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
