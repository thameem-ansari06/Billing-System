import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle, Loader2, Download, Lock, RefreshCw } from 'lucide-react';
import { API, BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [phase, setPhase] = useState(1);
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isSelective, setIsSelective] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    inventory: false,
    customers: false,
    invoices: false,
    quotes: false,
    payments: false,
    activity_logs: false,
    delivery_logistics: false
  });
  const [backups, setBackups] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const response = await fetch(`${API}/admin/backups`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  useEffect(() => {
    let timer;
    if (phase === 3 && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [phase, countdown]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const endpoint = isSelective ? '/admin/selective-reset' : '/admin/factory-reset';
      const body = isSelective 
        ? { admin_password: password, ...resetOptions }
        : { admin_password: password };

      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Reset failed');
      }

      const data = await response.json();
      
      if (!isSelective) {
        // Auto-download backup for full reset
        const link = document.createElement('a');
        link.href = `${BASE_URL}${data.download_url}`;
        link.download = data.download_url.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Full system reset successfully! Backup downloaded.');
      } else {
        toast.success(data.message || 'Selective reset completed.');
      }
      
      // Refresh backups list
      fetchBackups();
      
      // Hard refresh and redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);

    } catch (err) {
      toast.error(err.message);
      setIsResetting(false);
    }
  };

  const resetModalState = () => {
    setShowModal(false);
    setPhase(1);
    setConfirmText('');
    setCountdown(5);
    setPassword('');
    setIsSelective(false);
    setResetOptions({
      inventory: false,
      customers: false,
      invoices: false,
      quotes: false,
      payments: false,
      activity_logs: false,
      delivery_logistics: false
    });
  };

  if (user?.role !== 'admin' && user?.role !== 'ceo') {
    return <div className="p-8 text-center text-slate-500 font-medium">Access Denied: Administrative privileges required.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500">Configure global application parameters and maintenance tools.</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <ShieldAlert className="text-red-500" />
          <h2 className="text-xl font-bold text-slate-900">Danger Zone</h2>
        </div>
        
        <div className="p-8 bg-red-50/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-red-700">Factory Reset</h3>
            <p className="text-sm text-red-600/80 max-w-md">
              Permanently erase all business data. A full system backup will be generated automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => { setIsSelective(true); setShowModal(true); }}
              className="px-6 py-4 bg-white border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw size={18} />
              Selective Reset
            </button>
            <button 
              onClick={() => { setIsSelective(false); setShowModal(true); }}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 size={18} />
              Full Factory Reset
            </button>
          </div>
        </div>
      </div>

      {/* Backup History Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className={`text-blue-500 ${isLoadingBackups ? 'animate-spin' : ''}`} size={20} />
            <h2 className="text-xl font-bold text-slate-900">System Backup History</h2>
          </div>
          <button 
            onClick={fetchBackups}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-blue-600"
            title="Refresh List"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="p-2">
          {backups.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                <Download className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 font-medium">No system backups found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                    <th className="px-6 py-3">Backup File</th>
                    <th className="px-6 py-3">Size</th>
                    <th className="px-6 py-3">Generated At</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup, idx) => (
                    <tr 
                      key={backup.filename}
                      className={`group hover:bg-slate-50 transition-all duration-200 ${idx === 0 ? 'bg-blue-50/50' : ''} rounded-2xl`}
                    >
                      <td className="px-6 py-4 rounded-l-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            <RefreshCw size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{backup.filename}</p>
                            {idx === 0 && <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Latest Backup</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-500">{backup.size}</td>
                      <td className="px-6 py-4 text-sm text-slate-400 font-medium">{backup.created_at}</td>
                      <td className="px-6 py-4 text-right rounded-r-2xl">
                        <a 
                          href={`${BASE_URL}${backup.download_url}`}
                          download={backup.filename}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95"
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Triple-Lock Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
            
            {/* Header */}
            <div className={`p-6 flex items-center gap-4 ${phase < 4 ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                {isResetting ? <Loader2 className="animate-spin" /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <h2 className="text-xl font-black">{isSelective ? 'Selective Data Wipe' : 'Confirm Factory Reset'}</h2>
                <p className="text-sm opacity-80">Phase {phase} of {isSelective ? '3' : '4'}</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Phase 1: Checklist (Selective) OR Warning (Full) */}
              {phase === 1 && isSelective ? (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-amber-800 text-sm font-medium leading-relaxed">
                      Select the categories you want to reset. Truncated data starts ID count from 1.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'inventory', label: 'Inventory (Products)', color: 'bg-blue-500' },
                      { id: 'customers', label: 'Customers & Contacts', color: 'bg-orange-500' },
                      { id: 'invoices', label: 'Invoices & Items', color: 'bg-emerald-500' },
                      { id: 'quotes', label: 'Quotes & Items', color: 'bg-purple-500' },
                      { id: 'payments', label: 'Payments & Advances', color: 'bg-cyan-500' },
                      { id: 'delivery_logistics', label: 'Logistics (Tasks/Batches)', color: 'bg-indigo-500' },
                      { id: 'activity_logs', label: 'Activity Logs', color: 'bg-slate-500' },
                    ].map((opt) => (
                      <label key={opt.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${resetOptions[opt.id] ? 'border-red-500 bg-red-50/30' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                          <span className="font-bold text-slate-700">{opt.label}</span>
                        </div>
                        <input 
                          type="checkbox"
                          className="w-5 h-5 rounded-md border-slate-300 text-red-600 focus:ring-red-500"
                          checked={resetOptions[opt.id]}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setResetOptions(prev => {
                              const next = { ...prev, [opt.id]: val };
                              // Dependency logic: Customers reset MUST include Invoices and Payments
                              if (opt.id === 'customers' && val) {
                                next.invoices = true;
                                next.payments = true;
                                next.delivery_logistics = true;
                              }
                              return next;
                            });
                          }}
                        />
                      </label>
                    ))}
                  </div>

                  {resetOptions.customers && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Warning: Selecting Customers automatically includes Invoices and Payments.
                    </div>
                  )}

                  <button 
                    disabled={!Object.values(resetOptions).some(v => v)}
                    onClick={() => setPhase(4)} // Jump to security
                    className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                  >
                    Proceed to Verification
                  </button>
                  <button 
                    onClick={resetModalState}
                    className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : phase === 1 && !isSelective && (
                <div className="space-y-6">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                    <p className="text-red-800 text-sm font-medium leading-relaxed">
                      <strong>WARNING:</strong> This process will PERMANENTLY DELETE all business records and purge all non-admin user accounts. This action CANNOT be undone.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Affected Data:</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-semibold text-slate-700">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        All Orders
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        All Invoices
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Customers
                      </li>
                      <li className="flex items-center gap-2 text-red-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        Non-Admin Staff
                      </li>
                    </ul>
                  </div>

                  <button 
                    onClick={() => setPhase(2)}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-[0.98]"
                  >
                    I understand the risks
                  </button>
                  <button 
                    onClick={resetModalState}
                    className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Phase 2: Confirmation Phrase */}
              {phase === 2 && (
                <div className="space-y-6">
                  <p className="text-slate-600 text-sm">
                    To confirm you are intentional about this destructive action, please type the phrase below:
                  </p>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="font-mono font-black text-red-600 tracking-wider select-none">
                      PERMANENTLY ERASE ALL DATA
                    </span>
                  </div>
                  <input 
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full p-4 border-2 border-slate-200 rounded-2xl focus:border-red-500 outline-none transition-all font-bold text-center uppercase"
                    placeholder="Type confirmation here..."
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setPhase(1)}
                      className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      Back
                    </button>
                    <button 
                      disabled={confirmText.toUpperCase() !== "PERMANENTLY ERASE ALL DATA"}
                      onClick={() => setPhase(3)}
                      className="flex-[2] py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-red-200"
                    >
                      Confirm Phrase
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 3: Countdown */}
              {phase === 3 && (
                <div className="text-center space-y-8 py-6">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-100"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={377}
                        strokeDashoffset={377 - (377 * countdown) / 5}
                        className="text-red-600 transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-4xl font-black text-slate-900">{countdown}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900">Final Countdown</h3>
                    <p className="text-slate-500 text-sm px-8">This is your last chance to abort the process. No data has been modified yet.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={resetModalState}
                      className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      Abort
                    </button>
                    <button 
                      disabled={countdown > 0}
                      onClick={() => setPhase(4)}
                      className="flex-[2] py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-300 text-white font-bold rounded-2xl transition-all"
                    >
                      {countdown > 0 ? 'Wait...' : 'Proceed to Security'}
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 4: Password Re-auth */}
              {phase === 4 && (
                <div className="space-y-6">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                      <Lock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Security Check</p>
                      <p className="text-slate-500 text-sm">Please verify your identity to proceed.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Admin Password</label>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-4 border-2 border-slate-200 rounded-2xl focus:border-slate-900 outline-none transition-all shadow-sm"
                      placeholder="••••••••••••"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={resetModalState}
                      className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={!password || isResetting}
                      onClick={handleReset}
                      className="flex-[2] py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Executing...
                        </>
                      ) : (
                        'Execute Factory Reset'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Progress Overlay */}
            {isResetting && (
              <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-300">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center animate-pulse shadow-2xl">
                  <RefreshCw className="animate-spin" size={48} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-black text-slate-900 leading-tight">Creating Archive &<br/>Wiping Data...</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Please do not close your browser or refresh the page. This process may take up to 30 seconds.</p>
                </div>
                <div className="w-56 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900 w-1/3 animate-[progress_1.5s_ease-in-out_infinite]" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Animation for Overlay */}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
