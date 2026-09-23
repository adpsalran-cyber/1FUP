import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);

  // Form Nuovo Giocatore
  const [playerName, setPlayerName] = useState('');
  const [playerRole, setPlayerRole] = useState('ATT');
  const [playerOverall, setPlayerOverall] = useState(70);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // 1. Carica le stagioni
  const { data: seasons } = useQuery({
    queryKey: ['seasons', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // 2. Creazione Stagione
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim() || !activeLeagueId) return;
    setCreatingSeason(true);
    try {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('league_id', activeLeagueId);

      const { error } = await supabase.from('seasons').insert({
        league_id: activeLeagueId,
        name: newSeasonName.trim(),
        is_active: true,
      });

      if (error) throw error;
      setNewSeasonName('');
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      alert('Nuova stagione creata e attivata!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setCreatingSeason(false);
    }
  };

  // 3. Attiva una stagione esistente
  const handleSetActiveSeason = async (seasonId: string) => {
    try {
      await supabase.from('seasons').update({ is_active: false }).eq('league_id', activeLeagueId);
      await supabase.from('seasons').update({ is_active: true }).eq('id', seasonId);
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    } catch (err: any) {
      alert(`Errore attivazione stagione: ${err.message}`);
    }
  };

  // 4. Creazione Giocatore Rapida
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !activeLeagueId) return;

    try {
      const defaultAttrs = {
        VEL: 65,
        TIR: 65,
        PAS: 65,
        DRI: 65,
        DIF: 65,
        FIS: 65,
      };

      const { error } = await supabase.from('players').insert({
        league_id: activeLeagueId,
        name: playerName.trim(),
        role: playerRole,
        overall: Number(playerOverall),
        attributes: defaultAttrs,
        teamwork: 'Medio',
        gk_efficiency: 'Media',
        condition: '0',
      });

      if (error) throw error;
      setPlayerName('');
      alert('Giocatore creato con successo!');
      queryClient.invalidateQueries({ queryKey: ['players_list'] });
    } catch (err: any) {
      alert(`Errore creazione giocatore: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
          PANNELLO DI CONTROLLO
        </span>
        <h1 className="font-bebas text-4xl text-slate-100 tracking-wider">AMMINISTRAZIONE</h1>
      </div>

      {/* SEZIONE 1: CREA E GESTISCI STAGIONE */}
      <div className="bg-[#131926] border border-amber-400/40 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h2 className="font-bebas text-2xl text-slate-100 tracking-wide">GESTIONE STAGIONI</h2>
        </div>

        <form onSubmit={handleCreateSeason} className="space-y-2">
          <label className="text-[11px] text-slate-400 font-bold uppercase block">
            Nome Nuova Stagione
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Es. Stagione 2026/2027 o Torneo Estivo"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              className="flex-1 bg-[#0b0e14] border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              required
            />
            <button
              type="submit"
              disabled={creatingSeason}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm px-4 py-2 rounded-xl font-bold transition shadow"
            >
              {creatingSeason ? 'SALVATAGGIO...' : 'CREA'}
            </button>
          </div>
        </form>

        {/* Elenco Stagioni Create */}
        <div className="pt-2 border-t border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
            Stagioni della Lega
          </span>
          {seasons && seasons.length > 0 ? (
            <div className="space-y-2">
              {seasons.map((s: any) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-[#0b0e14] border border-slate-800 p-2.5 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{s.name}</span>
                    {s.is_active && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                        ATTIVA
                      </span>
                    )}
                  </div>
                  {!s.is_active && (
                    <button
                      type="button"
                      onClick={() => handleSetActiveSeason(s.id)}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-bold underline"
                    >
                      Imposta Attiva
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Nessuna stagione creata finora.</p>
          )}
        </div>
      </div>

      {/* SEZIONE 2: CREA NUOVO GIOCATORE */}
      <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">👤</span>
          <h2 className="font-bebas text-2xl text-slate-100 tracking-wide">AGGIUNGI GIOCATORE</h2>
        </div>

        <form onSubmit={handleCreatePlayer} className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
              Nome e Cognome / Nickname
            </label>
            <input
              type="text"
              placeholder="Es. Mario Rossi"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-[#0b0e14] border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
                Ruolo
              </label>
              <select
                value={playerRole}
                onChange={(e) => setPlayerRole(e.target.value)}
                className="w-full bg-[#0b0e14] border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="POR">Portiere (POR)</option>
                <option value="DIF">Difensore (DIF)</option>
                <option value="CEN">Centrocampista (CEN)</option>
                <option value="ATT">Attaccante (ATT)</option>
                <option value="UNI">Universale (UNI)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
                Overall (Valutazione)
              </label>
              <input
                type="number"
                min="50"
                max="99"
                value={playerOverall}
                onChange={(e) => setPlayerOverall(Number(e.target.value))}
                className="w-full bg-[#0b0e14] border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-lg py-2.5 rounded-xl font-bold transition shadow"
          >
            CREA CARTELLINO GIOCATORE
          </button>
        </form>
      </div>
    </div>
  );
}
