import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, MapPin, Plus, Trash2, LogOut, Save, Loader2, Eye, EyeOff, CheckCircle, ShieldCheck, Edit3 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

import { API } from '../../config';

const TABS = ['Profile', 'Addresses', 'Security'];

// ── Address Book (localStorage) ──────────────────────────────────────────────
function AddressBook({ userId }) {
  const STORAGE_KEY = `addresses_${userId}`;
  const [addresses, setAddresses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [form, setForm] = useState({ label: '', line1: '', city: '', state: '', pincode: '' });
  const [adding, setAdding] = useState(false);

  const save = (updated) => {
    setAddresses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!form.line1.trim() || !form.city.trim()) {
      toast.error('Please fill Address Line 1 and City.');
      return;
    }
    save([...addresses, { ...form, id: Date.now() }]);
    setForm({ label: '', line1: '', city: '', state: '', pincode: '' });
    setAdding(false);
    toast.success('Address saved!');
  };

  const handleDelete = (id) => {
    save(addresses.filter(a => a.id !== id));
    toast('Address removed', { icon: '🗑️' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-700">Saved Delivery Addresses</h3>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      {/* Add Form */}
      {adding && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
          {[
            { key: 'label',   placeholder: 'Label (e.g. Home, Office)', label: 'Label' },
            { key: 'line1',   placeholder: '123 Street, Area',           label: 'Address Line 1 *' },
            { key: 'city',    placeholder: 'City *',                     label: 'City *' },
            { key: 'state',   placeholder: 'State',                      label: 'State' },
            { key: 'pincode', placeholder: 'Pincode',                    label: 'Pincode' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={handleAdd} className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition">
              Save Address
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-1.5 text-slate-500 font-medium rounded-lg text-xs hover:bg-white transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 && !adding ? (
        <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <MapPin size={24} className="mx-auto mb-2" strokeWidth={1} />
          <p className="text-xs font-medium text-slate-500">No saved addresses yet</p>
        </div>
      ) : (
        addresses.map(addr => (
          <div key={addr.id} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500 flex-shrink-0">
              <MapPin size={16} />
            </div>
            <div className="flex-1 min-w-0">
              {addr.label && <p className="font-bold text-xs text-slate-700">{addr.label}</p>}
              <p className="text-[10px] text-slate-500">{addr.line1}</p>
              <p className="text-[10px] text-slate-500">{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
            </div>
            <button onClick={() => handleDelete(addr.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Main Profile Component ───────────────────────────────────────────────────
export default function CustomerProfile() {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Profile');
  const [profile, setProfile]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile form
  const [form, setForm] = useState({ 
    full_name: '', 
    email: '', 
    phone: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    gstin: ''
  });

  // Password form
  const [pwForm, setPwForm]           = useState({ current_password: '', new_password: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [savingPw, setSavingPw]       = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    axios.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(res => {
        setProfile(res.data);
        setForm({
          full_name:    res.data.full_name || '',
          email:        res.data.email     || '',
          phone:        res.data.phone     || '',
          address_line: res.data.address_line || '',
          city:         res.data.city || '',
          state:        res.data.state || '',
          pincode:      res.data.pincode || '',
          gstin:        res.data.gstin || ''
        });
      })
      .catch(() => toast.error('Failed to load profile.'));
  }, [user]);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/me`, form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await refreshUser();
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        full_name:    profile.full_name || '',
        email:        profile.email     || '',
        phone:        profile.phone     || '',
        address_line: profile.address_line || '',
        city:         profile.city || '',
        state:        profile.state || '',
        pincode:      profile.pincode || '',
        gstin:        profile.gstin || ''
      });
    }
    setIsEditing(false);
  };

  const handlePasswordChange = async () => {
    if (!pwForm.current_password || !pwForm.new_password) {
      toast.error('All password fields are required.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await axios.put(`${API}/users/me`, {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success('Password changed! Please log in again.', { duration: 4000 });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setTimeout(() => logout(), 2000);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const inputCls = "w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition";

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-4 text-white flex items-center gap-4 shadow-md shadow-indigo-500/20">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold uppercase flex-shrink-0">
          {(profile?.full_name || profile?.username || user?.username || '?')[0].toUpperCase()}
        </div>
        <div>
          <p className="text-indigo-200 text-[9px] font-bold uppercase tracking-widest">My Account</p>
          <h1 className="text-lg font-bold mt-0.5">{profile?.full_name || profile?.username || user?.username}</h1>
          <p className="text-indigo-200 text-[10px] mt-0.5 capitalize">Role: {profile?.role || user?.role}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === tab
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {activeTab === 'Profile' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2"><User size={16} /> Account Information</h2>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1"
              >
                <Edit3 size={12} /> Edit Profile
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-1 md:col-span-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Username</p>
                <p className="text-xs font-bold text-slate-800">{profile?.username || user?.username}</p>
              </div>

              {[
                { label: 'Full Name',    value: profile?.full_name, col: 'md:col-span-2' },
                { label: 'Email Address',value: profile?.email,     col: 'md:col-span-1' },
                { label: 'Phone Number', value: profile?.phone,     col: 'md:col-span-1' },
                { label: 'Address Line', value: profile?.address_line, col: 'md:col-span-2' },
                { label: 'City',         value: profile?.city,      col: 'md:col-span-1' },
                { label: 'State',        value: profile?.state,     col: 'md:col-span-1' },
                { label: 'Pincode',      value: profile?.pincode,   col: 'md:col-span-1' },
                { label: 'GSTIN',        value: profile?.gstin,     col: 'md:col-span-1' },
              ].map(f => (
                <div key={f.label} className={`space-y-0.5 ${f.col}`}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{f.label}</p>
                  <p className="text-xs font-bold text-slate-800">{f.value || <span className="text-slate-300 italic font-medium">Not provided</span>}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block">Username (read-only)</label>
                  <input value={profile?.username || user?.username || ''} disabled className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`} />
                </div>

                {[
                  { key: 'full_name', label: 'Full Name',    icon: <User  size={14} />, placeholder: 'Your full name', col: 'md:col-span-2' },
                  { key: 'email',     label: 'Email Address',icon: <Mail  size={14} />, placeholder: 'you@example.com', col: 'md:col-span-1' },
                  { key: 'phone',     label: 'Phone Number', icon: <Phone size={14} />, placeholder: '+91 98765 43210', col: 'md:col-span-1' },
                  { key: 'address_line', label: 'Address Line', icon: <MapPin size={14} />, placeholder: 'Building, Street...', col: 'md:col-span-2' },
                  { key: 'city',      label: 'City',         icon: <MapPin size={14} />, placeholder: 'City', col: 'md:col-span-1' },
                  { key: 'state',     label: 'State',        icon: <MapPin size={14} />, placeholder: 'State', col: 'md:col-span-1' },
                  { key: 'pincode',   label: 'Pincode',      icon: <MapPin size={14} />, placeholder: 'Pincode', col: 'md:col-span-1' },
                  { key: 'gstin',     label: 'GSTIN',        icon: <ShieldCheck size={14} />, placeholder: '22AAAAA0000A1Z5', col: 'md:col-span-1' },
                ].map(f => (
                  <div key={f.key} className={`space-y-1 ${f.col}`}>
                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">{f.icon} {f.label}</label>
                    <input
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Addresses */}
      {activeTab === 'Addresses' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <AddressBook userId={user?.id} />
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'Security' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
          <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Lock size={16} /> Change Password</h2>

          {[
            { key: 'current_password', label: 'Current Password', show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { key: 'new_password',     label: 'New Password',     show: showNew,     toggle: () => setShowNew(v => !v)     },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">{f.label}</label>
              <div className="relative">
                <input
                  type={f.show ? 'text' : 'password'}
                  value={pwForm[f.key]}
                  onChange={e => setPwForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder="••••••••"
                  className={`${inputCls} pr-8`}
                />
                <button
                  onClick={f.toggle}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 block">Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(prev => ({ ...prev, confirm: e.target.value }))}
              placeholder="••••••••"
              className={`${inputCls} ${pwForm.confirm && pwForm.confirm !== pwForm.new_password ? 'border-red-300 ring-1 ring-red-400' : ''}`}
            />
            {pwForm.confirm && pwForm.confirm !== pwForm.new_password && (
              <p className="text-[9px] text-red-500 mt-0.5">Passwords do not match</p>
            )}
            {pwForm.confirm && pwForm.confirm === pwForm.new_password && pwForm.confirm.length > 0 && (
              <p className="text-[9px] text-emerald-500 flex items-center gap-1 mt-0.5"><CheckCircle size={10} /> Passwords match</p>
            )}
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={savingPw}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
          >
            {savingPw ? <><Loader2 size={14} className="animate-spin" /> Changing…</> : <><Lock size={14} /> Change Password</>}
          </button>

          {/* Logout */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => { logout(); toast('Logged out successfully', { icon: '👋' }); }}
              className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 border border-red-100"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
