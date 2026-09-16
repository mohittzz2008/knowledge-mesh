'use client';

import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  Node, 
  Edge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Navbar } from '@/components/ui/Navbar';
import { 
  fetchKnowledgeMesh, 
  KnowledgeMeshNodeData,
  KnowledgeMeshResponse 
} from '@/lib/api';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  X, 
  Share2,
  FileCode,
  ExternalLink,
  Layers,
  Database,
  Search
} from 'lucide-react';
import Link from 'next/link';

// Custom React Flow Node Component — Wrapped in React.memo for high performance
const SkillNode = memo(function SkillNode({ data }: { data: KnowledgeMeshNodeData }) {
  const isWeak = data.status === 'weak';
  const isInsufficient = data.status === 'insufficient';
  const isDeveloping = data.status === 'developing';
  const isMastered = data.status === 'mastered';

  return (
    <div className={`px-5 py-4 rounded-xl backdrop-blur-xl transition-all duration-200 w-60 border ${
      isInsufficient
        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
        : isWeak 
          ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
          : 'bg-slate-900/80 border-purple-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)] hover:border-cyan-400/50'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-2.5 !h-2.5" />
      
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs font-bold text-white tracking-wide truncate max-w-[130px]">{data.name}</span>
        {isInsufficient ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            NO EVIDENCE
          </span>
        ) : isWeak ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="h-2.5 w-2.5" /> GAP
          </span>
        ) : isDeveloping ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
            {data.mastery}%
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="h-2.5 w-2.5" /> {data.mastery}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full transition-all duration-300 ${
            isInsufficient 
              ? 'bg-slate-700' 
              : isWeak 
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' 
                : isDeveloping
                  ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                  : 'bg-gradient-to-r from-purple-500 to-cyan-400'
          }`}
          style={{ width: `${Math.max(data.mastery, 5)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>{data.evidenceCount} evidence items</span>
        <span className="text-purple-300 capitalize">{data.status}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2.5 !h-2.5" />
    </div>
  );
});

export default function KnowledgeMeshPage() {
  const nodeTypes = useMemo(() => ({ skillNode: SkillNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedSkill, setSelectedSkill] = useState<KnowledgeMeshNodeData | null>(null);
  const [meshMeta, setMeshMeta] = useState<KnowledgeMeshResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real Knowledge Mesh from FastAPI backend
  useEffect(() => {
    async function loadMesh() {
      setIsLoading(true);
      const res = await fetchKnowledgeMesh();
      if (res && res.nodes) {
        setMeshMeta(res);
        const flowNodes: Node[] = res.nodes.map(n => ({
          id: n.id,
          type: n.type || 'skillNode',
          position: n.position,
          data: n.data as unknown as Record<string, unknown>,
        }));
        const flowEdges: Edge[] = res.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: e.animated,
          style: e.style as unknown as React.CSSProperties,
        }));
        setNodes(flowNodes);
        setEdges(flowEdges);

        // Select first skill node with evidence or first default node
        const nodeWithEvidence = res.nodes.find(n => n.data.evidenceCount > 0);
        setSelectedSkill(nodeWithEvidence ? nodeWithEvidence.data : res.nodes[0]?.data || null);
      }
      setIsLoading(false);
    }
    loadMesh();
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedSkill(node.data as unknown as KnowledgeMeshNodeData);
  }, []);

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col">
      <Navbar />

      {/* Header Bar */}
      <div className="border-b border-purple-900/20 bg-[#0B0F1C] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-400" />
            Interactive Knowledge Mesh
          </h1>
          <p className="text-xs text-slate-400">
            Real AST & code telemetry graph persisted in PostgreSQL. Click any concept node to inspect source code evidence & explainability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-slate-300">Mastered (80%+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <span className="text-slate-300">Developing (60-79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <span className="text-slate-300">Skill Gap (&lt;60%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
            <span className="text-slate-400">No Evidence</span>
          </div>
        </div>
      </div>

      {/* Canvas & Drawer Layout */}
      <div className="flex-1 flex relative overflow-hidden h-[calc(100vh-130px)]">
        
        {/* React Flow Graph Canvas */}
        <div className="flex-1 h-full bg-mesh-grid relative">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center bg-[#080B14] text-xs font-mono text-cyan-400">
              Building Knowledge Mesh from PostgreSQL Telemetry...
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-[#080B14]"
            >
              <Background color="#7C3AED" gap={30} size={1} />
              <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
            </ReactFlow>
          )}
        </div>

        {/* Selected Node Sidebar Drawer (Slide-up sheet on mobile, sidebar on desktop) */}
        {selectedSkill && (
          <aside className="fixed inset-x-0 bottom-0 max-h-[80vh] sm:static sm:w-80 sm:max-h-full border-t sm:border-t-0 sm:border-l border-purple-900/40 bg-[#0B0F1C]/98 backdrop-blur-2xl p-5 sm:p-6 flex flex-col justify-between overflow-y-auto z-30 space-y-6 shadow-2xl sm:shadow-none">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">PostgreSQL Node</span>
                  <h2 className="text-lg font-bold text-white font-mono">{selectedSkill.name}</h2>
                </div>
                <button 
                  onClick={() => setSelectedSkill(null)}
                  className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status Pill */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400">Evidence Strength:</span>
                  <span className={`font-bold ${selectedSkill.evidenceCount > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {selectedSkill.evidenceStrength} ({selectedSkill.evidenceCount} items)
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400">Evidence Score:</span>
                  <span className={`font-bold ${selectedSkill.status === 'weak' ? 'text-amber-400' : selectedSkill.status === 'mastered' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {selectedSkill.mastery}% ({selectedSkill.status})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      selectedSkill.status === 'weak' ? 'bg-amber-400' : selectedSkill.status === 'insufficient' ? 'bg-slate-700' : 'bg-gradient-to-r from-purple-500 to-cyan-400'
                    }`}
                    style={{ width: `${Math.max(selectedSkill.mastery, 5)}%` }}
                  />
                </div>
              </div>

              {/* Explainable Telemetry Summary */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-purple-400" /> EXPLAINABILITY TELEMETRY
                </span>
                <p className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/20 text-xs font-mono text-slate-300 leading-relaxed">
                  {selectedSkill.explanation}
                </p>
              </div>

              {/* Linked Source Code Artifacts (Traceability) */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold text-cyan-400 flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5" /> LINKED SOURCE CODE ARTIFACTS ({selectedSkill.linkedArtifacts?.length || 0})
                </span>

                {selectedSkill.linkedArtifacts && selectedSkill.linkedArtifacts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedSkill.linkedArtifacts.map((art) => (
                      <div key={art.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold truncate max-w-[200px]">{art.repository}</span>
                          <span className="text-[10px] text-purple-400">{art.language}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{art.file_path}</p>
                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">{art.lines_of_code} LOC</span>
                          <Link 
                            href={`/code-intelligence`} 
                            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                          >
                            Inspect Code <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] font-mono text-slate-400 text-center space-y-2">
                    <p>No source code files linked to this concept yet.</p>
                    <Link
                      href="/code-intelligence"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 text-white font-semibold text-[11px]"
                    >
                      <Search className="h-3 w-3" /> Analyze Source File
                    </Link>
                  </div>
                )}
              </div>

            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <Link
                href="/code-lab"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-xs font-semibold text-white shadow-md hover:brightness-110 transition-all font-mono"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                Practice in Code Lab
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/code-intelligence"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 text-xs font-medium text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all font-mono"
              >
                Inspect Code Intelligence
              </Link>
              <Link
                href="/platforms"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-900 transition-all font-mono"
              >
                Sync Platform Evidence
              </Link>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}
