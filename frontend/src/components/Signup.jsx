import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

const API = 'http://localhost:8000';

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

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username:  '',
    full_name: '',
    email:     '',
    phone:     '',
    password:  '',
    confirm:   '',
  });
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [showConf, setShowConf] = useState(false);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const pwStrength = getStrength(form.password);
  const pwMatch    = form.confirm && form.confirm === form.password;
  const pwMismatch = form.confirm && form.confirm !== form.password;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username.trim()) return toast.error('Username is required.');
    if (!form.full_name.trim()) return toast.error('Full Name is required.');
    if (!form.email.trim()) return toast.error('Email is required.');
    if (!form.phone.trim()) return toast.error('Phone number is required.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return toast.error('Passwords do not match.');

    setLoading(true);
    try {
      await axios.post(`${API}/auth/signup`, {
        username:  form.username.trim(),
        password:  form.password,
        full_name: form.full_name.trim() || undefined,
        email:     form.email.trim()     || undefined,
        phone:     form.phone.trim()     || undefined,
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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-lg font-black text-white">AR</span>
            </div>
            <span className="text-white font-bold tracking-wide">AR Hub</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create your account</h1>
          <p className="text-indigo-200 text-sm mt-1">Start tracking your business purchases today.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">

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
              autoComplete="username"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} /> Full Name
            </label>
            <input
              id="signup-fullname"
              type="text"
              value={form.full_name}
              onChange={set('full_name')}
              placeholder="John Doe"
              autoComplete="name"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
            />
          </div>

          {/* Email + Phone side-by-side on md+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={12} /> Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={12} /> Phone
              </label>
              <input
                id="signup-phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+91 9876543210"
                autoComplete="tel"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
              />
            </div>
          </div>

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
                autoComplete="new-password"
                className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {form.password && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= pwStrength ? strengthColor[pwStrength] : 'bg-slate-200'}`} />
                  ))}
                </div>
                <p className={`text-xs font-semibold ${pwStrength >= 3 ? 'text-emerald-500' : pwStrength >= 2 ? 'text-amber-500' : 'text-red-400'}`}>
                  {strengthLabel[pwStrength]}
                </p>
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
                autoComplete="new-password"
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
            {pwMatch && (
              <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                <CheckCircle size={12} /> Passwords match
              </p>
            )}
            {pwMismatch && (
              <p className="text-xs text-red-500 font-semibold">Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <button
            id="signup-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-300/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01] active:scale-95"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Creating account…</>
              : <>Create Account <ArrowRight size={16} /></>
            }
          </button>

          {/* Toggle to Login */}
          <p className="text-center text-sm text-slate-500 pt-1">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
