'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { 
  fetchLearningPath, 
  fetchPracticeRecommendations, 
  LearningPathResponse, 
  LearningPathStep,
  PracticeRecommendation 
} from '@/lib/api';
import { 
  Route, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  Code2,
  X,
  Database,
  Layers,
  Target
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LearningPathPage() {
  const [learningPath, setLearningPath] = useState<LearningPathResponse | null>(null);
  const [selectedStep, setSelectedStep] = useState<LearningPathStep | null>(null);
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLearningPathData() {
      setIsLoading(true);
      const res = await fetchLearningPath();
      if (res && res.steps) {
        setLearningPath(res);
        const inProgress = res.steps.find(s => s.status === 'in_progress') || res.steps[0];
        setSelectedStep(inProgress);

        // Fetch recommendations for current focus skill
        const recRes = await fetchPracticeRecommendations(inProgress.slug);
        if (recRes) setRecommendations(recRes.recommendations);
      }
      setIsLoading(false);
    }
    loadLearningPathData();
  }, []);

  const handleStepClick = async (step: LearningPathStep) => {
    // Locked steps are not interactive
    if (step.status === 'locked') return;
    setSelectedStep(step);
    const recRes = await fetchPracticeRecommendations(step.slug);
    if (recRes) setRecommendations(recRes.recommendations);
  };

  // Compute progress stats
  const totalSteps = learningPath?.steps?.length || 0;
  const completedSteps = learningPath?.steps?.filter(s => s.status === 'completed').length || 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 w-full">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400">
                <Route className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                EVIDENCE-GROUNDED CURRICULUM
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              Personalized Learning Roadmap
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl font-mono leading-relaxed">
              Targeted progression generated from your PostgreSQL knowledge graph, platform evidence, and prerequisite chains.
            </p>
          </div>

          <Link
            href="/knowledge-mesh"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-purple-300 hover:border-purple-500/40 hover:text-white transition-all shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Inspect Knowledge Mesh
          </Link>
        </div>

        {/* Stepper Roadmap Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Roadmap Stepper */}
          <div className="lg:col-span-8 glow-card p-4 sm:p-6 lg:p-8 rounded-2xl space-y-6 relative overflow-hidden">
            
            {/* Roadmap Header & Target Goal */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4 font-mono text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Sparkles className="h-4 w-4" /> DYNAMIC ROADMAP
              </div>
              <div className="text-slate-400 flex items-center gap-1.5">
                <span>Target Goal:</span>
                <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {learningPath?.target_goal || 'Graph Algorithms'}
                </span>
              </div>
            </div>

            {/* Progress Summary Header */}
            {!isLoading && totalSteps > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>
                      <strong className="text-white">{completedSteps}</strong> of{' '}
                      <strong className="text-white">{totalSteps}</strong> milestones mastered
                    </span>
                  </span>
                  <span className={`font-bold text-xs ${
                    progressPercent >= 75 ? 'text-emerald-400' : progressPercent >= 40 ? 'text-amber-400' : 'text-purple-400'
                  }`}>
                    {progressPercent}% Complete
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/60">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${Math.max(progressPercent, 2)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stepper List */}
            {isLoading ? (
              <div className="py-24 text-center font-mono text-xs text-cyan-400 space-y-3">
                <div className="h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Synthesizing Dynamic Learning Path from Knowledge Mesh...</p>
              </div>
            ) : (
              <div className="space-y-4 relative">
                {/* Vertical Timeline Track with Clean Bound Termination */}
                <div 
                  className="absolute left-5 sm:left-6 top-6 bottom-8 w-0.5 bg-gradient-to-b from-purple-500 via-amber-500/60 to-slate-800 pointer-events-none"
                  aria-hidden="true"
                />

                {learningPath?.steps.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isInProgress = step.status === 'in_progress';
                  const isRecommended = step.status === 'recommended';
                  const isLocked = step.status === 'locked';
                  const isSelected = selectedStep?.id === step.id;
                  const isGap = step.mastery < 60 && !isLocked && !isCompleted;

                  // Extract platform evidence tags if mentioned in step.why
                  const hasLeetCode = step.why?.includes('LeetCode');
                  const hasHackerRank = step.why?.includes('HackerRank');
                  const hasGitHub = step.why?.includes('GitHub');

                  return (
                    <motion.div 
                      key={step.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleStepClick(step)}
                      className={`relative pl-13 sm:pl-16 p-4 sm:p-5 rounded-xl transition-all duration-200 border ${
                        isLocked
                          ? 'bg-slate-900/20 border-slate-800/40 opacity-60 cursor-not-allowed'
                          : isSelected 
                            ? 'bg-purple-950/40 border-purple-500/70 shadow-[0_0_20px_rgba(124,58,237,0.18)] ring-1 ring-purple-500/30 cursor-pointer' 
                            : 'bg-slate-900/50 border-slate-800 hover:border-purple-500/40 hover:bg-slate-900/80 cursor-pointer'
                      }`}
                    >
                      {/* Step Marker Node */}
                      <div className={`absolute left-5 sm:left-6 top-5 -translate-x-1/2 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold font-mono z-10 transition-transform duration-200 ${
                        isCompleted 
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                          : isInProgress 
                            ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/40' 
                            : isRecommended 
                              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isInProgress ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : isRecommended ? (
                          <span className="text-xs">★</span>
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                      </div>

                      {/* Main Card Content */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Title & Metadata */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                              {step.category}
                            </span>

                            {/* Contextual Status Badges */}
                            {isCompleted && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                MASTERED
                              </span>
                            )}
                            {isInProgress && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                CURRENT FOCUS
                              </span>
                            )}
                            {isRecommended && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                RECOMMENDED NEXT
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                                LOCKED · PREREQUISITE REQUIRED
                              </span>
                            )}
                            {isGap && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                SKILL GAP
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
                            {step.title}
                          </h3>

                          <p className="text-xs text-slate-400 font-mono leading-relaxed line-clamp-2">
                            {step.why}
                          </p>

                          {/* Platform Provenance Badges (Parsed from Step Evidence) */}
                          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                            {hasLeetCode && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
                                <Layers className="h-2.5 w-2.5" /> LeetCode
                              </span>
                            )}
                            {hasHackerRank && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                                <Database className="h-2.5 w-2.5" /> HackerRank
                              </span>
                            )}
                            {hasGitHub && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                                <Code2 className="h-2.5 w-2.5" /> GitHub
                              </span>
                            )}
                          </div>

                          {/* Visual Mastery Bar (Non-locked steps only) */}
                          {!isLocked ? (
                            <div className="w-full max-w-xs h-1.5 bg-slate-950 rounded-full overflow-hidden mt-2 border border-slate-800/60">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCompleted 
                                    ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e]' 
                                    : isInProgress 
                                      ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' 
                                      : 'bg-cyan-400'
                                }`}
                                style={{ width: `${Math.max(step.mastery, 4)}%` }}
                              />
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500 pt-1">
                              Complete prior milestones to unlock
                            </div>
                          )}
                        </div>

                        {/* Mastery Stat & Action Area */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 font-mono">
                          <span className="text-[11px] text-slate-400 block font-semibold">
                            {step.evidence_count} evidence item{step.evidence_count === 1 ? '' : 's'}
                          </span>
                          <span className={`text-base font-bold ${
                            isCompleted 
                              ? 'text-emerald-400' 
                              : isInProgress 
                                ? 'text-amber-400' 
                                : isLocked 
                                  ? 'text-slate-500' 
                                  : 'text-cyan-400'
                          }`}>
                            {step.mastery}% Mastery
                          </span>

                          {!isLocked && (
                            <span className="text-[10px] text-slate-500 block sm:hidden">
                              {isSelected ? '✓ Viewing' : 'Tap to inspect →'}
                            </span>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Right Column: Practice Recommendations & Step Detail (Sticky Workspace) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            {selectedStep ? (
              <div className="glow-card-cyan p-5 sm:p-6 rounded-2xl space-y-5 border border-cyan-500/30 bg-[#0B0F1C]/90 backdrop-blur-xl">
                
                {/* Header & Milestone Title */}
                <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-semibold">
                      SELECTED MILESTONE
                    </span>
                    <h2 className="text-base sm:text-lg font-bold font-mono text-white leading-tight">
                      {selectedStep.title}
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-purple-300 capitalize shrink-0">
                    {selectedStep.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Evidence Telemetry Box */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-purple-400 font-semibold flex items-center gap-1.5 text-[11px]">
                      <Database className="h-3.5 w-3.5 text-purple-400" /> EVIDENCE TELEMETRY:
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {selectedStep.why}
                    </p>
                  </div>

                  <Link
                    href="/code-lab"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-xs font-semibold text-white shadow-md hover:brightness-110 transition-all font-mono"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                    Practice in Code Lab IDE
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Ranked Practice Recommendations */}
                <div className="space-y-3 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-cyan-400" /> RECOMMENDED PRACTICE ({recommendations.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Ranked by Gap</span>
                  </div>

                  {recommendations.length > 0 ? (
                    <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-0.5">
                      {recommendations.map((rec) => (
                        <div 
                          key={rec.problem_id} 
                          className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-2 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                              <Code2 className="h-3 w-3" /> {rec.platform}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              rec.is_real_data 
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}>
                              {rec.status_label}
                            </span>
                          </div>

                          <h4 className="text-white font-bold text-xs leading-snug">
                            {rec.title}
                          </h4>
                          
                          <p className="text-slate-400 text-[11px] leading-relaxed">
                            {rec.reason}
                          </p>

                          <div className="pt-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 text-[10px]">
                              Difficulty: <span className="text-slate-300">{rec.difficulty}</span>
                            </span>
                            {rec.url ? (
                              <a 
                                href={rec.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-500 transition-colors shadow-sm"
                              >
                                Solve Problem <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-slate-500 text-[10px]">Connector Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">No external problems queued</p>
                      <p className="text-[11px] text-slate-500">Use the Code Lab button above to practice this concept.</p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* Empty state when no step is selected */
              <div className="glow-card p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 min-h-[300px] border border-slate-800">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
                <div className="space-y-1 font-mono">
                  <h3 className="text-sm font-bold text-white">Select a Milestone</h3>
                  <p className="text-xs text-slate-400 max-w-[240px]">
                    Click any milestone in the roadmap to view practice recommendations and evidence details.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
