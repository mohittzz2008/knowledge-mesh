'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { HeroMesh } from '@/components/landing/HeroMesh';
import { Navbar } from '@/components/ui/Navbar';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  BrainCircuit, 
  Share2, 
  Route, 
  MessageSquareCode, 
  Code2, 
  CheckCircle2
} from 'lucide-react';

export default function Home() {
  const productSteps = [
    { title: 'CONNECT', desc: 'Link LeetCode, GitHub & HackerRank evidence seamlessly', icon: Layers, color: 'text-purple-400' },
    { title: 'AI ANALYSIS', desc: 'Deep skill detection & gap clustering on code activity', icon: BrainCircuit, color: 'text-cyan-400' },
    { title: 'KNOWLEDGE MESH', desc: 'Interactive concept node visualization with mastery scores', icon: Share2, color: 'text-emerald-400' },
    { title: 'LEARNING PATH', desc: 'Adaptive milestone roadmap resolving prerequisite gaps', icon: Route, color: 'text-amber-400' },
    { title: 'AI COACH & CODE LAB', desc: 'Contextual mentor & interactive IDE with real-time feedback', icon: Code2, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-mesh-grid">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Copy */}
            <motion.div 
              className="lg:col-span-6 flex flex-col space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-mono text-purple-300 w-fit">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                <span>AI-POWERED DEVELOPER INTELLIGENCE PLATFORM</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Your Code Has a Story.{' '}
                <span className="block text-gradient-purple">
                  We Turn It Into Your Learning Path.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
                Connect your learning platforms. Let AI analyze your learning evidence, 
                identify your skill gaps, and build your next step toward mastery.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-purple-600/30 hover:shadow-cyan-500/30 hover:scale-[1.02] transition-all duration-200"
                >
                  Analyze My Skills
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/knowledge-mesh"
                  className="flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-6 py-3.5 text-sm font-medium text-slate-300 hover:text-white hover:border-purple-500/40 transition-all duration-200"
                >
                  See How It Works
                </Link>
              </div>

              {/* Platform Evidence Pills */}
              <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>LeetCode Submissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>GitHub Repositories</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>HackerRank Challenges & Badges</span>
                </div>
              </div>
            </motion.div>

            {/* Hero Canvas Mesh */}
            <motion.div 
              className="lg:col-span-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <HeroMesh />
            </motion.div>

          </div>

        </div>
      </section>

      {/* Product Journey Flow */}
      <section className="py-20 border-t border-purple-900/20 bg-[#0B0F1C]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">THE ARCHITECTURE</h2>
            <p className="text-3xl font-extrabold text-white">How Knowledge Mesh Transforms Evidence into Mastery</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {productSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="glow-card p-5 rounded-2xl flex flex-col space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${step.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs text-slate-500">0{idx + 1}</span>
                  </div>
                  <h3 className="font-mono text-sm font-bold text-white tracking-wide">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Global Product Footer */}
      <footer className="border-t border-purple-900/20 bg-[#080B14] py-8 font-mono text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Knowledge Mesh Developer Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <Link href="/dashboard" className="hover:text-purple-400 transition-colors">Dashboard</Link>
            <Link href="/knowledge-mesh" className="hover:text-purple-400 transition-colors">Knowledge Mesh</Link>
            <Link href="/learning-path" className="hover:text-purple-400 transition-colors">Learning Path</Link>
            <Link href="/platforms" className="hover:text-purple-400 transition-colors">Platforms</Link>
            <Link href="/coach" className="hover:text-purple-400 transition-colors">AI Coach</Link>
          </div>
          <div className="text-slate-600">
            PostgreSQL & Multi-Platform Grounded
          </div>
        </div>
      </footer>

    </div>
  );
}
