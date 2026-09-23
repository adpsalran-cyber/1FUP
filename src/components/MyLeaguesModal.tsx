import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/actions';

interface MyLeaguesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLeague: (leagueId: string, role: string) => void;
}

export function MyLeaguesModal({ isOpen, onClose, onSelectLeague }: MyLeaguesModalProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Recupera tutte le leghe a cui l'utente appartiene (da admin o membro)
  const { data: myLeagues, isLoading, refetch } = useQuery({
    queryKey: ['my_leagues', userId],
    enabled: Boolean(userId) && isOpen,
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('league_members')
        .select(`
          role,
          league_id,
          leagues (
            id,
            name,
            code,
            created_by
          )
        `)
        .eq('user_id', userId);

      if (error) return [];

      return (data || []).map((item: any) => ({
        id: item.leagues?.id || item.league_id,
        name: item.leagues?.name || 'Lega Senza Nome',
        code: item.leagues?.code || 'N/D',
        role: item.role || (item.leagues?.created_by === userId ? 'admin' : 'member'),
        isCurrent: item.league_id === activeLeagueId,
      }));
    },
  });

  if (!isOpen) return null;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSwitchLeague = (leagueId: string, role: string) => {
    localStorage.setItem('alci_league_id', leagueId);
    localStorage.setItem('active_league_id', leagueId);
    localStorage.setItem('alci_user_role', role);
    queryClient.invalidateQueries();
    onSelectLeague(leagueId, role);
    onClose();
  };

  const handleExitCurrentLeague = () => {
    localStorage.removeItem('alci_league_id');
    localStorage.removeItem('active_league_id');
    localStorage.removeItem('alci_user_role');
    queryClient.invalidateQueries();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#151b28] border border-[#222c42] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start border-b border-[#222c42] pb-3">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              GESTIONE ACCOUNT
            </span>
            <h2 className="font-bebas text-2xl text-slate-100">LE MIE LEGHE</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#0b0e14] text-slate-400 flex items-center justify-center hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Pulsante per sganciarsi dalla lega corrente senza logout */}
        {activeLeagueId && (
          <button
            type="button"
            onClick={handleExitCurrentLeague}
            className="w-full py-2 px-3 bg-slate-900 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <span>🚪</span>
            <span>Esci dalla lega corrente (Scegline un'altra)</span>
          </button>
        )}

        {/* Lista Leghe */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-center text-xs text-slate-500 py-4">Caricamento leghe...</p>
          )}

          {!isLoading && (!myLeagues || myLeagues.length === 0) && (
            <p className="text-center text-xs text-slate-400 py-4 italic">
              Non risulti iscritto a nessuna lega al momento.
            </p>
          )}

          {myLeagues?.map((leg: any) => {
            const isAdmin = leg.role === 'admin';

            return (
              <div
                key={leg.id}
                className={`p-3 rounded-xl border flex flex-col gap-2 transition ${
                  leg.isCurrent
                    ? 'bg-amber-400/10 border-amber-400/50'
                    : 'bg-[#0b0e14] border-[#222c42]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      {leg.name}
                      {leg.isCurrent && (
                        <span className="text-[9px] bg-lime-400 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                          ATTIVA
                        </span>
                      )}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider inline-block mt-0.5 ${
                        isAdmin ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {isAdmin ? 'Ruolo: Admin / Creatore' : 'Ruolo: Membro / Ospite'}
                    </span>
                  </div>

                  {!leg.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleSwitchLeague(leg.id, leg.role)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold transition"
                    >
                      ENTRA
                    </button>
                  )}
                </div>

                {/* Se è Admin, mostra il codice invito della lega per condividerlo */}
                {isAdmin && (
                  <div className="flex items-center justify-between bg-[#151b28] border border-[#222c42] px-2.5 py-1.5 rounded-lg text-xs mt-1">
                    <span className="text-slate-400 text-[11px]">
                      Codice Lega: <strong className="text-amber-300 font-mono">{leg.code}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(leg.code)}
                      className="text-[10px] font-bold text-amber-400 hover:underline"
                    >
                      {copiedCode === leg.code ? 'COPIATO! ✓' : 'COPIA'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#0b0e14] text-slate-300 hover:text-white border border-[#222c42] rounded-xl text-xs font-semibold"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
