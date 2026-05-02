import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, ShieldCheck, LogOut, ChevronRight, Mail, UserCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return (
    <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
  );

  if (!user || !user.username) return null;

  const initials = user.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : (user.username ? user.username[0].toUpperCase() : 'U');

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Avatar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer group relative"
      >
        <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-indigo-500 transition-all shadow-sm group-hover:shadow-indigo-100 group-hover:shadow-lg">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30 border-b border-slate-100 flex flex-col items-center text-center">
             <div className="relative mb-4">
                <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                   <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                   <AvatarFallback className="text-2xl font-black">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 rounded-full text-white shadow-lg border-2 border-white">
                   <ShieldCheck size={14} />
                </div>
             </div>
             <h2 className="text-xl font-black text-slate-800 tracking-tight">{user.full_name || 'Authorized User'}</h2>
             <p className="text-sm font-bold text-slate-400 mt-0.5">@{user.username}</p>
          </div>

          {/* Details List */}
          <div className="p-6 space-y-5">
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><User size={16}/></div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</p>
                      <p className="text-sm font-bold text-slate-700">{user.full_name || 'N/A'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><Mail size={16}/></div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                      <p className="text-sm font-bold text-slate-700">{user.email || 'N/A'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><UserCircle size={16}/></div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</p>
                      <p className="text-sm font-black text-indigo-600 uppercase tracking-tighter">{user.role === 'admin' ? 'System Administrator' : 'Authorized User'}</p>
                   </div>
                </div>
             </div>

             {/* Navigation Actions */}
             <div className="pt-4 border-t border-slate-100 space-y-1">
                <button className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors text-sm font-bold text-slate-600 group">
                   <span className="flex items-center gap-3"><User size={16} className="text-slate-400"/> View Full Profile</span>
                   <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors text-sm font-bold text-slate-600 group">
                   <span className="flex items-center gap-3"><Settings size={16} className="text-slate-400"/> Account Settings</span>
                   <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors text-sm font-bold text-slate-600 group">
                   <span className="flex items-center gap-3"><ShieldCheck size={16} className="text-slate-400"/> Privacy & Password</span>
                   <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
             </div>

             {/* Action Buttons */}
             <div className="space-y-3 pt-2">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl shadow-lg shadow-slate-100">
                   Update Profile Details
                </Button>
                <Button 
                  onClick={logout}
                  variant="outline" 
                  className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-bold h-12 rounded-xl gap-2"
                >
                   <LogOut size={18} /> Sign Out of AR Hub
                </Button>
             </div>

             {/* Footer Link */}
             <div className="pt-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors">
                   Manage other accounts <ExternalLink size={10} />
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
