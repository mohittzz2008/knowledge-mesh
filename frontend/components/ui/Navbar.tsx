'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchHealth, fetchDbHealth } from '@/lib/api';
import { 
  Network, 
  LayoutDashboard, 
  Share2, 
  Route, 
  MessageSquareCode, 
  Code2, 
  Database, 
  Layers,
  FileCode,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      const health = await fetchHealth();
      setBackendStatus(health && health.status === 'ok' ? 'connected' : 'disconnected');
      
      const db = await fetchDbHealth();
      setDbStatus(db && db.database === 'connected' ? 'connected' : 'disconnected');
    }
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/knowledge-mesh', label: 'Knowledge Mesh', icon: Share2 },
    { href: '/learning-path', label: 'Learning Path', icon: Route },
    { href: '/coach', label: 'AI Coach', icon: MessageSquareCode },
    { href: '/code-lab', label: 'Code Lab', icon: Code2 },
    { href: '/code-intelligence', label: 'Code Intelligence', icon: FileCode },
    { href: '/platforms', label: 'Platforms', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-900/20 bg-[#080B14]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo & Platform Title */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 transition-all duration-300 group-hover:shadow-cyan-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#080B14]">
                <Network className="h-5 w-5 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-base font-bold tracking-wider text-white flex items-center gap-1.5">
                KNOWLEDGE MESH
                <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase">Developer Intelligence</span>
            </div>
          </Link>

          {/* Backend Status Indicator */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]' : 'bg-rose-500'}`} />
              <span className="text-slate-300">API</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-cyan-400" />
              <span className={`h-2 w-2 rounded-full ${dbStatus === 'connected' ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' : 'bg-rose-500'}`} />
              <span className="text-slate-300">PostgreSQL</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 xl:px-3 py-1.5 xl:py-2 text-[11px] xl:text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 xl:h-4 xl:w-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* User Auth (Clerk) */}
        <div className="flex items-center gap-4">
          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 border border-purple-500/40 shadow-sm"
                }
              }}
            />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:brightness-110 transition-all cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>

      </div>

      {/* Mobile Navigation Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-purple-900/20 bg-[#080B14]/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
