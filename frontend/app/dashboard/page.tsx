'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { 
  fetchKnowledgeMesh, 
  fetchEvidenceList, 
  fetchNextBestAction,
  fetchUserProfile,
  KnowledgeMeshResponse, 
  EvidenceListResponse,
  NextBestActionResponse,
  UserProfileResponse
} from '@/lib/api';
import { 
  Sparkles, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Target, 
  Code2,
  FileCode,
  Search,
  Check,
  Route,
  Database,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [meshData, setMeshData] = useState<KnowledgeMeshResponse | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceListResponse | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [nextBestAction, setNextBestAction] = useState<NextBestActionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      const [meshRes, evRes, nbaRes, profRes] = await Promise.all([
        fetchKnowledgeMesh(),
        fetchEvidenceList(),
        fetchNextBestAction(),
        fetchUserProfile(),
      ]);

      if (meshRes) setMeshData(meshRes);
      if (evRes) setEvidenceData(evRes);
      if (nbaRes) setNextBestAction(nbaRes);
      if (profRes) setUserProfile(profRes);
      setIsLoading(false);
    }
    loadDashboardData();
  }, []);

  const totalEvidenceItems = userProfile?.total_evidence_count || evidenceData?.total || 0;
  const externalEvidenceCount = userProfile?.external_evidence_count || evidenceData?.total || 0;
  const codelabArtifactsCount = userProfile?.codelab_artifacts_count || 0;

  const githubConn = userProfile?.connected_platforms?.find(p => p.platform === 'GitHub');
  const leetcodeConn = userProfile?.connected_platforms?.find(p => p.platform === 'LeetCode');
  const hackerrankConn = userProfile?.connected_platforms?.find(p => p.platform === 'HackerRank');

  const githubEvidenceCount = userProfile?.platform_counts?.GitHub || evidenceData?.platform_counts?.GitHub || 0;
  const leetcodeEvidenceCount = userProfile?.platform_counts?.LeetCode || evidenceData?.platform_counts?.LeetCode || 0;
  const hackerrankEvidenceCount = userProfile?.platform_counts?.HackerRank || 0;
  const isGithubConnected = githubConn?.connected || githubEvidenceCount > 0;

  // HackerRank verified domain-aggregated solved count from badges/profile telemetry
  const hrBadges = evidenceData?.items?.filter(
    e => e.evidence_type === 'badge' && 
    (e.raw_payload?.badge_name || e.title?.includes('HackerRank Badge'))
  ) || [];
  const hrBadgeSolvedSum = hrBadges.reduce((sum, b) => {
    const solvedVal = (b.raw_payload as { solved?: number })?.solved;
    return typeof solvedVal === 'number' ? sum + solvedVal : sum;
  }, 0);
  const hrProfileSolved = (evidenceData?.items?.find(
    e => e.evidence_type === 'profile' && e.title?.includes('HackerRank')
  )?.normalized_payload as { total_solved?: number } | undefined)?.total_solved;
  const hackerrankSolvedCount = hrBadgeSolvedSum > 0 ? hrBadgeSolvedSum : (hrProfileSolved || 0);

  // Demonstrated HackerRank skills backed by real evidence
  const hackerrankSkills = userProfile?.skills?.filter(
    s => (s.sources?.HackerRank || 0) > 0
  ) || [];

  // Filter skills by status from live Knowledge Mesh
  const nodes = meshData?.nodes || [];
  const weakNodes = nodes.filter(n => n.data.status === 'weak');
  const masteredNodes = nodes.filter(n => n.data.status === 'mastered');
  const developingNodes = nodes.filter(n => n.data.status === 'developing');

  // Calculate evidence score
  const totalAssessed = meshData?.assessed_skills_count || 0;
  const overallSkillScore = userProfile?.overall_skill_score ?? (totalAssessed > 0 
    ? Math.round(nodes.reduce((acc, curr) => acc + curr.data.mastery, 0) / nodes.length)
    : 0);

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono text-white">Developer Intelligence Dashboard</h1>
            <p className="text-xs text-slate-400">Real-time telemetry from PostgreSQL evidence pipeline & AST code intelligence.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/learning-path"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 hover:border-cyan-500/40 transition-all font-mono"
            >
              Learning Path
              <Route className="h-4 w-4" />
            </Link>
            <Link
              href="/knowledge-mesh"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition-all font-mono"
            >
              Inspect Knowledge Mesh
              <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Skill Score Dial */}
          <div className="md:col-span-4 glow-card p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">REAL EVIDENCE SCORE</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                {totalAssessed > 0 ? 'POSTGRES VERIFIED' : 'NO EVIDENCE YET'}
              </span>
            </div>

            <div className="my-6 flex items-center justify-center relative">
              <svg viewBox="0 0 120 120" className="h-36 w-36" style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="50%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
                {/* Background ring */}
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1b4b" strokeWidth="8" />
                {/* Progress arc */}
                <circle 
                  cx="60" cy="60" r="50" fill="none" 
                  stroke="url(#scoreGradient)" strokeWidth="8"
                  strokeDasharray={`${(overallSkillScore / 100) * 314} 314`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              {/* Score text overlay — not rotated */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-extrabold font-mono text-white">
                    {isLoading ? '...' : overallSkillScore}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">/ 100 MASTERY</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 text-center font-mono">
              {totalEvidenceItems} Verified Evidence Points in Database
            </div>
          </div>

          {/* Next Best Action Card */}
          <div className="md:col-span-8 glow-card-cyan p-6 rounded-2xl flex flex-col justify-between relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    <Target className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">NEXT BEST ACTION</span>
                </div>
                {nextBestAction ? (
                  <span className="text-xs font-mono text-amber-400 flex items-center gap-1 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" /> Difficulty: {nextBestAction.recommended_difficulty}
                  </span>
                ) : (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> System Active
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold font-mono text-white">
                  {nextBestAction ? `Practice ${nextBestAction.target_skill}` : 'Ingest GitHub Repositories for AST Analysis'}
                </h2>
                <div className="mt-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2 font-mono">
                  <span className="text-purple-400 font-semibold block">EXPLAINABLE JUSTIFICATION:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {nextBestAction?.reason || 'Knowledge Mesh requires accessible Python source files to run AST static code analysis.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 font-mono">
              <Link
                href="/platforms"
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white"
              >
                Sync Platforms
              </Link>
              <Link
                href="/learning-path"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-semibold text-white shadow-md hover:brightness-110"
              >
                <Route className="h-3.5 w-3.5" />
                View Learning Roadmap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* Middle Row: Connected Platforms & Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Connected Platforms */}
          <div className="md:col-span-6 glow-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-400" />
                Platform Connection Status
              </h3>
              <Link href="/platforms" className="text-xs text-purple-400 hover:underline font-mono">Manage</Link>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* GitHub */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-cyan-400">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">GitHub Connector</span>
                    <span className="text-slate-400 text-[11px]">
                      {isGithubConnected ? `Connected (${githubConn?.username || 'Active'})` : 'Not connected'}
                    </span>
                  </div>
                </div>
                {isGithubConnected ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">{githubEvidenceCount} items</span>
                  </div>
                ) : (
                  <Link href="/platforms" className="px-3 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold">
                    Connect
                  </Link>
                )}
              </div>

              {/* LeetCode */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">LeetCode Connector</span>
                    <span className="text-slate-400 text-[11px]">
                      {leetcodeConn?.connected ? `Connected (${leetcodeConn.username || 'H29bfENjLC'})` : 'Public Profile GraphQL'}
                    </span>
                  </div>
                </div>
                {leetcodeConn?.connected || leetcodeEvidenceCount > 0 ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">{leetcodeEvidenceCount} evidence items</span>
                  </div>
                ) : (
                  <Link href="/platforms" className="px-3 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold">
                    Connect
                  </Link>
                )}
              </div>

              {/* CodeLab Internal */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-purple-400">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">CodeLab Internal Sandbox</span>
                    <span className="text-slate-400 text-[11px]">
                      Interactive Practice Submissions
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">
                    <Check className="h-3 w-3" /> Active Practice
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">{codelabArtifactsCount} practice artifacts</span>
                </div>
              </div>

              {/* HackerRank */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">HackerRank Connector</span>
                      <span className="text-slate-400 text-[11px]">
                        {hackerrankConn?.connected ? `Connected (${hackerrankConn.username})` : 'Not connected'}
                      </span>
                    </div>
                  </div>
                  {hackerrankConn?.connected ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {hackerrankSolvedCount > 0 
                          ? `${hackerrankSolvedCount} solved · badges & challenges` 
                          : `${hackerrankEvidenceCount} items`}
                      </span>
                    </div>
                  ) : (
                    <Link href="/platforms" className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold">
                      Connect
                    </Link>
                  )}
                </div>

                {/* Demonstrated HackerRank Topics & Skills from Real Telemetry */}
                {hackerrankConn?.connected && hackerrankSkills.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5 font-mono">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      DEMONSTRATED TOPICS & EVIDENCE:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hackerrankSkills.map(sk => (
                        <span
                          key={sk.slug}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-purple-500/30 text-[10px] text-purple-300 flex items-center gap-1"
                        >
                          <span>{sk.skill_name}</span>
                          <span className="text-cyan-400 font-bold">({sk.sources?.HackerRank})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CodeChef */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-amber-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">CodeChef Connector</span>
                    <span className="text-slate-400 text-[11px]">
                      {userProfile?.connected_platforms?.find(p => p.platform === 'CodeChef')?.connected 
                        ? `Connected (${userProfile.connected_platforms.find(p => p.platform === 'CodeChef')?.username})` 
                        : 'Public Rating & Star Tier'}
                    </span>
                  </div>
                </div>
                {userProfile?.connected_platforms?.find(p => p.platform === 'CodeChef')?.connected || (userProfile?.platform_counts?.CodeChef || 0) > 0 ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      <Check className="h-3 w-3" /> Connected
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">{userProfile?.platform_counts?.CodeChef || 0} evidence items</span>
                  </div>
                ) : (
                  <Link href="/platforms" className="px-3 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold">
                    Connect
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Detected Skill Gaps & Strengths with Platform Provenance */}
          <div className="md:col-span-6 glow-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Detected Gaps & Strengths ({weakNodes.length + developingNodes.length + masteredNodes.length})
              </h3>
              <Link href="/knowledge-mesh" className="text-xs text-cyan-400 hover:underline font-mono">Open Mesh</Link>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-72 overflow-y-auto pr-1">
              {weakNodes.map((gap) => (
                <div key={gap.id} className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white block">{gap.data.name}</span>
                    <span className="font-bold text-amber-400">{gap.data.mastery}%</span>
                  </div>
                  <span className="text-slate-400 text-[11px] block">{gap.data.recommendation}</span>
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      Sources: {gap.data.sources && gap.data.sources.length > 0 ? gap.data.sources.join(', ') : 'None'}
                    </span>
                  </div>
                </div>
              ))}

              {masteredNodes.map((sk) => {
                const profSkill = userProfile?.skills?.find(s => s.slug === sk.id);
                const srcs = profSkill?.sources || {};
                const srcBadges = Object.entries(srcs).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' | ');

                return (
                  <div key={sk.id} className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white block">{sk.data.name}</span>
                      <span className="font-bold text-emerald-400">{sk.data.mastery}%</span>
                    </div>
                    <span className="text-emerald-400 text-[11px] block">Mastered ({sk.data.evidenceCount} total items)</span>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
                        Lineage Breakdown: {srcBadges || `CodeLab: ${sk.data.evidenceCount}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {developingNodes.map((sk) => {
                const profSkill = userProfile?.skills?.find(s => s.slug === sk.id);
                const srcs = profSkill?.sources || {};
                const srcBadges = Object.entries(srcs).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' | ');

                return (
                  <div key={sk.id} className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white block">{sk.data.name}</span>
                      <span className="font-bold text-purple-400">{sk.data.mastery}%</span>
                    </div>
                    <span className="text-purple-300 text-[11px] block">Developing ({sk.data.evidenceCount} items)</span>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300">
                        Lineage Breakdown: {srcBadges || `CodeLab: ${sk.data.evidenceCount}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {nodes.length === 0 && (
                <p className="text-slate-400 text-xs text-center py-4">No skill assessments recorded yet.</p>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
