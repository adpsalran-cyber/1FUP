import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/actions';

interface MyLeaguesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLeague: (leagueId: string, role: string, leagueName: string) => void;
  onExitCurrentLeague: () => void;
}

export function MyLeaguesModal({
  isOpen,
  onClose,
  onSelectLeague,
  onExitCurrentLeague,
}: MyLeaguesModalProps) {
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

  // Recupera tutte le leghe a cui l'utente appartiene
  const { data: myLeagues, isLoading } = useQuery({
    queryKey: ['my_leagues_list', userId],
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
            invite_code,
            code,
            created_by
          )
        `)
        .eq('user_id', userId);

      if (error) return [];

      return (data || []).map((item: any) => {
        const legObj = item.leagues || {};
        const code = legObj.invite_code || legObj.code || 'N/D';
        const isAdmin = item.role === 'admin' || legObj.created_by === userId;

        return {
          id: legObj.id || item.league_id,
          name: legObj.name || 'La Mia Lega',
          code,
          role: isAdmin ? 'admin' : (item.role || 'member'),
          isAdmin,
          isCurrent: (legObj.id || item.league_id) === activeLeagueId,
        };
      });
    },
  });

  if (!isOpen) return null;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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

        {/* Pulsante per uscire dalla lega attiva SENZA fare logout */}
        {activeLeagueId && (
          <button
            type="button"
            onClick={onExitCurrentLeague}
            className="w-full py-2.5 px-3 bg-[#0b0e14] border border-amber-400/40 hover:border-amber-400 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow"
          >
            <span>🚪</span>
            <span>Esci dalla lega attuale (Cambia o Iscriviti)</span>
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

          {myLeagues?.map((leg: any) => (
            <div
              key={leg.id}
              className={`p-3 rounded-xl border flex flex-col gap-2 transition ${
                leg.isCurrent
                  ? 'bg-amber-400/10 border-amber-400/50'
                  : 'bg-[#0b0e14] border-[#222c42]'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{leg.name}</h3>
                    {leg.isCurrent && (
                      <span className="text-[9px] bg-lime-400 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                        ATTIVA
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider block mt-0.5 ${
                      leg.isAdmin ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {leg.isAdmin ? 'Ruolo: ADMIN / CREATORE' : 'Ruolo: OSPITE / MEMBRO'}
                  </span>
                </div>

                {!leg.isCurrent && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLeague(leg.id, leg.role, leg.name);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold transition shadow"
                  >
                    ENTRA
                  </button>
                )}
              </div>

              {/* Se l'utente è ADMIN di questa lega, mostra il codice invito per condividerlo */}
              {leg.isAdmin && (
                <div className="flex items-center justify-between bg-[#151b28] border border-[#222c42] px-2.5 py-1.5 rounded-lg text-xs mt-1">
                  <span className="text-slate-400 text-[11px]">
                    Codice Invito: <strong className="text-amber-300 font-mono tracking-wider">{leg.code}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(leg.code)}
                    className="text-[10px] font-bold text-amber-400 hover:underline uppercase"
                  >
                    {copiedCode === leg.code ? 'COPIATO! ✓' : 'COPIA CODICE'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-[#0b0e14] text-slate-400 hover:text-slate-200 border border-[#222c42] rounded-xl text-xs font-semibold"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
