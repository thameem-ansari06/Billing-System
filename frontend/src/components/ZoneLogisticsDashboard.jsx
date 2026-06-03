import React, { useState, useEffect } from 'react';
import { 
  MapPin, Users, Package, RefreshCw, Shield, 
  Sparkles, TrendingUp, CheckCircle, Clock, ArrowRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { API } from '../config';

export default function ZoneLogisticsDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Independent session window state reference for AI insights
  const [aiAnalysis, setAiAnalysis] = useState(() => {
    return sessionStorage.getItem('ai_logistics_analysis') || '';
  });

  // 1. State Definitions (unified state object for dynamic counters)
  const [metrics, setMetrics] = useState({
    unassigned_count: 0,
    online_agents: 0,
    zone_breakdown: { ZONE_1: 0, ZONE_2: 0, ZONE_3: 0 },
    total_parcels: 0,
    
    // Legacy support to ensure absolute compatibility
    unassignedCount: 0,
    onlineAgents: 0,
    zoneBreakdown: { ZONE_1: 0, ZONE_2: 0, ZONE_3: 0 }
  });
  
  // State for tracking each target zone's metadata fields
  const [zones, setZones] = useState({
    ZONE_1: {
      code: 'ZONE_1',
      name: 'North Tamil Nadu Cluster',
      pendingCount: 0,
      assignedAgent: null,
      color: 'indigo',
      glow: 'shadow-indigo-500/10 border-indigo-200/60',
      headerBg: 'from-indigo-600 to-violet-700',
      textLight: 'text-indigo-600',
      bgLight: 'bg-indigo-50',
      districts: ['Chennai', 'Kanchipuram', 'Tiruvallur', 'Vellore', 'Ranipet', 'Tirupathur', 'Tiruvannamalai', 'Cuddalore', 'Villupuram', 'Kallakurichi', 'Chengalpattu']
    },
    ZONE_2: {
      code: 'ZONE_2',
      name: 'West Tamil Nadu Cluster',
      pendingCount: 0,
      assignedAgent: null,
      color: 'cyan',
      glow: 'shadow-cyan-500/10 border-cyan-200/60',
      headerBg: 'from-cyan-600 to-blue-700',
      textLight: 'text-cyan-600',
      bgLight: 'bg-cyan-50',
      districts: ['Coimbatore', 'Erode', 'Tiruppur', 'Salem', 'Namakkal', 'Dharmapuri', 'Krishnagiri', 'The Nilgiris', 'Karur']
    },
    ZONE_3: {
      code: 'ZONE_3',
      name: 'South Tamil Nadu Cluster',
      pendingCount: 0,
      assignedAgent: null,
      color: 'emerald',
      glow: 'shadow-emerald-500/10 border-emerald-200/60',
      headerBg: 'from-emerald-600 to-teal-700',
      textLight: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      districts: ['Madurai', 'Theni', 'Dindigul', 'Virudhunagar', 'Sivagangai', 'Ramanathapuram', 'Tirunelveli', 'Tenkasi', 'Thoothukudi', 'Kanniyakumari', 'Trichy', 'Pudukkottai', 'Ariyalur', 'Perambalur', 'Thanjavur', 'Nagapattinam', 'Tiruvarur', 'Mayiladuthurai']
    }
  });

  // 2. Dynamic API Hydration Functions
  const syncLiveDashboardCounters = async (showToast = false) => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/logistics/metrics`, {
        headers: { 'Authorization': `` + `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch logistics metrics from PostgreSQL");
      const data = await res.json();
      
      // 🚨 UNIVERSAL NORMALIZER 🚨
      const rawBreakdown = data.zone_breakdown || data.zoneBreakdown || {};
      const safeBreakdown = { ZONE_1: 0, ZONE_2: 0, ZONE_3: 0 };
      
      Object.entries(rawBreakdown).forEach(([key, value]) => {
        const normKey = String(key).toUpperCase();
        if (normKey === '1' || normKey.includes('ZONE_1') || normKey.includes('ZONE 1')) safeBreakdown.ZONE_1 = value;
        if (normKey === '2' || normKey.includes('ZONE_2') || normKey.includes('ZONE 2')) safeBreakdown.ZONE_2 = value;
        if (normKey === '3' || normKey.includes('ZONE_3') || normKey.includes('ZONE 3')) safeBreakdown.ZONE_3 = value;
      });

      // Update dynamic counters state parameters
      setMetrics({
        unassigned_count: data.unassigned_count,
        online_agents: data.online_agents,
        zone_breakdown: safeBreakdown,
        total_parcels: data.total_parcels,
        unassignedCount: data.unassigned_count !== undefined ? data.unassigned_count : (data.unassignedCount || 0),
        onlineAgents: data.online_agents !== undefined ? data.online_agents : (data.onlineAgents || 0),
        zoneBreakdown: safeBreakdown
      });

      // Synchronize the local zone states with Postgres values
      setZones(prev => {
        const updated = { ...prev };
        updated.ZONE_1.pendingCount = safeBreakdown.ZONE_1;
        updated.ZONE_2.pendingCount = safeBreakdown.ZONE_2;
        updated.ZONE_3.pendingCount = safeBreakdown.ZONE_3;
        return updated;
      });

      if (showToast) toast.success("Logistics PostgreSQL metrics synchronized successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Database connection failed. Refusing to load stale state.");
    } finally {
      setIsLoading(false);
    }
  };

  // Run automatically on component mount
  useEffect(() => {
    syncLiveDashboardCounters();
  }, [user?.token]);

  // Trigger natural language logistics inquiry via admin chatbot endpoint
  const queryAiLogisticsAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const prompt = `Analyze the current delivery tasks queue. Provide a professional, concise summary of the geographic distribution of orders in 'Pending_Pooling' state across Zone 1 (North), Zone 2 (West), and Zone 3 (South). Suggest which zone requires urgent bulk driver assignment.`;
      
      const res = await fetch(`${API}/admin/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ message: prompt })
      });

      if (!res.ok) throw new Error("AI query failed");
      const data = await res.json();
      const responseText = data.response || "No response received from the database analyst chatbot.";
      setAiAnalysis(responseText);
      sessionStorage.setItem('ai_logistics_analysis', responseText);
      toast.success("AI logistics insights generated!");
    } catch (err) {
      console.error(err);
      const errorText = "Unable to retrieve AI analysis. Make sure the Nvidia NIM service is fully configured.";
      setAiAnalysis(errorText);
      sessionStorage.setItem('ai_logistics_analysis', errorText);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Execute bulk auto-assignment dispatch
  const handleBulkDispatch = async (zoneCode) => {
    if (!user?.token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/logistics/trigger-agent-auto-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ zone_code: zoneCode })
      });

      const data = await res.json();

      if (res.status === 404) {
        toast.error(data.detail || `No available agents configured for ${zoneCode}`);
        return;
      }
      
      if (!res.ok) {
        throw new Error(data.detail || "Dispatch operation failed.");
      }

      const agentName = data.agent?.full_name || data.agent?.username || "Assigned Driver";
      const assignedCount = data.assigned_count;

      setZones(prev => ({
        ...prev,
        [zoneCode]: {
          ...prev[zoneCode],
          pendingCount: 0,
          assignedAgent: agentName
        }
      }));

      toast.custom(() => (
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-lg flex flex-col gap-2 max-w-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <CheckCircle size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Bulk Dispatch Successful!</p>
              <p className="text-[10px] text-slate-400">Zone Code: {zoneCode}</p>
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1 border border-slate-100">
            <p className="text-slate-700"><span className="text-emerald-600 font-bold">Driver:</span> {agentName}</p>
            <p className="text-slate-700"><span className="text-indigo-600 font-bold">Parcels Routed:</span> {assignedCount} Orders</p>
          </div>
        </div>
      ), { duration: 5000 });

      // Refresh live records
      await syncLiveDashboardCounters();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Bulk dispatch action failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 min-h-screen font-sans text-slate-800 bg-slate-50/50 p-2">
      
      {/* ── TOP NAV / BANNER HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-600">Logistics Hub</span>
            </div>
            {isLoading && (
              <div className="flex items-center gap-1 text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider animate-pulse">
                <RefreshCw size={8} className="animate-spin text-indigo-600" />
                Syncing PostgreSQL...
              </div>
            )}
          </div>
          <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">
            Geographic Clustering & Route Optimization
          </h1>
          <p className="text-[11px] text-slate-500 font-medium max-w-xl mt-1 leading-relaxed">
            Organize shipment deliveries dynamically using metadata mapped Tamil Nadu districts. Dispatch clustered order queues to least-loaded delivery executives in a single atomic transaction.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={queryAiLogisticsAnalysis}
            disabled={isAiLoading}
            className="h-9 px-3 bg-slate-50 hover:bg-slate-100 text-blue-600 hover:text-blue-700 text-xs font-extrabold uppercase tracking-wider rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Sparkles size={12} className={isAiLoading ? "animate-pulse text-indigo-600" : ""} />
            {isAiLoading ? "Analyzing..." : "Ask AI Insights"}
          </button>
          
          <button
            onClick={() => syncLiveDashboardCounters(true)}
            disabled={isLoading}
            className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            Sync Metrics
          </button>
        </div>
      </div>

      {/* ── AI COGNITIVE LOGISTICS ANALYSIS PANEL ── */}
      {(isAiLoading || aiAnalysis) ? (
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 relative overflow-hidden shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="absolute -left-12 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={14} className="text-indigo-600 animate-pulse" />
            <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-600">PostgreSQL AI Analyst Insights</h3>
          </div>
          
          {isAiLoading ? (
            <div className="flex items-center gap-2 py-3 text-slate-500 text-xs font-semibold">
              <RefreshCw size={14} className="animate-spin text-indigo-600" />
              <span>NVIDIA NIM executing predictive analysis across Tamil Nadu district zone registry...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-700 text-xs leading-relaxed font-semibold bg-white p-3 rounded-lg border border-indigo-100/80 shadow-inner" style={{ whiteSpace: 'pre-line' }}>
                {aiAnalysis}
              </p>
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                <span>Model Pipeline: Llama-3.1-8b-instruct</span>
                <span>Context Schema Sync: Synced</span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── 3 UPPER COUNTER CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Unassigned Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-blue-500/30 transition-all duration-200">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Package size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Unassigned Orders</p>
            <h3 className="text-lg font-black text-slate-800 leading-none mt-1">{metrics.unassigned_count || metrics.unassignedCount || 0} Orders</h3>
          </div>
        </div>

        {/* Card 2: Online Operators */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-indigo-500/30 transition-all duration-200">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Online Operators</p>
            <h3 className="text-lg font-black text-slate-800 leading-none mt-1">{metrics.online_agents || metrics.onlineAgents || 0} Agents</h3>
          </div>
        </div>

        {/* Card 3: Pending Parcels */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 hover:border-emerald-500/30 transition-all duration-200">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Pending Parcels</p>
            <h3 className="text-lg font-black text-slate-800 leading-none mt-1">{metrics.total_parcels || metrics.unassigned_count || metrics.unassignedCount || 0} Parcels</h3>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN ZONE CLUSTERING METRIC GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.values(zones).map((zone) => {
          const dynamicPendingCount = 
            (zone.code === 'ZONE_1' ? (metrics.zoneBreakdown?.ZONE_1 ?? metrics.zone_breakdown?.ZONE_1 ?? 0) :
             zone.code === 'ZONE_2' ? (metrics.zoneBreakdown?.ZONE_2 ?? metrics.zone_breakdown?.ZONE_2 ?? 0) :
             zone.code === 'ZONE_3' ? (metrics.zoneBreakdown?.ZONE_3 ?? metrics.zone_breakdown?.ZONE_3 ?? 0) : 0);
          const hasPending = dynamicPendingCount > 0;
          
          return (
            <div 
              key={zone.code}
              className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col"
            >
              {/* Header Zone Card banner */}
              <div className={`p-4 bg-gradient-to-r ${zone.headerBg} relative overflow-hidden`}>
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                  <MapPin size={80} />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">{zone.code}</h3>
                    <p className="text-[11px] text-white/90 font-bold mt-0.5">{zone.name}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/10">
                    Active
                  </span>
                </div>
              </div>

              {/* Volume metrics panel */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Visual count */}
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center shadow-inner">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider leading-none">Unassigned Volume</p>
                    <p className="text-base font-black text-slate-800 mt-1">
                      {zone.code === 'ZONE_1' && <>{(metrics.zoneBreakdown?.ZONE_1 ?? metrics.zone_breakdown?.ZONE_1 ?? 0)} Parcels</>}
                      {zone.code === 'ZONE_2' && <>{(metrics.zoneBreakdown?.ZONE_2 ?? metrics.zone_breakdown?.ZONE_2 ?? 0)} Parcels</>}
                      {zone.code === 'ZONE_3' && <>{(metrics.zoneBreakdown?.ZONE_3 ?? metrics.zone_breakdown?.ZONE_3 ?? 0)} Parcels</>}
                    </p>
                  </div>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${zone.bgLight} ${zone.textLight}`}>
                    <Package size={14} className={hasPending ? "animate-pulse" : ""} />
                  </div>
                </div>

                {/* Districts mapped section */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Mapped districts</label>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {zone.districts.map((d) => (
                      <span 
                        key={d} 
                        className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded text-[9px] font-bold text-slate-600 transition-colors"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delivery agent assignment tracker */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Assigned Dispatch Target</label>
                  {zone.assignedAgent ? (
                    <div className="bg-emerald-50 border border-emerald-200/60 p-2.5 rounded-lg flex items-center gap-1.5">
                      <CheckCircle size={12} className="text-emerald-600" />
                      <p className="text-xs text-emerald-700 font-bold leading-none">
                        Dispatched to: <span className="text-slate-800">{zone.assignedAgent}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-center justify-between text-xs text-slate-500 font-semibold shadow-inner">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock size={11} className="text-slate-400" />
                        Awaiting dispatch
                      </span>
                      <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider">Queue</span>
                    </div>
                  )}
                </div>

                {/* Dispatch Trigger Button */}
                <button
                  onClick={() => handleBulkDispatch(zone.code)}
                  disabled={!hasPending || isLoading}
                  className={`w-full h-9 uppercase font-extrabold tracking-wider text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    hasPending 
                      ? `bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:translate-y-[-0.5px]` 
                      : "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
                  }`}
                >
                  <span>Auto-Assign</span>
                  <ArrowRight size={12} />
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {/* ── CONTEXTUAL INTEGRATION WARNING ── */}
      <div className="bg-slate-100 border border-slate-200/60 rounded-xl p-3 flex items-start gap-2.5 shadow-inner">
        <Shield size={14} className="text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-500 leading-normal font-semibold">
          <span className="text-indigo-600 font-extrabold uppercase tracking-wider">Transaction Safeguard:</span> This system routes tasks in standard bulk sequences. In the event of network interruption or agent configuration mismatch, the database issues an atomic rollback automatically. Ensure at least one available delivery agent is configured with matching assigned zone code parameters inside the <span className="text-slate-700 font-bold underline">Staff Management</span> dashboard.
        </p>
      </div>

    </div>
  );
}
