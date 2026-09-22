import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();

  // Recupera la lega salvata o la prima lega reale dell'utente
  const [leagueId, setLeagueId] = useState<string>(
    typeof window !== 'undefined' 
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id') || ''
      : ''
  );

  // Se non c'è nel localStorage, recupera l'ID reale della prima lega disponibile su Supabase
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


  // State Sondaggi & Modifiche Carte (esistenti)
  const [targetDate, setTargetDate] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [cardModifier, setCardModifier] = useState<number>(1);

  // State Aggiunta Giocatore Fittizio
  const [dummyName, setDummyName] = useState('');
  const [dummyNumber, setDummyNumber] = useState(10);
  const [dummyPosition, setDummyPosition] = useState('Attaccante');
  const [dummyFoot, setDummyFoot] = useState('Destro');
  const [dummyArchetype, setDummyArchetype] = useState('Bomber d Area');

  // State Simulatore Partite
  const [batchCount, setBatchCount] = useState(5);

  // State Modale Reset
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  // 1. Query Membri / Giocatori della lega
  const { data: players, refetch: refetchPlayers } = useQuery({
    queryKey: ['players', activeLeagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('is_dummy', { ascending: true })
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  // Query legacy per compatibilità con i sondaggi
  const { data: members } = useQuery({
    queryKey: queryKeys.members(activeLeagueId),
    queryFn: async () => {
      const { data } = await supabase
        .from('league_members')
        .select('id, profiles(nickname)')
        .eq('league_id', activeLeagueId);
      return data || [];
    },
  });

  // 2. Creazione Sondaggio
  const createPollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('polls')
        .insert({
          league_id: activeLeagueId,
          target_date: targetDate,
          is_closed: false,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Sondaggio creato con successo!');
      queryClient.invalidateQueries({ queryKey: queryKeys.polls(activeLeagueId) });
      setTargetDate('');
    },
  });

  // 3. Modificatore Carta
  const cardModifierMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('rpc_apply_card_modifier', {
        p_member_id: selectedMember,
        p_delta: cardModifier,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Statistiche aggiornate!');
      queryClient.invalidateQueries({ queryKey: queryKeys.members(activeLeagueId) });
    },
  });

  // 4. Inserimento Giocatore Fittizio
  const addDummyMutation = useMutation({
    mutationFn: async () => {
      if (!dummyName.trim()) throw new Error('Inserisci un nome');
      const { error } = await supabase.from('players').insert({
        league_id: activeLeagueId,
        name: dummyName.trim(),
        number: Number(dummyNumber),
        position: dummyPosition,
        preferred_foot: dummyFoot,
        archetype: dummyArchetype,
        is_dummy: true,
        user_id: null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert(`Giocatore fittizio "${dummyName}" creato con successo!`);
      setDummyName('');
      refetchPlayers();
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: (err: any) => alert(`Errore: ${err.message}`),
  });

  // 5. Rimuovi / Espelli Giocatore
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

  // 6. Simulatore Partite
  const simulateMatchesMutation = useMutation({
    mutationFn: async (count: number) => {
      const matches = [];
      for (let i = 0; i < count; i++) {
        matches.push({
          league_id: activeLeagueId,
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
      alert(`${count} ${count === 1 ? 'partita simulata' : 'partite simulate'} con successo!`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    },
    onError: (err: any) => alert(`Errore simulazione: ${err.message}`),
  });

  // 7. Reset Totale Risultati
  const resetLeagueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_league_data', {
        target_league_id: activeLeagueId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Tutti i risultati, match e statistiche sono stati azzerati con successo!');
      setShowResetModal(false);
      setResetConfirmInput('');
      queryClient.invalidateQueries();
    },
    onError: (err: any) => alert(`Errore nel reset: ${err.message}`),
  });

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-[#222c42] pb-3">
        <h1 className="font-bebas text-3xl text-slate-100">PANNELLO ADMIN</h1>
        <p className="text-xs text-slate-400">
          Gestione rosa, giocatori fittizi, simulazioni e reset di lega
        </p>
      </div>

      {/* SEZIONE 1: CREA GIOCATORE FITTIZIO */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-amber-400">+ AGGIUNGI GIOCATORE FITTIZIO</h2>
        <p className="text-xs text-slate-400">
          Crea i compagni che non usano l'app: potranno riscattare il profilo appena si registrano.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input
            type="text"
            placeholder="Nome / Soprannome"
            value={dummyName}
            onChange={(e) => setDummyName(e.target.value)}
            className="col-span-2 bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-slate-100"
          />
          <input
            type="number"
            placeholder="N° Maglia"
            value={dummyNumber}
            onChange={(e) => setDummyNumber(Number(e.target.value))}
            className="bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-slate-100"
          />
          <select
            value={dummyPosition}
            onChange={(e) => setDummyPosition(e.target.value)}
            className="bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-slate-100"
          >
            <option value="Portiere">Portiere</option>
            <option value="Difensore">Difensore</option>
            <option value="Centrocampista">Centrocampista</option>
            <option value="Attaccante">Attaccante</option>
          </select>
          <select
            value={dummyFoot}
            onChange={(e) => setDummyFoot(e.target.value)}
            className="bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-slate-100"
          >
            <option value="Destro">Destro</option>
            <option value="Sinistro">Sinistro</option>
            <option value="Ambidestro">Ambidestro</option>
          </select>
          <input
            type="text"
            placeholder="Archetipo (es. Bomber d Area)"
            value={dummyArchetype}
            onChange={(e) => setDummyArchetype(e.target.value)}
            className="bg-[#0b0e14] border border-[#222c42] rounded-lg p-2 text-slate-100"
          />
        </div>
        <button
          disabled={!dummyName || addDummyMutation.isPending}
          onClick={() => addDummyMutation.mutate()}
          className="w-full py-2.5 bg-amber-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
        >
          {addDummyMutation.isPending ? 'Salvataggio...' : 'CREA PROFILO FITTIZIO'}
        </button>
      </div>

      {/* SEZIONE 2: GESTIONE ROSA & ESPULSIONI */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bebas text-xl text-cyan-400">ROSA GIOCATORI ({players?.length || 0})</h2>
          <button onClick={() => refetchPlayers()} className="text-xs text-slate-400 underline">Aggiorna</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {players && players.length > 0 ? (
            players.map((p: any) => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-lg text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200 mr-1.5">#{p.number} {p.name}</span>
                  <span className="text-slate-500">({p.position})</span>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      p.is_dummy ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'
                    }`}
                  >
                    {p.is_dummy ? 'Fittizio' : 'Reale'}
                  </span>
                </div>
                <button
                  disabled={deletePlayerMutation.isPending}
                  onClick={() => {
                    if (confirm(`Confermi di voler rimuovere ${p.name} dalla lega?`)) {
                      deletePlayerMutation.mutate(p.id);
                    }
                  }}
                  className="px-2 py-1 bg-rose-950 border border-rose-800 text-rose-300 rounded font-semibold hover:bg-rose-900"
                >
                  Rimuovi
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">Nessun giocatore registrato in questa lega.</p>
          )}
        </div>
      </div>

      {/* SEZIONE 3: SIMULATORE PARTITE */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-sky-400">SIMULATORE PARTITE</h2>
        <p className="text-xs text-slate-400">
          Genera partite casuali per testare la classifica e le statistiche dei giocatori.
        </p>
        <div className="flex gap-2">
          <button
            disabled={simulateMatchesMutation.isPending}
            onClick={() => simulateMatchesMutation.mutate(1)}
            className="flex-1 py-2 bg-sky-500 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
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
              className="py-2 px-3 bg-indigo-600 text-white font-bebas text-lg rounded-xl disabled:opacity-50"
            >
              SIMULA SERIE
            </button>
          </div>
        </div>
      </div>

      {/* SEZIONE 4: NUOVO SONDAGGIO PARTITA */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-lime-400">NUOVO SONDAGGIO PARTITA</h2>
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Data Partita</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-sm text-slate-100"
          />
        </div>
        <button
          disabled={!targetDate || createPollMutation.isPending}
          onClick={() => createPollMutation.mutate()}
          className="w-full py-2.5 bg-lime-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
        >
          {createPollMutation.isPending ? 'Creazione...' : 'APRI SONDAGGIO'}
        </button>
      </div>

      {/* SEZIONE 5: CARD MODIFIER */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-amber-400">CARD UPDATE (AGGIORNA STATS)</h2>
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Giocatore</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-xs text-slate-100"
          >
            <option value="">-- Seleziona Membro --</option>
            {members?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.profiles?.nickname || 'Membro'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Delta Attributi</label>
          <div className="flex gap-2">
            {[-2, -1, 1, 2].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCardModifier(val)}
                className={`flex-1 py-1.5 rounded-lg font-bebas text-lg border ${
                  cardModifier === val ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#0b0e14] text-slate-300 border-[#222c42]'
                }`}
              >
                {val > 0 ? `+${val}` : val}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={!selectedMember || cardModifierMutation.isPending}
          onClick={() => cardModifierMutation.mutate()}
          className="w-full py-2.5 bg-amber-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
        >
          APPLICA MODIFICATORE CARTA
        </button>
      </div>

      {/* SEZIONE 6: ZONA PERICOLO - RESET LEGA */}
      <div className="bg-rose-950/30 border border-rose-800/80 p-4 rounded-xl space-y-2">
        <h2 className="font-bebas text-xl text-rose-400">ZONA PERICOLO: RESET RISULTATI</h2>
        <p className="text-xs text-rose-300/80">
          Cancella tutte le partite giocate o simulate della lega e azzera le classifiche. I giocatori registrati non saranno eliminati.
        </p>
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bebas text-lg rounded-xl shadow-lg transition"
        >
          RESET TOTALE RISULTATI LEGA
        </button>
      </div>

      {/* MODAL CONFERMA RESET */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#151b28] border border-rose-600 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bebas text-2xl text-rose-500">ATTENZIONE: CONFERMA RESET</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Questa azione cancellerà permanentemente tutti i match e azzererà la classifica.
              Per procedere scrivi <strong className="text-rose-400">RESET</strong> qui sotto:
            </p>
            <input
              type="text"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              placeholder="Scrivi RESET per confermare"
              className="w-full bg-[#0b0e14] border border-rose-500 rounded-lg p-2.5 text-center text-sm text-slate-100 uppercase font-bold tracking-widest"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmInput('');
                }}
                className="flex-1 py-2 bg-[#222c42] text-slate-300 rounded-lg text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                disabled={resetConfirmInput !== 'RESET' || resetLeagueMutation.isPending}
                onClick={() => resetLeagueMutation.mutate()}
                className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-bebas text-base disabled:opacity-30 disabled:cursor-not-allowed hover:bg-rose-500"
              >
                {resetLeagueMutation.isPending ? 'Azzeramento...' : 'CONFERMA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
