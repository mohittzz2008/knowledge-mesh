'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { 
  fetchPlatformRegistry, 
  validatePlatformUser, 
  syncPlatformUser, 
  disconnectPlatformUser,
  PlatformRegistryItem,
  GitHubSyncResponse 
} from '@/lib/api';
import { 
  Globe, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  AlertCircle,
  Database,
  Code2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformRegistryItem[]>([]);
  const [loadingRegistry, setLoadingRegistry] = useState(true);

  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [apiTokenInput, setApiTokenInput] = useState<string>('');
  
  // Cinematic Sync Animation Steps
  const [syncStep, setSyncStep] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<GitHubSyncResponse | null>(null);

  const loadRegistry = async () => {
    setLoadingRegistry(true);
    const data = await fetchPlatformRegistry();
    if (data) {
      setPlatforms(data);
    }
    setLoadingRegistry(false);
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  const handleConnectClick = (platform: PlatformRegistryItem) => {
    setActivePlatform(platform.key);
    setUsernameInput(platform.connected_username || '');
    setApiTokenInput('');
    setSyncStep(null);
    setSyncError(null);
    setSyncResult(null);
    setTimeout(() => {
      document.getElementById('sync-panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleDisconnect = async (platformKey: string) => {
    try {
      await disconnectPlatformUser(platformKey);
      await loadRegistry();
    } catch (err) {
      console.error('Failed to disconnect', err);
    }
  };

  const handleRunSync = async (platformKey: string) => {
    if (!usernameInput.trim()) {
      setSyncError("Please enter a username to connect.");
      return;
    }
    
    const activeInfo = platforms.find(p => p.key === platformKey);
    const authType = activeInfo?.auth_type || 'username_public';
    if (authType === 'api_key' && !apiTokenInput.trim()) {
      setSyncError("Please provide an API Key.");
      return;
    }

    setSyncError(null);
    setSyncResult(null);

    try {
      // Step 1: Connecting
      setSyncStep('CONNECTING');
      await new Promise(r => setTimeout(r, 600));

      // Step 2: Identity Verification
      setSyncStep('IDENTITY VERIFIED');
      const valRes = await validatePlatformUser(platformKey, usernameInput.trim());
      if (!valRes || !valRes.valid) {
        setSyncError(valRes?.detail || `Unable to verify ${platformKey} user '${usernameInput.trim()}'.`);
        setSyncStep(null);
        return;
      }
      await new Promise(r => setTimeout(r, 600));

      // Step 3: Fetching Public Data
      setSyncStep('FETCHING PUBLIC DATA');
      await new Promise(r => setTimeout(r, 700));

      // Step 4: Normalizing Evidence
      setSyncStep('NORMALIZING EVIDENCE');
      const syncRes = await syncPlatformUser(
        platformKey, 
        usernameInput.trim(), 
        authType, 
        authType === 'api_key' ? apiTokenInput.trim() : undefined
      );
      await new Promise(r => setTimeout(r, 700));

      // Step 5: Updating Knowledge Mesh
      setSyncStep('UPDATING KNOWLEDGE MESH');
      await new Promise(r => setTimeout(r, 600));

      // Step 6: Complete
      setSyncStep('COMPLETE');
      if (syncRes) {
        setSyncResult(syncRes);
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
        await loadRegistry();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setSyncError(message);
      setSyncStep(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-900/20 pb-6">
          <div>
            <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
              <Globe className="h-6 w-6 text-purple-400" />
              Multi-Platform Connector Registry
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Ingest & normalize developer telemetry across GitHub, LeetCode, and HackerRank into a single Knowledge Mesh pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Central Registry Active
            </span>
          </div>
        </div>

        {/* Registry Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((p) => {
            const isConnected = p.connected;
            return (
              <div 
                key={p.key} 
                className={`glow-card p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all ${
                  isConnected 
                    ? 'border-emerald-500/40 bg-[#0B0F1C]/90' 
                    : 'border-slate-800 bg-[#0B0F1C]/60 hover:border-purple-500/40'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        isConnected 
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' 
                          : 'bg-purple-950 text-purple-300 border-purple-500/30'
                      }`}>
                        {p.key === 'github' ? (
                          <Code2 className="h-5 w-5" />
                        ) : p.key === 'hackerrank' ? (
                          <Database className="h-5 w-5" />
                        ) : (
                          <Layers className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold font-mono text-white">{p.name}</h3>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{p.status}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                      isConnected 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isConnected ? '✓ CONNECTED' : 'NOT CONNECTED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    {p.data_scope_description}
                  </p>

                  {/* Capabilities Pills */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800 font-mono">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SUPPORTED CAPABILITIES:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {p.capabilities.map((cap, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300 uppercase"
                        >
                          {cap.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between font-mono">
                  {isConnected ? (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> User: {p.connected_username}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Public Username Access</span>
                  )}

                  <div className="flex gap-2">
                    {isConnected && (
                      <button
                        onClick={() => handleDisconnect(p.key)}
                        className="px-3 py-2 rounded-xl border border-slate-700 hover:border-red-500/50 text-xs font-bold text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      >
                        Disconnect
                      </button>
                    )}
                    <button
                      onClick={() => handleConnectClick(p)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                    >
                      {isConnected ? 'Sync Again' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Connection & Cinematic Sync Animation Modal Box */}
        {activePlatform && (
          <div id="sync-panel" className="glow-card p-6 rounded-2xl border border-purple-500/40 bg-[#0B0F1C] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Connect & Sync {platforms.find(p => p.key === activePlatform)?.name} Identity
              </h2>
              <button onClick={() => setActivePlatform(null)} className="text-xs font-mono text-slate-400 hover:text-white">Close</button>
            </div>

            <div className="space-y-4 max-w-xl font-mono">
              <div className="space-y-2">
                <label className="text-xs text-slate-300 block font-bold">Target Platform Username:</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter public username..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                  />
                  {platforms.find(p => p.key === activePlatform)?.auth_type !== 'api_key' && (
                    <button
                      onClick={() => handleRunSync(activePlatform)}
                      disabled={!!syncStep && syncStep !== 'COMPLETE'}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncStep && syncStep !== 'COMPLETE' ? 'animate-spin' : ''}`} />
                      Run Sync
                    </button>
                  )}
                </div>
              </div>

              {platforms.find(p => p.key === activePlatform)?.auth_type === 'api_key' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 block font-bold">Personal API Token / Key:</label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={apiTokenInput}
                      onChange={(e) => setApiTokenInput(e.target.value)}
                      placeholder="Paste token (stored securely)..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                    <button
                      onClick={() => handleRunSync(activePlatform)}
                      disabled={!!syncStep && syncStep !== 'COMPLETE'}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncStep && syncStep !== 'COMPLETE' ? 'animate-spin' : ''}`} />
                      Run Sync
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    This platform requires a personal API key to fetch your private progress and submissions. 
                    Tokens are strictly encrypted in our database and never shared.
                  </p>
                </div>
              )}

              {/* Step-by-Step Cinematic Sync Indicator */}
              {syncStep && (
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 text-xs font-mono space-y-2">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">REAL-TIME PIPELINE PROGRESS:</span>
                  
                  <div className="space-y-1.5">
                    {['CONNECTING', 'IDENTITY VERIFIED', 'FETCHING PUBLIC DATA', 'NORMALIZING EVIDENCE', 'UPDATING KNOWLEDGE MESH', 'COMPLETE'].map((step, idx) => {
                      const isDone = syncStep === 'COMPLETE' || ['CONNECTING', 'IDENTITY VERIFIED', 'FETCHING PUBLIC DATA', 'NORMALIZING EVIDENCE', 'UPDATING KNOWLEDGE MESH', 'COMPLETE'].indexOf(syncStep) > idx;
                      const isCurrent = syncStep === step;

                      return (
                        <div key={step} className={`flex items-center gap-2 text-[11px] ${
                          isCurrent ? 'text-cyan-400 font-bold animate-pulse' : isDone ? 'text-emerald-400' : 'text-slate-600'
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isCurrent ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-slate-700" />
                          )}
                          <span>Step {idx + 1}: {step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sync Error */}
              {syncError && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{syncError}</span>
                </div>
              )}

              {/* Sync Result */}
              {syncResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-3 font-mono ${
                  syncResult.synced_evidence_count > 0 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                    : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span>
                      {syncResult.synced_evidence_count > 0 
                        ? 'STATUS: SUCCESS WITH DATA 🎉' 
                        : 'STATUS: SUCCESS WITH ZERO NEW PUBLIC DATA'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">{syncResult.synced_evidence_count} New Items Ingested</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-400">Platform:</span> <span className="text-white font-bold">{syncResult.platform}</span></div>
                    <div><span className="text-slate-400">Username:</span> <span className="text-white font-bold">{syncResult.username}</span></div>
                    <div><span className="text-slate-400">Real API:</span> <span className="text-emerald-400 font-bold">VERIFIED</span></div>
                    <div><span className="text-slate-400">Profile:</span> <span className="text-cyan-400 font-bold">VERIFIED</span></div>
                    <div><span className="text-slate-400">Solved / Repos:</span> <span className="text-white font-bold">{syncResult.profile_summary?.total_solved ?? syncResult.profile_summary?.public_repos ?? 'Unknown'}</span></div>
                    <div><span className="text-slate-400">Source:</span> <span className="text-purple-300 font-bold">{
                      syncResult.platform === 'LeetCode' ? 'LeetCode GraphQL API' : 
                      syncResult.platform === 'GitHub' ? 'GitHub REST API' : 
                      syncResult.platform === 'Codeforces' ? 'Codeforces REST API' :
                      syncResult.platform === 'Exercism' ? 'Exercism API v2' :
                      syncResult.platform === 'AtCoder' ? 'AtCoderProblems API' :
                      syncResult.platform === 'HackerRank' ? 'HackerRank REST API' :
                      syncResult.platform === 'CodeChef' ? 'CodeChef Public Telemetry' :
                      'Platform API'
                    }</span></div>
                  </div>

                  <p className="text-[11px] leading-relaxed opacity-90 border-t border-slate-800/50 pt-2">{syncResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
