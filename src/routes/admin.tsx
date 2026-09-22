import React, { useState, useMemo } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase } from '../lib/actions';
import { 
  ARCHETYPES, 
  MainRole, 
  calculateArchetypeOverall, 
  generateAttributesFromOverall 
} from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();

  const [leagueId, setLeagueId] = useState<string>(
    typeof window !== 'undefined' 
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id') || ''
      : ''
  );

  useQuery({
    queryKey: ['admin_active_league'],
    queryFn: async () => {
      if (leagueId) return leagueId;
      const { data } = await supabase.from('leagues').select('id').limit(1).maybeSingle();
      if (data?.id) {
        setLeagueId(data.id);
        localStorage.setItem('alci_league_id', data.id);
        localStorage.setItem('active_league_id', data.id);
        return data.id;
      }
      return '';
    },
  });

  const activeLeagueId = leagueId;

  // --- STATI FORM FITTIZIO (Senza numero di maglia) ---
  const [dummyName, setDummyName] = useState('');
  const [dummyRole, setDummyRole] = useState<MainRole>('ATT');
  const [dummyArchetype, setDummyArchetype] = useState('ATT_BOMBER');
  const [dummyTargetOvr, setDummyTargetOvr] = useState(70);

  // --- STATI MODIFICA GIOCATORE (MODALE) ---
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [editOvrInput, setEditOvrInput] = useState<number>(70);
  const [editArchetype, setEditArchetype] = useState<string>('ATT_BOMBER');
  const [editAttributes, setEditAttributes] = useState<Record<string, number>>({});
  const [editTeamwork, setEditTeamwork] = useState<string>('Medio');
  const [editGkEfficiency, setEditGkEfficiency] = useState<string>('Media');

  // --- STATI SONDAGGIO (Data + fino a 6 slot orari + auto-creazione) ---
  const [targetDate, setTargetDate] = useState('');
  const [pollTitle, setPollTitle] = useState('Partita di Calcetto');
  const [timeSlots, setTimeSlots] = useState<string[]>([
    '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ]);
  const [autoCreateMatch, setAutoCreateMatch] = useState(false);

  const handleTimeSlotChange = (index: number, value: string) => {
    const updated = [...timeSlots];
    updated[index] = value;
    setTimeSlots(updated);
  };

  const addTimeSlot = () => {
    if (timeSlots.length < 6) {
      setTimeSlots([...timeSlots, '20:00']);
    }
  };

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  // --- STATI EXTRA ---
  const [batchCount, setBatchCount] = useState(5);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  // 1. Query Rosa Giocatori
  const { data: players, refetch: refetchPlayers } = useQuery({
    queryKey: ['players', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('players').select('*');
      if (activeLeagueId && activeLeagueId !== '00000000-0000-0000-0000-000000000001') {
        query = query.or(`league_id.eq.${activeLeagueId},league_id.is.null`);
      }
      const { data, error } = await query.order('is_dummy', { ascending: true }).order('name');
      if (error) return [];
      return data || [];
    },
  });

  // 2. Apertura Modale Modifica Giocatore
  const openEditModal = (player: any) => {
    const archKey = player.archetype || 'ATT_BOMBER';
    const attrs = player.attributes || generateAttributesFromOverall(archKey, player.overall || 70);
    const calculatedOvr = calculateArchetypeOverall(archKey, attrs);

    setEditingPlayer(player);
    setEditArchetype(archKey);
    setEditAttributes(attrs);
    setEditOvrInput(calculatedOvr);
    setEditTeamwork(player.teamwork || 'Medio');
    setEditGkEfficiency(player.gk_efficiency || 'Media');
  };

  const handleEditOvrChange = (newTarget: number) => {
    const target = Math.max(40, Math.min(99, newTarget));
    const newAttrs = generateAttributesFromOverall(editArchetype, target);
    const finalCalculated = calculateArchetypeOverall(editArchetype, newAttrs);
    setEditAttributes(newAttrs);
    setEditOvrInput(finalCalculated);
  };

  const handleSingleStatChange = (statKey: string, val: number) => {
    const clampedVal = Math.max(40, Math.min(99, val));
    const updated = { ...editAttributes, [statKey]: clampedVal };
    setEditAttributes(updated);
    const newOvr = calculateArchetypeOverall(editArchetype, updated);
    setEditOvrInput(newOvr);
  };

  const handleEditArchetypeChange = (newArchKey: string) => {
    setEditArchetype(newArchKey);
    const newAttrs = generateAttributesFromOverall(newArchKey, editOvrInput);
    setEditAttributes(newAttrs);
  };

  // 3. Salvataggio Modifiche Giocatore
  const updatePlayerMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlayer) return;
      const finalRole = ARCHETYPES[editArchetype]?.role || 'ATT';
      const finalOvr = calculateArchetypeOverall(editArchetype, editAttributes);

      const { error } = await supabase
        .from('players')
        .update({
          role: finalRole,
          archetype: editArchetype,
          overall: finalOvr,
          attributes: editAttributes,
          teamwork: editTeamwork,
          gk_efficiency: editGkEfficiency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPlayer.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Dati giocatore aggiornati con successo!');
      setEditingPlayer(null);
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: (err: any) => alert(`Errore aggiornamento: ${err.message}`),
  });

  // 4. Creazione Giocatore Fittizio
  const addDummyMutation = useMutation({
    mutationFn: async () => {
      if (!dummyName.trim()) throw new Error('Inserisci un nome');

      let targetLeagueId = activeLeagueId;
      if (!targetLeagueId || targetLeagueId === '00000000-0000-0000-0000-000000000001') {
        const { data: firstLeague } = await supabase.from('leagues').select('id').limit(1).maybeSingle();
        if (firstLeague?.id) targetLeagueId = firstLeague.id;
      }

      const generatedAttrs = generateAttributesFromOverall(dummyArchetype, dummyTargetOvr);
      const computedOvr = calculateArchetypeOverall(dummyArchetype, generatedAttrs);

      const { error } = await supabase.from('players').insert({
        league_id: targetLeagueId || null,
        name: dummyName.trim(),
        role: dummyRole,
        archetype: dummyArchetype,
        overall: computedOvr,
        attributes: generatedAttrs,
        teamwork: 'Medio',
        gk_efficiency: 'Media',
        is_dummy: true,
        user_id: null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert(`Giocatore "${dummyName}" creato con successo!`);
      setDummyName('');
      setDummyTargetOvr(70);
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: (err: any) => alert(`Errore: ${err.message}`),
  });

  // 5. Rimuovi Giocatore
  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Giocatore rimosso dalla lega!');
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: (err: any) => alert(`Errore eliminazione: ${err.message}`),
  });

  // 6. Sondaggio Partita (con supporto fino a 6 slot orari + auto-creazione partita)
  const createPollMutation = useMutation({
    mutationFn: async () => {
      if (!targetDate) throw new Error('Seleziona una data per la partita');
      
      const validSlots = timeSlots.map(s => s.trim()).filter(Boolean);
      if (validSlots.length === 0) throw new Error('Inserisci almeno un orario valido');

      let targetLeagueId = activeLeagueId;
      if (!targetLeagueId || targetLeagueId === '00000000-0000-0000-0000-000000000001') {
        const { data: firstLeague } = await supabase.from('leagues').select('id').limit(1).maybeSingle();
        if (firstLeague?.id) targetLeagueId = firstLeague.id;
      }

      const { data, error } = await supabase
        .from('polls')
        .insert({
          league_id: targetLeagueId || null,
          title: pollTitle.trim(),
          target_date: targetDate,
          time_slots: validSlots,
          auto_create_match: autoCreateMatch,
          is_closed: false,
        })
        .select();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      alert('Sondaggio creato con successo!');
      queryClient.invalidateQueries({ queryKey: queryKeys.polls(activeLeagueId) });
      setTargetDate('');
      setAutoCreateMatch(false);
    },
    onError: (err: any) => {
      alert(`Errore creazione sondaggio: ${err.message}`);
    },
  });

  // 7. Simulazione Partite
  const simulateMatchesMutation = useMutation({
    mutationFn: async (count: number) => {
      const matches = [];
      for (let i = 0; i < count; i++) {
        matches.push({
          league_id: activeLeagueId || null,
          match_date: new Date(Date.now() - i * 86400000).toISOString(),
          home_score: Math.floor(Math.random() * 8) + 2,
          away_score: Math.floor(Math.random() * 8) + 2,
          is_simulated: true,
        });
      }
      const { error } = await supabase.from('matches').insert(matches);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, count) => {
      alert(`${count} partite simulate!`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    },
  });

  // 8. Reset Lega
  const resetLeagueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_league_data', {
        target_league_id: activeLeagueId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Tutti i dati azzerati con successo!');
      setShowResetModal(false);
      setResetConfirmInput('');
      queryClient.invalidateQueries();
    },
  });

  const dummyAvailableArchetypes = useMemo(() => {
    return Object.values(ARCHETYPES).filter((a) => a.role === dummyRole);
  }, [dummyRole]);

  return (
    <div className="p-4 space-y-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="border-b border-[#222c42] pb-3">
        <h1 className="font-bebas text-3xl text-slate-100">PANNELLO ADMIN</h1>
        <p className="text-xs text-slate-400">
          Gestione rosa, archetipi, valori ponderati, sondaggi e simulazioni
        </p>
      </div>

      {/* SEZIONE 1: CREA GIOCATORE FITTIZIO */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-amber-400">+ AGGIUNGI GIOCATORE</h2>
        <div className="space-y-3 text-xs">
          <input
            type="text"
            placeholder="Nome / Soprannome"
            value={dummyName}
            onChange={(e) => setDummyName(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-slate-100 font-semibold"
          />

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Ruolo</label>
            <div className="grid grid-cols-5 gap-1">
              {(['POR', 'DIF', 'EST', 'UNI', 'ATT'] as MainRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setDummyRole(r);
                    const first = Object.values(ARCHETYPES).find((a) => a.role === r);
                    if (first) setDummyArchetype(first.id);
                  }}
                  className={`py-1.5 rounded-lg font-bebas text-sm border transition ${
                    dummyRole === r
                      ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                      : 'bg-[#0b0e14] text-slate-300 border-[#222c42]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Archetipo</label>
            <select
              value={dummyArchetype}
              onChange={(e) => setDummyArchetype(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-slate-100"
            >
              {dummyAvailableArchetypes.map((arch) => (
                <option key={arch.id} value={arch.id}>
                  {arch.name} ({arch.weightsSummary})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Overall Iniziale</label>
              <span className="font-bebas text-lg text-amber-400">{dummyTargetOvr}</span>
            </div>
            <input
              type="range"
              min="45"
              max="95"
              value={dummyTargetOvr}
              onChange={(e) => setDummyTargetOvr(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        <button
          disabled={!dummyName.trim() || addDummyMutation.isPending}
          onClick={() => addDummyMutation.mutate()}
          className="w-full py-2.5 bg-amber-400 text-slate-950 font-bebas text-lg rounded-xl disabled:opacity-40 font-bold transition shadow-md"
        >
          {addDummyMutation.isPending ? 'Salvataggio...' : 'CREA PROFILO'}
        </button>
      </div>

      {/* SEZIONE 2: ROSA & MODIFICA STATISTICHE */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bebas text-xl text-cyan-400">ROSA & VALORI ({players?.length || 0})</h2>
          <button onClick={() => refetchPlayers()} className="text-xs text-slate-400 underline">Aggiorna</button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {players && players.length > 0 ? (
            players.map((p: any) => {
              const currentOvr = p.overall || 70;
              const archDef = ARCHETYPES[p.archetype];
              return (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-xl text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm truncate">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        {currentOvr} OVR
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{archDef ? archDef.name : p.archetype || 'Base'}</span>
                      <span>•</span>
                      <span>{p.role || 'ATT'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(p)}
                      className="px-2.5 py-1.5 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-300 transition"
                    >
                      Modifica
                    </button>
                    <button
                      disabled={deletePlayerMutation.isPending}
                      onClick={() => {
                        if (confirm(`Rimuovere definitivamente ${p.name}?`)) {
                          deletePlayerMutation.mutate(p.id);
                        }
                      }}
                      className="px-2 py-1.5 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-lg hover:bg-rose-900"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500 italic">Nessun giocatore registrato.</p>
          )}
        </div>
      </div>

      {/* MODALE ADMIN: MODIFICA COMPLETA STATS */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-[#151b28] border border-[#222c42] rounded-2xl max-w-md w-full p-5 space-y-4 my-auto shadow-2xl">
            <div className="flex justify-between items-start border-b border-[#222c42] pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  MODIFICA VALORI & ARCHETIPO
                </span>
                <h3 className="font-bebas text-2xl text-slate-100">{editingPlayer.name}</h3>
              </div>
              <button
                onClick={() => setEditingPlayer(null)}
                className="w-7 h-7 rounded-full bg-[#0b0e14] text-slate-400 flex items-center justify-center hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Archetipo Calcolo Ponderato
              </label>
              <select
                value={editArchetype}
                onChange={(e) => handleEditArchetypeChange(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-xs text-slate-100"
              >
                {Object.values(ARCHETYPES).map((arch) => (
                  <option key={arch.id} value={arch.id}>
                    [{arch.role}] {arch.name} — {arch.weightsSummary}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#222c42] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300">OVERALL CALCOLATO</span>
                <span className="font-bebas text-3xl text-amber-400">{editOvrInput}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Imposta un nuovo Overall base per ridistribuire tutte le statistiche, oppure ritocca le singole stats sotto.
              </p>
              <input
                type="range"
                min="45"
                max="96"
                value={editOvrInput}
                onChange={(e) => handleEditOvrChange(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                Rifinitura Singole Statistiche
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(ARCHETYPES[editArchetype]?.weights || {}).map(([stat, weight]) => {
                  const val = editAttributes[stat] ?? 70;
                  return (
                    <div key={stat} className="bg-[#0b0e14] p-2 rounded-lg border border-[#222c42]">
                      <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                        <span className="text-slate-300">{stat} ({Math.round(weight * 100)}%)</span>
                        <span className="text-amber-400 font-mono">{val}</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="99"
                        value={val}
                        onChange={(e) => handleSingleStatChange(stat, Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Gioco di Squadra
                </label>
                <div className="flex gap-1">
                  {['Basso', 'Medio', 'Alto'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEditTeamwork(lvl)}
                      className={`flex-1 py-1 rounded text-[11px] font-bold border transition ${
                        editTeamwork === lvl
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-[#0b0e14] text-slate-400 border-[#222c42]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Efficacia Portiere
                </label>
                <div className="flex gap-1">
                  {['Bassa', 'Media', 'Alta'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEditGkEfficiency(lvl)}
                      className={`flex-1 py-1 rounded text-[11px] font-bold border transition ${
                        editGkEfficiency === lvl
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-[#0b0e14] text-slate-400 border-[#222c42]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#222c42]">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="flex-1 py-2.5 bg-[#0b0e14] hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={updatePlayerMutation.isPending}
                onClick={() => updatePlayerMutation.mutate()}
                className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-lg rounded-xl font-bold transition shadow-md"
              >
                {updatePlayerMutation.isPending ? 'Salvataggio...' : 'SALVA STATS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE 3: SONDAGGIO PARTITA CON ORARI + AUTO-CREAZIONE */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-lime-400">NUOVO SONDAGGIO PARTITA</h2>
        
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
            Data Partita
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-sm text-slate-100"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-bold uppercase text-slate-400">
              Orari Proposti (Max 6)
            </label>
            {timeSlots.length < 6 && (
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-[11px] font-bold text-lime-400 hover:underline"
              >
                + Aggiungi Orario
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-1 bg-[#0b0e14] border border-[#222c42] rounded-lg p-1.5">
                <input
                  type="time"
                  value={slot}
                  onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                  className="bg-transparent text-slate-100 text-xs w-full focus:outline-none"
                />
                {timeSlots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(index)}
                    className="text-rose-400 px-1 font-bold text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SWITCH: CREA PARTITA IN AUTOMATICO A 10 VOTI */}
        <div className="flex items-center justify-between p-3 bg-[#0b0e14] border border-[#222c42] rounded-xl my-2">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              Crea partita automatica a 10 voti
            </span>
            <span className="text-[10px] text-slate-400">
              Genera e bilancia l'evento appena si raggiungono 10 confermati
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoCreateMatch}
            onChange={(e) => setAutoCreateMatch(e.target.checked)}
            className="w-4 h-4 accent-lime-400 cursor-pointer"
          />
        </div>

        <button
          disabled={!targetDate || createPollMutation.isPending}
          onClick={() => createPollMutation.mutate()}
          className="w-full py-2.5 bg-lime-400 text-slate-950 font-bebas text-lg rounded-xl font-bold disabled:opacity-40 transition shadow-md"
        >
          {createPollMutation.isPending ? 'Creazione in corso...' : 'APRI SONDAGGIO'}
        </button>
      </div>

      {/* SEZIONE 4: SIMULATORE PARTITE */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-sky-400">SIMULATORE PARTITE</h2>
        <div className="flex gap-2">
          <button
            disabled={simulateMatchesMutation.isPending}
            onClick={() => simulateMatchesMutation.mutate(1)}
            className="flex-1 py-2 bg-sky-500 text-black font-bebas text-lg rounded-xl"
          >
            {simulateMatchesMutation.isPending ? 'Simulo...' : 'SIMULA 1 PARTITA'}
          </button>
          <div className="flex gap-1 items-center">
            <input
              type="number"
              min="2"
              max="50"
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="w-14 bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-center text-sm text-slate-100"
            />
            <button
              disabled={simulateMatchesMutation.isPending}
              onClick={() => simulateMatchesMutation.mutate(batchCount)}
              className="py-2 px-3 bg-indigo-600 text-white font-bebas text-lg rounded-xl"
            >
              SIMULA SERIE
            </button>
          </div>
        </div>
      </div>

      {/* SEZIONE 5: RESET LEGA */}
      <div className="bg-rose-950/30 border border-rose-800/80 p-4 rounded-xl space-y-2">
        <h2 className="font-bebas text-xl text-rose-400">ZONA PERICOLO: RESET RISULTATI</h2>
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bebas text-lg rounded-xl shadow-lg transition"
        >
          RESET TOTALE RISULTATI LEGA
        </button>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#151b28] border border-rose-600 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bebas text-2xl text-rose-500">ATTENZIONE: CONFERMA RESET</h3>
            <input
              type="text"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              placeholder="Scrivi RESET per confermare"
              className="w-full bg-[#0b0e14] border border-rose-500 rounded-lg p-2.5 text-center text-sm text-slate-100 uppercase font-bold"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 bg-[#222c42] text-slate-300 rounded-lg text-xs"
              >
                Annulla
              </button>
              <button
                disabled={resetConfirmInput !== 'RESET' || resetLeagueMutation.isPending}
                onClick={() => resetLeagueMutation.mutate()}
                className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bebas text-base disabled:opacity-30"
              >
                CONFERMA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
