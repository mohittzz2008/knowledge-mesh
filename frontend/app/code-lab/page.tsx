'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/ui/Navbar';
import { 
  fetchCodeLabProblem, 
  runCodeLab, 
  analyzeCodeLab, 
  submitCodeLab, 
  fetchCodeLabHint,
  CodeLabProblemDetail,
  CodeRunResponse,
  CodeAnalyzeResponse,
  CodeSubmitResponse 
} from '@/lib/api';
import { 
  Code2, 
  Play, 
  Send, 
  BrainCircuit, 
  CheckCircle2, 
  Sparkles, 
  Terminal, 
  Bot,
  AlertTriangle,
  Lightbulb,
  Split,
  FileCode
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Lazy-load Monaco Editor for optimal performance
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#080B14] text-xs font-mono text-slate-500">
      Loading Monaco Editor...
    </div>
  ),
});

const MonacoDiffEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#080B14] text-xs font-mono text-cyan-400">
        Loading Monaco Diff View...
      </div>
    ),
  }
);

export default function CodeLabPage() {
  const [problem, setProblem] = useState<CodeLabProblemDetail | null>(null);
  const [code, setCode] = useState<string>('');
  const [suggestedCode, setSuggestedCode] = useState<string>('');
  const [showDiffView, setShowDiffView] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'hints' | 'diagnostics'>('problem');
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [runResult, setRunResult] = useState<CodeRunResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CodeAnalyzeResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<CodeSubmitResponse | null>(null);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<number>(0);

  // Load problem details on mount
  useEffect(() => {
    async function loadProblem() {
      const p = await fetchCodeLabProblem('problem-tree-inorder');
      if (p) {
        setProblem(p);
        setCode(p.initial_code);
        setSuggestedCode(p.suggested_code);
      }
    }
    loadProblem();
  }, []);

  const handleRun = async () => {
    setIsExecuting(true);
    setRunResult(null);
    const res = await runCodeLab(code, 'Python', problem?.id || 'problem-tree-inorder');
    if (res) setRunResult(res);
    setIsExecuting(false);
  };

  const handleAnalyzeLogic = async () => {
    setIsExecuting(true);
    const res = await analyzeCodeLab(code, 'Python', problem?.id || 'problem-tree-inorder');
    if (res) {
      setAnalysisResult(res);
      setSuggestedCode(res.suggested_code);
      setActiveTab('diagnostics');
    }
    setIsExecuting(false);
  };

  const handleSubmit = async () => {
    setIsExecuting(true);
    setSubmitResult(null);
    const res = await submitCodeLab(code, 'Python', problem?.id || 'problem-tree-inorder');
    if (res) {
      setSubmitResult(res);
      if (res.is_passed) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
    setIsExecuting(false);
  };

  const handleGetHint = async () => {
    const nextLevel = hintLevel + 1;
    const res = await fetchCodeLabHint(problem?.id || 'problem-tree-inorder', nextLevel);
    if (res) {
      setCurrentHint(res.hint);
      setHintLevel(res.hint_level);
      setActiveTab('hints');
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      {/* Code Lab Toolbar Header */}
      <div className="border-b border-purple-900/20 bg-[#0B0F1C] px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-950 text-cyan-400 border border-purple-500/30">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              {problem?.title || 'Binary Tree Inorder Traversal'}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                {problem?.difficulty || 'Easy'}
              </span>
            </h1>
            <span className="text-[10px] font-mono text-slate-400">
              Target Skill: <span className="text-purple-300 font-bold">{problem?.target_skill || 'Tree Traversal'}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 font-mono">
          <button
            onClick={() => setShowDiffView(!showDiffView)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
              showDiffView 
                ? 'bg-purple-950 text-purple-300 border-purple-500/50' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Split className="h-3.5 w-3.5 text-cyan-400" />
            {showDiffView ? 'Show Single Editor' : 'Compare Approach'}
          </button>

          <button
            onClick={handleAnalyzeLogic}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <BrainCircuit className="h-3.5 w-3.5" /> Analyze Logic
          </button>
          
          <button
            onClick={handleRun}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" /> Run Code
          </button>

          <button
            onClick={handleSubmit}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-xs font-semibold text-white shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      </div>

      {/* Main IDE 2-Pane Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)] overflow-y-auto lg:overflow-hidden">
        
        {/* Left Pane: Problem Description & Diagnostics */}
        <div className="lg:col-span-4 border-r border-purple-900/20 bg-[#0B0F1C]/90 p-5 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
              <button 
                onClick={() => setActiveTab('problem')} 
                className={`text-xs font-bold px-3 py-1.5 rounded-lg ${activeTab === 'problem' ? 'bg-purple-950 text-purple-300 border border-purple-500/30' : 'text-slate-400'}`}
              >
                Problem
              </button>
              <button 
                onClick={() => setActiveTab('diagnostics')} 
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 ${activeTab === 'diagnostics' ? 'bg-purple-950 text-cyan-300 border border-purple-500/30' : 'text-slate-400'}`}
              >
                <BrainCircuit className="h-3.5 w-3.5 text-cyan-400" /> Diagnostics
              </button>
              <button 
                onClick={() => setActiveTab('hints')} 
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 ${activeTab === 'hints' ? 'bg-purple-950 text-amber-300 border border-purple-500/30' : 'text-slate-400'}`}
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Hints
              </button>
            </div>

            {/* Tab 1: Problem Statement */}
            {activeTab === 'problem' && (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-200">
                  <span className="font-bold text-cyan-400 block mb-1">LEARNING OBJECTIVE:</span>
                  {problem?.learning_objective}
                </div>

                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-relaxed">
                  {problem?.description}
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block">TEST CASES ({problem?.test_cases.length || 0})</span>
                  {problem?.test_cases.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                      <div className="text-slate-400">Function: <span className="text-white font-bold">{t.function_call}</span></div>
                      <div className="text-slate-400">Expected: <span className="text-cyan-400">{t.expected}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: AI Diagnostic Report */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-4 font-mono text-xs">
                {analysisResult ? (
                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 space-y-3 whitespace-pre-line leading-relaxed">
                    <span className="font-bold text-cyan-400 block flex items-center gap-1.5">
                      <BrainCircuit className="h-4 w-4" /> AST DIAGNOSTIC REPORT
                    </span>
                    {analysisResult.diagnostic_report}
                    <div className="pt-2 border-t border-cyan-500/30 text-[11px] text-slate-300">
                      <span className="text-purple-300 font-bold block mb-1">SUGGESTED APPROACH EXPLANATION:</span>
                      {analysisResult.explanation}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-center space-y-2">
                    <p>No AST diagnostic generated yet.</p>
                    <button
                      onClick={handleAnalyzeLogic}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-[11px]"
                    >
                      Run Logic Analysis
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Progressive Hints */}
            {activeTab === 'hints' && (
              <div className="space-y-4 font-mono text-xs">
                {currentHint ? (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-2">
                    <span className="font-bold text-amber-400 block flex items-center gap-1">
                      <Lightbulb className="h-4 w-4" /> HINT LEVEL {hintLevel}
                    </span>
                    <p className="leading-relaxed">{currentHint}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">Need help? Click below to request progressive hints without revealing full solutions immediately.</p>
                )}

                <button
                  onClick={handleGetHint}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                  {hintLevel > 0 ? `Get Next Hint (${hintLevel + 1}/3)` : 'Request Progressive Hint'}
                </button>
              </div>
            )}

            {/* Submission Status Alert */}
            {submitResult && (
              <div className={`p-4 rounded-xl font-mono text-xs space-y-2 border ${
                submitResult.is_passed 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>SUBMISSION STATUS: {submitResult.status}</span>
                  <span>{submitResult.execution_time_ms} ms</span>
                </div>
                <p className="text-[11px] leading-relaxed">{submitResult.message}</p>
              </div>
            )}

          </div>
        </div>

        {/* Right Pane: Monaco Editor / Diff Editor & Output Console */}
        <div className="lg:col-span-8 flex flex-col h-full">
          
          {/* Editor Container */}
          <div className="flex-1 bg-[#080B14] relative">
            {showDiffView ? (
              <MonacoDiffEditor
                height="100%"
                language="python"
                theme="vs-dark"
                original={code}
                modified={suggestedCode}
                options={{
                  fontSize: 13,
                  fontFamily: 'Geist Mono, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: true,
                }}
              />
            ) : (
              <MonacoEditor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'Geist Mono, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  padding: { top: 12 },
                }}
              />
            )}
          </div>

          {/* Console Output Drawer */}
          {runResult && (
            <div className="h-44 border-t border-purple-900/30 bg-[#0B0F1C] p-4 font-mono text-xs overflow-y-auto space-y-3">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1.5 font-bold text-cyan-400">
                  <Terminal className="h-3.5 w-3.5" /> EXECUTION CONSOLE ({runResult.passed_count}/{runResult.total_tests} PASSED)
                </span>
                <span className="text-[11px] text-slate-500">{runResult.execution_time_ms} ms</span>
              </div>

              {/* Test Case Results */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {runResult.test_results.map((tr) => (
                  <div 
                    key={tr.test_case} 
                    className={`p-2.5 rounded-lg border text-[11px] font-bold ${
                      tr.passed 
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                        : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span>Test Case {tr.test_case}</span>
                      <span>{tr.passed ? '✓ PASS' : '✕ FAIL'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Actual: <span className="text-white">{tr.actual}</span>
                    </div>
                  </div>
                ))}
              </div>

              {runResult.stderr && (
                <pre className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] whitespace-pre-wrap font-mono">
                  {runResult.stderr}
                </pre>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
