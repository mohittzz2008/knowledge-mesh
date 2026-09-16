'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/ui/Navbar';
import { 
  analyzeGitHubFile, 
  fetchCodeArtifacts, 
  fetchUserProfile,
  fetchEvidenceList,
  CodeArtifactResponse,
} from '@/lib/api';
import { 
  FileCode, 
  Sparkles, 
  GitBranch, 
  Code2, 
  Maximize2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Cpu,
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  Lock
} from 'lucide-react';

// Lazy-load Monaco Editor for expandable full-screen code viewing
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#080B14] text-xs font-mono text-slate-500">
      Loading Monaco Code Engine...
    </div>
  ),
});

export default function CodeIntelligencePage() {
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [path, setPath] = useState('');
  
  const [userRepos, setUserRepos] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [artifactList, setArtifactList] = useState<CodeArtifactResponse[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<CodeArtifactResponse | null>(null);
  
  // Monaco Modal State
  const [isExpanded, setIsExpanded] = useState(false);

  // Load connected GitHub username and user's synced repos dynamically
  useEffect(() => {
    async function loadGitHubConnection() {
      const profile = await fetchUserProfile();
      const ghConn = profile?.connected_platforms?.find(p => p.platform === 'GitHub' && p.connected);
      const username = ghConn?.username || null;
      
      setConnectedUsername(username);

      if (username) {
        setOwner(username);
        // Fetch user's synced repos from evidence list
        const evList = await fetchEvidenceList('GitHub');
        if (evList && evList.items) {
          const reposSet = new Set<string>();
          evList.items.forEach(item => {
            const repoName = item.normalized_payload?.repository_name;
            if (repoName) reposSet.add(repoName);
          });
          const reposArr = Array.from(reposSet);
          setUserRepos(reposArr);
          if (reposArr.length > 0) {
            setRepo(reposArr[0]);
          }
        }
      } else {
        setOwner('');
        setRepo('');
        setPath('');
        setUserRepos([]);
        setArtifactList([]);
        setSelectedArtifact(null);
      }
    }

    async function loadArtifacts() {
      const res = await fetchCodeArtifacts();
      if (res && res.items) {
        setArtifactList(res.items);
        if (res.items.length > 0) {
          setSelectedArtifact(res.items[0]);
        }
      }
    }

    loadGitHubConnection();
    loadArtifacts();
  }, []);

  // Validate owner match case-insensitively
  useEffect(() => {
    if (owner && connectedUsername && owner.trim().toLowerCase() !== connectedUsername.trim().toLowerCase()) {
      setValidationError(`Repository owner '${owner}' does not match your connected GitHub username '${connectedUsername}'. Code Intelligence can only analyze repositories owned by your connected GitHub account.`);
    } else {
      setValidationError(null);
    }
  }, [owner, connectedUsername]);

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedUsername) {
      setErrorMessage('Please connect your GitHub account on the Platforms page to analyze source repositories.');
      return;
    }
    if (owner.trim().toLowerCase() !== connectedUsername.trim().toLowerCase()) {
      setErrorMessage(`Repository owner '${owner}' does not match your connected GitHub username '${connectedUsername}'.`);
      return;
    }
    if (!owner.trim() || !repo.trim() || !path.trim()) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = await analyzeGitHubFile(owner.trim(), repo.trim(), path.trim());
      if (result) {
        setSelectedArtifact(result);
        setArtifactList(prev => [result, ...prev.filter(a => a.id !== result.id)]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve & analyze source file';
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
              <FileCode className="h-6 w-6 text-cyan-400" />
              Code Intelligence & AST Telemetry
            </h1>
            <p className="text-xs text-slate-400">
              Retrieve real accessible source files from public GitHub repositories for static AST parsing, complexity calculation & concept extraction.
            </p>
          </div>
          {connectedUsername && (
            <div className="px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs font-mono text-purple-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Connected GitHub: <strong className="text-white">{connectedUsername}</strong></span>
            </div>
          )}
        </div>

        {/* Source Retrieval & AST Execution Bar */}
        <div className="glow-card p-6 rounded-2xl bg-[#0B0F1C] border border-purple-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> OFFICIAL GITHUB REST API SOURCE RETRIEVAL
            </span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> No Web Scraping · Rate-Limit Protected
            </span>
          </div>

          {!connectedUsername ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                No GitHub account connected. Please connect your GitHub username on the Platforms page.
              </span>
              <a href="/platforms" className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all">
                Connect GitHub
              </a>
            </div>
          ) : (
            <form onSubmit={handleAnalyzeSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Repository Owner</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder={`e.g. ${connectedUsername}`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Repository Name</label>
                {userRepos.length > 0 ? (
                  <select
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    required
                  >
                    {userRepos.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="e.g. my-repository"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                )}
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-mono text-slate-400 block">Source File Path</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. app/main.py, src/utils.py"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isAnalyzing || !!validationError}
                  className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-xs font-semibold text-white shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Parsing AST...
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      Analyze Code
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {validationError && (
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs font-mono text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Selected Artifact Code Intelligence Dashboard */}
        {selectedArtifact ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Code Analysis Metrics & Concept Badges */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Artifact Metadata Card */}
              <div className="glow-card p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono text-purple-400 font-bold flex items-center gap-1.5">
                    <Layers className="h-4 w-4" /> {selectedArtifact.repository}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {selectedArtifact.language}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>File Path:</span>
                    <span className="text-white font-bold truncate max-w-xs">{selectedArtifact.file_path}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>File Size:</span>
                    <span className="text-cyan-400">{selectedArtifact.size_bytes} bytes</span>
                  </div>
                  {selectedArtifact.source_url && (
                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Source Link:</span>
                      <a 
                        href={selectedArtifact.source_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
                      >
                        View on GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* AST Static Analysis Card */}
              {selectedArtifact.analysis && (
                <div className="glow-card p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-cyan-400" />
                    Python AST & Static Analysis Metrics
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-center font-mono">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">LINES OF CODE</span>
                      <span className="text-base font-bold text-white">{selectedArtifact.analysis.lines_of_code}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">CYCLOMATIC COMPLEXITY</span>
                      <span className="text-base font-bold text-cyan-400">{selectedArtifact.analysis.cyclomatic_complexity}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">FUNCTIONS</span>
                      <span className="text-base font-bold text-purple-300">{selectedArtifact.analysis.function_count}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">RECURSION DETECTED</span>
                      <span className={`text-base font-bold ${selectedArtifact.analysis.has_recursion ? 'text-amber-400' : 'text-slate-500'}`}>
                        {selectedArtifact.analysis.has_recursion ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {/* Detected Concepts Badges */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 block">AST DETECTED CONCEPTS</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedArtifact.analysis.detected_concepts?.map((c, i) => (
                        <span 
                          key={i} 
                          className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-[10px] font-mono text-purple-300 font-bold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Data Structures Used */}
                  {selectedArtifact.analysis.data_structures && selectedArtifact.analysis.data_structures.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 block">DATA STRUCTURES</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedArtifact.analysis.data_structures.map((ds, i) => (
                          <span 
                            key={i} 
                            className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-300"
                          >
                            {ds}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Right Column: Original Code Viewer with Monaco Expand Ability */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glow-card p-6 rounded-2xl bg-[#0B0F1C] border border-purple-500/30 flex flex-col justify-between space-y-4 h-full">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white">
                      ORIGINAL SOURCE CODE
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      VERIFIED GITHUB REST
                    </span>
                  </div>

                  <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-mono font-semibold text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> EXPAND CODE
                  </button>
                </div>

                {/* Preformatted Code Snippet Preview */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
                  <pre>{selectedArtifact.code_content}</pre>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>Source Provenance: GitHub REST Ingestion</span>
                  <span>Persisted in PostgreSQL CodeArtifacts</span>
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 font-mono text-xs text-slate-400 space-y-2">
            <Sparkles className="h-8 w-8 text-purple-400 mx-auto" />
            <p>No code artifact loaded yet. Enter a GitHub repository and file path above to execute real AST analysis.</p>
          </div>
        )}

        {/* Monaco Editor Full-Screen Modal */}
        {isExpanded && selectedArtifact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <div className="glow-card w-full max-w-5xl h-[85vh] p-6 rounded-2xl bg-[#0B0F1C] border border-cyan-500/40 flex flex-col justify-between space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-sm font-bold font-mono text-white">
                    {selectedArtifact.repository} / {selectedArtifact.file_path}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                    {selectedArtifact.language}
                  </span>
                </div>

                <button 
                  onClick={() => setIsExpanded(false)} 
                  className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Monaco Interactive Code View */}
              <div className="flex-1 bg-[#080B14] rounded-xl overflow-hidden border border-slate-800">
                <MonacoEditor
                  height="100%"
                  defaultLanguage={selectedArtifact.language.toLowerCase() === 'python' ? 'python' : 'javascript'}
                  theme="vs-dark"
                  value={selectedArtifact.code_content}
                  options={{
                    readOnly: true,
                    fontSize: 13,
                    fontFamily: 'Geist Mono, monospace',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    padding: { top: 12 },
                  }}
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> ORIGINAL CODE UNTOUCHED
                </span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-mono text-slate-300 hover:text-white border border-slate-800"
                >
                  Close View
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
