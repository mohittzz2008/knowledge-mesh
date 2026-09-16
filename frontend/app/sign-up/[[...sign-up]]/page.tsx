'use client';

import { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/ui/Navbar';
import { 
  Sparkles, 
  Mail, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Share2
} from 'lucide-react';

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send Email OTP via Clerk Sign-Up
  const handleStartSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email.trim(),
      });

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setVerifying(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Failed to initiate sign-up OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Verify 6-digit OTP code via Clerk Sign-Up
  const handleVerifySignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/dashboard');
      } else {
        setError('Sign-up incomplete. Please complete email verification.');
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Sign-Up
  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: any) {
      setError(err?.message || 'Google sign-up initialization failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-mesh-grid relative overflow-hidden">
        
        {/* Glow Ambient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md glow-card p-8 rounded-3xl relative z-10 space-y-8 backdrop-blur-2xl">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-xs font-mono text-purple-300">
              <Share2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>JOIN KNOWLEDGE MESH</span>
            </div>

            <h1 className="text-2xl font-extrabold font-mono text-white tracking-tight">
              Your Code Has a Story.
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              We turn it into your learning path.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-xs font-mono text-red-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!verifying ? (
            /* Email Input Form */
            <form onSubmit={handleStartSignUp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-purple-400" /> WORK OR PERSONAL EMAIL
                </label>
                <input
                  type="email"
                  required
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500/60 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-sm font-semibold text-white shadow-xl shadow-purple-600/30 hover:shadow-cyan-500/30 hover:brightness-110 disabled:opacity-50 transition-all font-mono"
              >
                {loading ? 'Sending OTP Code...' : 'Send OTP Code'}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative px-3 bg-[#0B0F1C] text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  OR
                </span>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 hover:text-white hover:border-slate-700 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                </svg>
                Sign Up with Google
              </button>
            </form>
          ) : (
            /* OTP 6-Digit Code Verification Screen */
            <form onSubmit={handleVerifySignUp} className="space-y-6">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-center space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  VERIFY YOUR EMAIL ADDRESS
                </span>
                <p className="text-xs font-mono text-slate-300">
                  OTP sent to: <span className="text-white font-bold">{email}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-cyan-400" /> ENTER 6-DIGIT OTP
                  </span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-lg font-mono tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 transition-all font-mono"
              >
                {loading ? 'Verifying OTP...' : 'Verify & Create Account'}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="text-center pt-2 text-xs font-mono text-slate-500">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-bold">
              Sign In
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
}
