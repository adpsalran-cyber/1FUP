import React, { useState } from 'react';
import { supabase } from '../lib/engine';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = `${username.trim().toLowerCase()}@alcifutsal.local`;

    try {
      if (isRegister) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#121721] p-6 shadow-2xl">
        <h2 className="mb-2 text-center font-bebas text-3xl tracking-wide text-amber-400">
          ALCI FUTSAL HUB
        </h2>
        <p className="mb-6 text-center text-xs text-slate-400">
          {isRegister ? 'Crea il tuo profilo di squadra' : 'Accedi con le tue credenziali'}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800/50 p-2.5 text-center text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="es. bomber_marco"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 py-3 font-bebas text-lg tracking-wider text-slate-950 transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'CARICAMENTO...' : isRegister ? 'REGISTRATI' : 'ACCEDI'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-amber-400"
          >
            {isRegister
              ? 'Hai già un account? Accedi'
              : 'Prima volta qui? Registrati'}
          </button>
        </div>
      </div>
    </div>
  );
};
