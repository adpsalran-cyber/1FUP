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
  const [activeTab, setActiveTab] = useState<'seasons' | 'polls' | 'players' | 'matchmaker' | 'danger'>('seasons');

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // --- 1. STAGIONI ---
  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);

  // --- 2. SONDAGGIO CONVOCAZIONI ---
  const [pollTitle, setPollTitle] = useState('');
  const [pollDate, setPollDate] = useState('');
  const [creatingPoll, setCreatingPoll] = useState(false);

  // --- 3. CREAZIONE GIOCATORE / DUMMY ---
  const [playerName, setPlayerName] = useState('');
  const [playerRole, setPlayerRole] = useState('ATT');
  const [playerOverall, setPlayerOverall] = useState(70);
  const [isDummy, setIsDummy] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  // --- 4. MATCHMAKER / GENERATORE SQUADRE ---
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [generatingMatch, setGeneratingMatch] = useState(false);

  // --- QUERIES ---
  const { data: seasons } = useQuery({
    queryKey: ['seasons', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: players, refetch: refetchPlayers } = useQuery({
    queryKey: ['players_admin', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('name');
      return data || [];
    },
  });

  const { data: polls, refetch: refetchPolls } = useQuery({
    queryKey: ['polls_admin', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];
      const { data } = await supabase
        .from('match_polls')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // --- AZIONI STAGIONI ---
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim() || !activeLeagueId) return;
    setCreatingSeason(true);
    try {
      await supabase.from('seasons').update({ is_active: false }).eq('league_id', activeLeagueId);
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

  const handleSetActiveSeason = async (seasonId: string) => {
    try {
      await supabase.from('seasons').update({ is_active: false }).eq('league_id', activeLeagueId);
      await supabase.from('seasons').update({ is_active: true }).eq('id', seasonId);
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    }
  };

  // --- AZIONI SONDAGGIO ---
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim() || !activeLeagueId) return;
    setCreatingPoll(true);
    try {
      const { error } = await supabase.from('match_polls').insert({
        league_id: activeLeagueId,
        title: pollTitle.trim(),
        match_date: pollDate ? new Date(pollDate).toISOString() : new Date().toISOString(),
        status: 'open',
      });
      if (error) throw error;
      setPollTitle('');
      setPollDate('');
      refetchPolls();
      alert('Sondaggio convocazioni aperto!');
    } catch (err: any) {
      alert(`Errore sondaggio: ${err.message}`);
    } finally {
      setCreatingPoll(false);
    }
  };

  // --- AZIONI GIOCATORI ---
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !activeLeagueId) return;
    setCreatingPlayer(true);
    try {
      const defaultAttrs = { VEL: 65, TIR: 65, PAS: 65, DRI: 65, DIF: 65, FIS: 65 };
      const { error } = await supabase.from('players').insert({
        league_id: activeLeagueId,
        name: playerName.trim(),
        role: playerRole,
        overall: Number(playerOverall),
        attributes: defaultAttrs,
        is_dummy: isDummy,
        teamwork: 'Medio',
        gk_efficiency: 'Media',
        condition: '0',
      });
      if (error) throw error;
      setPlayerName('');
      setIsDummy(false);
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players_list'] });
      alert(isDummy ? 'Giocatore Fittizio (Bot) aggiunto!' : 'Giocatore aggiunto alla rosa!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setCreatingPlayer(false);
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${name}" dalla lega?`)) return;
    try {
      await supabase.from('players').delete().eq('id', id);
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    }
  };

  // --- GENERATORE SQUADRE (MATCHMAKER) ---
  const togglePlayerSelect = (pId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleGenerateTeams = async (simulateResult: boolean = false) => {
    if (selectedPlayerIds.length < 2) {
      alert('Seleziona almeno 2 o 10 giocatori per formare le squadre!');
      return;
    }

    setGeneratingMatch(true);
    try {
      const convPlayers = (players || []).filter((p: any) => selectedPlayerIds.includes(p.id));
      // Ordina per OVR decrescente
      convPlayers.sort((a: any, b: any) => (b.overall || 70) - (a.overall || 70));

      const team1: any[] = [];
      const team2: any[] = [];

      // Distribuzione a serpente per bilanciare la forza complessiva
      convPlayers.forEach((p: any, idx: number) => {
        if (idx % 2 === 0) team1.push(p);
        else team2.push(p);
      });

      let score1 = 0;
      let score2 = 0;
      let status = 'scheduled';
      let deadline = null;

      if (simulateResult) {
        // Simulazione punteggio casuale
        score1 = Math.floor(Math.random() * 6) + 2;
        score2 = Math.floor(Math.random() * 6) + 2;
        status = 'completed';
        deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      }

      const { data: newMatch, error } = await supabase.from('matches').insert({
        league_id: activeLeagueId,
        team1_players: team1,
        team2_players: team2,
        score_team1: score1,
        score_team2: score2,
        status: status,
        voting_deadline: deadline,
      }).select().single();

      if (error) throw error;

      // Se simulata, aggiorna subito le statistiche
      if (simulateResult) {
        const isDraw = score1 === score2;
        const t1Won = score1 > score2;
        const t2Won = score2 > score1;

        const updateStats = async (plist: any[], won: boolean, draw: boolean) => {
          for (const p of plist) {
            const { data: dbP } = await supabase.from('players').select('matches_played, wins, draws, losses').eq('id', p.id).single();
            if (dbP) {
              await supabase.from('players').update({
                matches_played: (dbP.matches_played || 0) + 1,
                wins: (dbP.wins || 0) + (won ? 1 : 0),
                draws: (dbP.draws || 0) + (draw ? 1 : 0),
                losses: (dbP.losses || 0) + (!won && !draw ? 1 : 0),
              }).eq('id', p.id);
            }
          }
        };

        await updateStats(team1, t1Won, isDraw);
        await updateStats(team2, t2Won, isDraw);
      }

      alert(simulateResult ? `Partita simulata con successo! Punteggio: ${score1} - ${score2}` : 'Partita creata e messa IN PROGRAMMA!');
      setSelectedPlayerIds([]);
      queryClient.invalidateQueries({ queryKey: ['matches_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
    } catch (err: any) {
      alert(`Errore creazione match: ${err.message}`);
    } finally {
      setGeneratingMatch(false);
    }
  };

  // --- RESET DATI ---
  const handleResetMatchesAndStats = async () => {
    if (!confirm('ATTENZIONE: Azzerare tutte le partite e riportare a 0 le statistiche di tutti i giocatori?')) return;
    try {
      await supabase.from('matches').delete().eq('league_id', activeLeagueId);
      await supabase.from('players').update({
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        mvp_count: 0,
      }).eq('league_id', activeLeagueId);

      queryClient.invalidateQueries({ queryKey: ['matches_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
      alert('Statistiche e partite azzerate con successo!');
    } catch (err: any) {
      alert(`Errore reset: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            PANNELLO DI CONTROLLO
          </span>
          <h1 className="font-bebas text-4xl text-white tracking-wider">AMMINISTRAZIONE</h1>
        </div>
      </div>

      {/* Menu Tab Orizzontale a Scorrimento */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bebas">
        <button
          type="button"
          onClick={() => setActiveTab('seasons')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'seasons' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#131926] text-slate-400 hover:text-white'
          }`}
        >
          🏆 STAGIONI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matchmaker')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'matchmaker' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#131926] text-slate-400 hover:text-white'
          }`}
        >
          ⚖️ GENERA PARTITA
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('polls')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'polls' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#131926] text-slate-400 hover:text-white'
          }`}
        >
          🗳️ SONDAGGI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('players')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'players' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#131926] text-slate-400 hover:text-white'
          }`}
        >
          👥 GIOCATORI ({players?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('danger')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'danger' ? 'bg-rose-500 text-white font-bold' : 'bg-[#131926] text-rose-400 hover:bg-rose-950/40'
          }`}
        >
          ⚠️ RESET
        </button>
      </div>

      {/* 1. SEZIONE STAGIONI */}
      {activeTab === 'seasons' && (
        <div className="bg-[#131926] border border-amber-400/30 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="font-bebas text-2xl text-white">GESTIONE STAGIONI</h2>
          <form onSubmit={handleCreateSeason} className="space-y-2">
            <label className="text-[11px] text-slate-400 font-bold uppercase block">
              Nome Nuova Stagione
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Es. Stagione 2026/27"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                className="flex-1 bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                required
              />
              <button
                type="submit"
                disabled={creatingSeason}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm px-4 py-2 rounded-xl font-bold transition"
              >
                {creatingSeason ? 'SALVO...' : 'CREA'}
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Stagioni Esistenti</span>
            {seasons?.map((s: any) => (
              <div key={s.id} className="flex justify-between items-center bg-[#0b0e14] p-2.5 rounded-xl border border-slate-800 text-xs">
                <span className="font-bold text-white">{s.name}</span>
                {s.is_active ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    ATTIVA
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetActiveSeason(s.id)}
                    className="text-amber-400 hover:underline font-bold text-xs"
                  >
                    Attiva
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SEZIONE GENERA PARTITA / SIMULATORE */}
      {activeTab === 'matchmaker' && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="font-bebas text-2xl text-white">BILANCIATORE & SIMULATORE SQUADRE</h2>
            <p className="text-xs text-slate-400">
              Seleziona i giocatori presenti per generare automaticamente due squadre equilibrate in base all'Overall.
            </p>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-amber-400 font-bold">Selezionati: {selectedPlayerIds.length}</span>
            <button
              type="button"
              onClick={() => setSelectedPlayerIds((players || []).map((p: any) => p.id))}
              className="text-slate-400 hover:text-white underline text-[11px]"
            >
              Seleziona tutti
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {players?.map((p: any) => {
              const isSel = selectedPlayerIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePlayerSelect(p.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                    isSel
                      ? 'bg-amber-400/10 border-amber-400 text-white'
                      : 'bg-[#0b0e14] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate font-semibold">{p.name} {p.is_dummy ? '🤖' : ''}</span>
                  <span className="font-mono font-bold text-[10px] ml-1">{p.overall || 70}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={generatingMatch}
              onClick={() => handleGenerateTeams(false)}
              className="py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-xl font-bold transition shadow"
            >
              CREA "IN PROGRAMMA"
            </button>
            <button
              type="button"
              disabled={generatingMatch}
              onClick={() => handleGenerateTeams(true)}
              className="py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bebas text-sm rounded-xl font-bold transition shadow"
            >
              SIMULA RISULTATO ⚡
            </button>
          </div>
        </div>
      )}

      {/* 3. SEZIONE SONDAGGI */}
      {activeTab === 'polls' && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="font-bebas text-2xl text-white">CREA SONDAGGIO CONVOCAZIONI</h2>
          <form onSubmit={handleCreatePoll} className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
                Titolo Partita / Evento
              </label>
              <input
                type="text"
                placeholder="Es. Calcettonata del Giovedì"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
                Data e Ora
              </label>
              <input
                type="datetime-local"
                value={pollDate}
                onChange={(e) => setPollDate(e.target.value)}
                className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={creatingPoll}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-xl font-bold transition shadow"
            >
              {creatingPoll ? 'APERTURA...' : 'APRI SONDAGGIO'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Sondaggi Creati</span>
            {polls?.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center bg-[#0b0e14] p-2.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-white block">{p.title}</span>
                  <span className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === 'open' ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-800'}`}>
                  {p.status === 'open' ? 'APERTO' : 'CHIUSO'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEZIONE GESTIONE GIOCATORI & FITTIZI */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="font-bebas text-2xl text-white">NUOVO GIOCATORE / BOT FITTIZIO</h2>
            <form onSubmit={handleCreatePlayer} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Nome (es. Marco o Bot Difesa)"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={playerRole}
                  onChange={(e) => setPlayerRole(e.target.value)}
                  className="bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs"
                >
                  <option value="POR">Portiere (POR)</option>
                  <option value="DIF">Difensore (DIF)</option>
                  <option value="CEN">Centrocampista (CEN)</option>
                  <option value="ATT">Attaccante (ATT)</option>
                  <option value="UNI">Universale (UNI)</option>
                </select>
                <input
                  type="number"
                  min="50"
                  max="99"
                  value={playerOverall}
                  onChange={(e) => setPlayerOverall(Number(e.target.value))}
                  placeholder="OVR (es. 72)"
                  className="bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Toggle Fittizio / Bot */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDummy}
                  onChange={(e) => setIsDummy(e.target.checked)}
                  className="rounded border-slate-700 text-amber-400"
                />
                <span>Segna come <strong>Giocatore Fittizio / Bot 🤖</strong> (non voterà MVP)</span>
              </label>

              <button
                type="submit"
                disabled={creatingPlayer}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-xl font-bold transition shadow"
              >
                {creatingPlayer ? 'SALVATAGGIO...' : 'AGGIUNGI GIOCATORE'}
              </button>
            </form>
          </div>

          {/* Elenco e Cancellazione Giocatori */}
          <div className="bg-[#131926] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rosa Attuale</span>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {players?.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-[#0b0e14] p-2.5 rounded-xl border border-slate-800/80 text-xs">
                  <div>
                    <span className="font-bold text-white block">
                      {p.name} {p.is_dummy ? '🤖' : ''}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {p.role} • OVR {p.overall || 70}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePlayer(p.id, p.name)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1 bg-rose-950/30 rounded border border-rose-900/40"
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SEZIONE DANGER ZONE / RESET */}
      {activeTab === 'danger' && (
        <div className="bg-[#1a1215] border border-rose-500/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="font-bebas text-2xl text-rose-400">AZIONI PERICOLOSE / RESET</h2>
            <p className="text-xs text-slate-300">
              Permette di riazzerare le partite e le statistiche mantenendo intatti i giocatori registrati.
            </p>
          </div>

          <div className="pt-2 border-t border-rose-950/80">
            <button
              type="button"
              onClick={handleResetMatchesAndStats}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bebas text-base rounded-xl font-bold transition shadow"
            >
              AZZERA TUTTE LE PARTITE E I PUNTEGGI CLASSIFICA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
