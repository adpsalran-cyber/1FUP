import React, { useState, useMemo } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

// Pesi percentuali matematici gestiti esclusivamente dietro le quinte
const ROLE_ARCHETYPES: Record<string, Record<string, Record<string, number>>> = {
  ATTACCANTE: {
    BOMBER: { VEL: 0.15, DRI: 0.10, TIR: 0.35, PAS: 0.10, FIS: 0.20, DIF: 0.10 },
    FANTASISTA: { VEL: 0.15, DRI: 0.25, TIR: 0.20, PAS: 0.25, FIS: 0.05, DIF: 0.10 },
    BOA: { VEL: 0.05, DRI: 0.05, TIR: 0.30, PAS: 0.10, FIS: 0.40, DIF: 0.10 },
    VIRTUOSO: { VEL: 0.20, DRI: 0.25, TIR: 0.25, PAS: 0.15, FIS: 0.05, DIF: 0.10 },
  },
  ESTERNO: {
    FRECCIA: { VEL: 0.35, DRI: 0.20, TIR: 0.15, PAS: 0.10, FIS: 0.10, DIF: 0.10 },
    INCURSORE: { VEL: 0.20, DRI: 0.15, TIR: 0.25, PAS: 0.10, FIS: 0.15, DIF: 0.15 },
    FINALIZZATORE: { VEL: 0.25, DRI: 0.15, TIR: 0.30, PAS: 0.05, FIS: 0.15, DIF: 0.10 },
  },
  UNIVERSAL: {
    JOLLY: { VEL: 0.17, DRI: 0.17, TIR: 0.16, PAS: 0.17, FIS: 0.16, DIF: 0.17 },
    ONNIPRESENTE: { VEL: 0.20, DRI: 0.15, TIR: 0.15, PAS: 0.15, FIS: 0.20, DIF: 0.15 },
    REGISTA: { VEL: 0.10, DRI: 0.15, TIR: 0.15, PAS: 0.35, FIS: 0.10, DIF: 0.15 },
  },
  DIFENSORE: {
    MURO: { VEL: 0.05, DRI: 0.05, TIR: 0.05, PAS: 0.10, FIS: 0.35, DIF: 0.40 },
    TECNICO: { VEL: 0.10, DRI: 0.15, TIR: 0.10, PAS: 0.25, FIS: 0.15, DIF: 0.25 },
    LIBERO: { VEL: 0.15, DRI: 0.10, TIR: 0.05, PAS: 0.15, FIS: 0.20, DIF: 0.35 },
    SUPPORTO: { VEL: 0.15, DRI: 0.15, TIR: 0.10, PAS: 0.25, FIS: 0.10, DIF: 0.25 },
  },
  PORTIERE: {
    SARACINESCA: { RIF: 0.35, POS: 0.25, AGG: 0.10, PAS: 0.05, USC: 0.10, COM: 0.15 },
    LIBERO: { RIF: 0.20, POS: 0.15, AGG: 0.20, PAS: 0.10, USC: 0.25, COM: 0.10 },
    COSTRUTTORE: { RIF: 0.15, POS: 0.15, AGG: 0.10, PAS: 0.35, USC: 0.10, COM: 0.15 },
  },
};

// Descrizioni dello stile di gioco (senza mostrare percentuali)
const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  BOMBER: 'Letale negli ultimi metri, senso della posizione e conclusione potente e precisa.',
  FANTASISTA: 'Creatività pura al servizio della squadra: dribbling, visione di gioco e assist smarcanti.',
  BOA: 'Centravanti di peso che lavora spalle alla porta, difende il pallone e apre varchi ai compagni.',
  VIRTUOSO: 'Agile e imprevedibile palla al piede, salta regolarmente il diretto avversario per finalizzare.',
  FRECCIA: 'Velocità pura e strappi devastanti sulla corsia: eccelle nelle transizioni e nei contropiedi.',
  INCURSORE: 'Attacca costantemente la profondità con inserimenti puntuali senza palla verso l\'area.',
  FINALIZZATORE: 'Esterno votato all\'attacco: taglia verso il centro del campo per andare direttamente al tiro.',
  JOLLY: 'Completo e versatile: garantisce rendimento elevato e affidabile in qualsiasi fase di gioco.',
  ONNIPRESENTE: 'Dinamismo inesauribile: pressa ovunque, raddoppia e recupera palloni da inizio a fine match.',
  REGISTA: 'Il metronomo del gruppo: detta i ritmi, imposta la manovra e fa circolare palla con precisione.',
  MURO: 'Invalicabile nei contrasti e nell\'uno contro uno difensivo: fa della forza fisica il suo punto cardine.',
  TECNICO: 'Difensore abile nel disimpegno e nel possesso: avvia la risalita palla al piede con lucidità.',
  LIBERO: 'Grande intelligenza tattica: legge in anticipo le linee di passaggio avversarie e copre gli spazi.',
  SUPPORTO: 'Difensore propositivo: accompagna la manovra avanzata offrendo sempre una sponda pulita.',
  SARACINESCA: 'Riflessi prodigiosi e posizionamento sicuro tra i pali a protezione dello specchio.',
  LIBERO_POR: 'Portiere reattivo nelle uscite basse e fuori dall\'area: accorcia e copre lo spazio alle spalle della difesa.',
  COSTRUTTORE: 'Abile con i piedi e nella distribuzione del gioco: agisce da costruttore aggiunto della squadra.',
};

// Calcolo matematico della distribuzione attributi partendo dall'OVR
function calculateAttributesFromOvr(role: string, archetype: string, targetOvr: number) {
  const weights = ROLE_ARCHETYPES[role]?.[archetype];
  if (!weights) {
    if (role === 'PORTIERE') {
      return { RIF: targetOvr, POS: targetOvr, AGG: targetOvr, PAS: targetOvr, USC: targetOvr, COM: targetOvr };
    }
    return { VEL: targetOvr, DRI: targetOvr, TIR: targetOvr, PAS: targetOvr, FIS: targetOvr, DIF: targetOvr };
  }

  const totalPoints = targetOvr * 6;
  const result: Record<string, number> = {};

  Object.entries(weights).forEach(([key, weight]) => {
    const rawVal = Math.round(totalPoints * weight);
    result[key] = Math.min(99, Math.max(40, rawVal));
  });

  return result;
}

function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'seasons' | 'polls' | 'players' | 'matchmaker' | 'danger'>('polls');

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // --- 1. STAGIONI ---
  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);

  // --- 2. SONDAGGIO A 6 ORARI ---
  const [pollTitle, setPollTitle] = useState('');
  const [pollDate, setPollDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>([
    '18:30', '19:30', '20:30', '21:00', '21:30', '22:00'
  ]);
  const [creatingPoll, setCreatingPoll] = useState(false);

  // --- 3. CREAZIONE GIOCATORE / DUMMY / ARCHETIPO ---
  const [playerName, setPlayerName] = useState('');
  const [playerRole, setPlayerRole] = useState('ATTACCANTE');
  const [playerArchetype, setPlayerArchetype] = useState('BOMBER');
  const [playerOverall, setPlayerOverall] = useState(70);
  const [isDummy, setIsDummy] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  // Elenco archetipi coerente col ruolo scelto
  const availableArchetypes = useMemo(() => {
    return Object.keys(ROLE_ARCHETYPES[playerRole] || {});
  }, [playerRole]);

  // Gestione cambio ruolo con reset dell'archetipo iniziale
  const handleRoleChange = (newRole: string) => {
    setPlayerRole(newRole);
    const archs = Object.keys(ROLE_ARCHETYPES[newRole] || {});
    if (archs.length > 0) {
      setPlayerArchetype(archs[0]);
    }
  };

  // Descrizione narrativa contestualizzata
  const currentArchetypeDescription = useMemo(() => {
    if (playerRole === 'PORTIERE' && playerArchetype === 'LIBERO') {
      return ARCHETYPE_DESCRIPTIONS['LIBERO_POR'];
    }
    return ARCHETYPE_DESCRIPTIONS[playerArchetype] || 'Stile di gioco caratteristico del ruolo.';
  }, [playerRole, playerArchetype]);

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
        .select('*, poll_options(*)')
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

  // --- AZIONI SONDAGGIO 6 ORARI ---
  const handleSlotChange = (index: number, val: string) => {
    const updated = [...timeSlots];
    updated[index] = val;
    setTimeSlots(updated);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim() || !activeLeagueId) return;
    setCreatingPoll(true);
    try {
      const fullTitle = pollDate ? `${pollTitle.trim()} (${pollDate})` : pollTitle.trim();
      const { data: pollData, error: pollErr } = await supabase
        .from('match_polls')
        .insert({
          league_id: activeLeagueId,
          title: fullTitle,
          status: 'open',
        })
        .select()
        .single();

      if (pollErr) throw pollErr;

      const optionsToInsert = timeSlots
        .filter((slot) => slot.trim() !== '')
        .map((slot, idx) => ({
          poll_id: pollData.id,
          slot_time: slot.trim(),
          slot_order: idx + 1,
        }));

      if (optionsToInsert.length > 0) {
        const { error: optErr } = await supabase.from('poll_options').insert(optionsToInsert);
        if (optErr) throw optErr;
      }

      setPollTitle('');
      setPollDate('');
      refetchPolls();
      alert('Sondaggio con i 6 orari creato con successo!');
    } catch (err: any) {
      alert(`Errore creazione sondaggio: ${err.message}`);
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await supabase.from('match_polls').update({ status: 'closed' }).eq('id', pollId);
      refetchPolls();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    }
  };

  // --- AZIONI GIOCATORI CON DISTRIBUZIONE ATTRIBUTI CALCOLATA ---
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !activeLeagueId) return;
    setCreatingPlayer(true);
    try {
      const computedAttrs = calculateAttributesFromOvr(playerRole, playerArchetype, Number(playerOverall) || 70);

      const { error } = await supabase.from('players').insert({
        league_id: activeLeagueId,
        name: playerName.trim(),
        role: playerRole,
        archetype: playerArchetype,
        overall: Number(playerOverall),
        attributes: computedAttrs,
        is_dummy: isDummy,
        teamwork: 'Medio',
        gk_efficiency: playerRole === 'PORTIERE' ? 'Alta' : 'Media',
        condition: '0',
      });
      if (error) throw error;
      setPlayerName('');
      setIsDummy(false);
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
      alert(isDummy ? '🤖 Giocatore Fittizio (Bot) aggiunto!' : '👤 Cartellino giocatore creato!');
    } catch (err: any) {
      alert(`Errore creazione giocatore: ${err.message}`);
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

  // --- GENERATORE SQUADRE ---
  const togglePlayerSelect = (pId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const handleGenerateTeams = async (simulateResult: boolean = false) => {
    if (selectedPlayerIds.length < 2) {
      alert('Seleziona almeno 2 giocatori per formare le squadre!');
      return;
    }

    setGeneratingMatch(true);
    try {
      const convPlayers = (players || []).filter((p: any) => selectedPlayerIds.includes(p.id));
      convPlayers.sort((a: any, b: any) => (b.overall || 70) - (a.overall || 70));

      const team1: any[] = [];
      const team2: any[] = [];

      convPlayers.forEach((p: any, idx: number) => {
        if (idx % 2 === 0) team1.push(p);
        else team2.push(p);
      });

      let score1 = 0;
      let score2 = 0;
      let status = 'scheduled';
      let deadline = null;

      if (simulateResult) {
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

      alert(simulateResult ? `Partita simulata! Risultato: ${score1} - ${score2}` : 'Partita creata e messa "IN PROGRAMMA"!');
      setSelectedPlayerIds([]);
      queryClient.invalidateQueries({ queryKey: ['matches_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
    } catch (err: any) {
      alert(`Errore creazione match: ${err.message}`);
    } finally {
      setGeneratingMatch(false);
    }
  };

  // --- RESET ---
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
      alert('Statistiche e partite azzerate!');
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

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bebas">
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
          onClick={() => setActiveTab('matchmaker')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'matchmaker' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#131926] text-slate-400 hover:text-white'
          }`}
        >
          ⚖️ GENERA PARTITA
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
          onClick={() => setActiveTab('seasons')}
          className={`px-3 py-2 rounded-xl whitespace-nowrap tracking-wider transition ${
            activeTab === 'seasons' ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#131926] text-slate-400 hover:text-white'
          }`}
        >
          🏆 STAGIONI
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

      {/* 1. SEZIONE SONDAGGI CON 6 ORARI */}
      {activeTab === 'polls' && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="font-bebas text-2xl text-white">CREA SONDAGGIO PARTITA</h2>
            <p className="text-xs text-slate-400">
              Imposta il titolo e fino a 6 slot orari selezionabili dai giocatori.
            </p>
          </div>

          <form onSubmit={handleCreatePoll} className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
                Titolo Partita / Evento
              </label>
              <input
                type="text"
                placeholder="Es. Calcettonata Infrasettimanale"
                value={pollTitle}
                onChange={(e) => setPollTitle(e.target.value)}
                className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">
                Giorno Proposto
              </label>
              <input
                type="date"
                value={pollDate}
                onChange={(e) => setPollDate(e.target.value)}
                className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-amber-400 font-bold uppercase block">
                6 Orari Selezionabili (Personalizza)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-mono w-3">{index + 1}.</span>
                    <input
                      type="text"
                      value={slot}
                      onChange={(e) => handleSlotChange(index, e.target.value)}
                      placeholder="es. 20:30"
                      className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs text-center font-mono focus:border-amber-400 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingPoll}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-xl font-bold transition shadow mt-2"
            >
              {creatingPoll ? 'APERTURA...' : 'APRI SONDAGGIO (6 ORARI)'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Sondaggi Creati</span>
            {polls && polls.length > 0 ? (
              polls.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center bg-[#0b0e14] p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="font-bold text-white block">{p.title}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.poll_options?.map((opt: any) => (
                        <span key={opt.id} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                          {opt.slot_time}
                        </span>
                      ))}
                    </div>
                  </div>
                  {p.status === 'open' ? (
                    <button
                      type="button"
                      onClick={() => handleClosePoll(p.id)}
                      className="px-2 py-1 bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded text-[10px] font-bold"
                    >
                      Chiudi
                    </button>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Chiuso</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">Nessun sondaggio attivo.</p>
            )}
          </div>
        </div>
      )}

      {/* 2. SEZIONE GENERA PARTITA / SIMULATORE */}
      {activeTab === 'matchmaker' && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="font-bebas text-2xl text-white">BILANCIATORE & SIMULATORE SQUADRE</h2>
            <p className="text-xs text-slate-400">
              Seleziona i giocatori presenti per generare due squadre bilanciate per Overall.
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

      {/* 3. SEZIONE GESTIONE GIOCATORI & BOT (CON ARCHETIPI NARRATIVI) */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="font-bebas text-2xl text-white">NUOVO GIOCATORE / BOT FITTIZIO</h2>
            <form onSubmit={handleCreatePlayer} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase block mb-1">Nome o Nickname</label>
                <input
                  type="text"
                  placeholder="Es. Marco o Bot Difesa"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Ruolo</label>
                  <select
                    value={playerRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-2 py-2 text-xs"
                  >
                    <option value="ATTACCANTE">ATTACCANTE</option>
                    <option value="ESTERNO">ESTERNO</option>
                    <option value="UNIVERSAL">UNIVERSAL</option>
                    <option value="DIFENSORE">DIFENSORE</option>
                    <option value="PORTIERE">PORTIERE</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Archetipo</label>
                  <select
                    value={playerArchetype}
                    onChange={(e) => setPlayerArchetype(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-2 py-2 text-xs"
                  >
                    {availableArchetypes.map((arch) => (
                      <option key={arch} value={arch}>{arch}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Overall</label>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={playerOverall}
                    onChange={(e) => setPlayerOverall(Number(e.target.value))}
                    placeholder="OVR (70)"
                    className="w-full bg-[#0b0e14] border border-slate-700 text-white rounded-xl px-2 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Riquadro descrittivo dello stile (nessuna percentuale visibile) */}
              <div className="p-3 bg-[#0b0e14] border border-slate-800 rounded-xl">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Stile: {playerArchetype}
                </span>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "{currentArchetypeDescription}"
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDummy}
                  onChange={(e) => setIsDummy(e.target.checked)}
                  className="rounded border-slate-700 text-amber-400"
                />
                <span>Segna come <strong>Giocatore Fittizio / Bot 🤖</strong></span>
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
                      {p.role} • {p.archetype || 'Equilibrato'} • OVR {p.overall || 70}
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

      {/* 4. SEZIONE STAGIONI */}
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
