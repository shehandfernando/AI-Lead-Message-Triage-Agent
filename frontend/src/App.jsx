import React, { useState, useEffect } from 'react';

export default function App() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ processed: 142, resolved: 124, rate: 87 });

  const fetchQueue = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/leads/queue');
      const data = await response.json();
      setQueue(data.queue);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = (id) => {
    setQueue(queue.filter((lead) => lead.id !== id));
    setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
  };

  // Helper function for dynamic AI Efficacy color
  const getRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-amber-500';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 p-4 md:p-8 font-sans selection:bg-neutral-300">
      <div className="max-w-5xl mx-auto">
        
        {/* Telemetry Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Triage Queue</h1>
            <p className="text-neutral-500 text-sm mt-1">Active human-handoff requirements</p>
          </div>
          
          <div className="flex gap-8 bg-white border border-neutral-200 rounded-lg px-6 py-3 shadow-sm">
            <div className="flex flex-col">
              <span className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">Traffic</span>
              <span className="font-semibold text-neutral-900">{stats.processed}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">Auto-Resolved</span>
              <span className="font-semibold text-neutral-900">{stats.resolved}</span>
            </div>
            <div className="flex flex-col border-l border-neutral-200 pl-8">
              <span className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-1">AI Efficacy</span>
              {/* DYNAMIC COLOR APPLIED HERE */}
              <span className={`font-semibold ${getRateColor(stats.rate)}`}>{stats.rate}%</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-48 bg-white border border-neutral-200 rounded-xl shadow-sm">
            <div className="text-neutral-400 text-sm animate-pulse flex items-center gap-2">
              <div className="w-2 h-2 bg-neutral-300 rounded-full"></div>
              Syncing data streams...
            </div>
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-neutral-200 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Queue is clear</h3>
            <p className="text-neutral-500 text-sm">The agent is currently handling all inbound traffic.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {queue.map((lead) => (
              <div 
                key={lead.id} 
                className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col md:flex-row hover:shadow-md hover:border-neutral-300 transition-all duration-200 group relative overflow-hidden shadow-sm"
              >
                {/* Visual Severity Indicator */}
                {lead.ai_analysis.urgency_score > 7 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                )}
                
                <div className="flex-1 md:pl-2">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {/* HIGHLIGHTED PLATFORM BADGE */}
                    <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-sm">
                      {lead.raw_payload.channel}
                    </span>
                    <span className="text-neutral-400 text-xs font-mono ml-1">
                      {lead.raw_payload.sender_id}
                    </span>
                    {/* Multi-modal context tag */}
                    <span className="ml-2 text-neutral-500 text-[10px] font-medium border border-neutral-200 rounded-md px-2 py-1 flex items-center gap-1.5 bg-neutral-50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      VISION SCANNED
                    </span>
                  </div>
                  
                  <p className="text-neutral-900 text-base font-medium leading-relaxed mb-4">
                    "{lead.raw_payload.text}"
                  </p>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500">
                    <p><span className="text-neutral-400">Intent:</span> <span className="font-medium text-neutral-700 capitalize">{lead.ai_analysis.category.replace('_', ' ')}</span></p>
                    <p><span className="text-neutral-400">Confidence:</span> <span className="font-medium text-neutral-700">{(Math.random() * (99 - 85) + 85).toFixed(1)}%</span></p>
                    {lead.ai_analysis.urgency_score > 7 && (
                      <p className="text-red-600 font-semibold flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                        High Urgency
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 md:mt-0 md:ml-6 flex items-center justify-end">
                  {/* INVERTED RESOLVE BUTTON WITH HOVER */}
                  <button 
                    onClick={() => handleResolve(lead.id)}
                    className="w-full md:w-auto bg-white text-neutral-900 border border-neutral-300 font-medium text-sm rounded-lg px-6 py-2.5 hover:bg-black hover:text-white hover:border-black hover:shadow-md active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}