import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { API } from '../config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        await login(data.access_token);
        toast.success('Welcome back! 🎉');
        
        try {
          const { jwtDecode } = await import('jwt-decode');
          const decoded = jwtDecode(data.access_token);
          const role = decoded.role;
          
          if (['admin', 'ceo'].includes(role)) {
            navigate('/dashboard');
          } else if (role === 'sales') {
            navigate('/quotes');
          } else if (role === 'accounts') {
            navigate('/payments-received');
          } else if (role === 'delivery') {
            navigate('/delivery-challans');
          } else if (role === 'user' || role === 'customer') {
            navigate('/customer/catalog');
          } else {
            navigate('/dashboard');
          }
        } catch(e) {
          navigate('/dashboard');
        }
      } else {
        toast.error(data.detail || 'Incorrect username or password');
      }
    } catch {
      toast.error('Cannot connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-7">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-lg font-black text-white">AR</span>
            </div>
            <span className="text-white font-bold tracking-wide">AR Hub</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome back</h1>
          <p className="text-indigo-200 text-sm mt-1">Sign in to access your portal.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">

          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="login-username" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} /> Username or Email
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your email or username"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={12} /> Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-300/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01] active:scale-95"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Signing in…</>
              : <>Sign In <ArrowRight size={16} /></>
            }
          </button>

          {/* Toggle to Signup */}
          <p className="text-center text-sm text-slate-500">
            New here?{' '}
            <Link to="/signup" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
              Create a free account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
