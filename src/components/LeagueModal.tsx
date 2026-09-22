import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ARCHETYPES,
  ROLE_DESCRIPTIONS,
  MainRole,
  generateAttributesFromOverall,
  calculateArchetypeOverall,
} from '../lib/engine';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface LeagueModalProps {
  userId: string;
  onLeagueSelected: (leagueId: string, role: string) => void;
}

interface UserLeague {
  league_id: string;
  role: string;
  name: string;
  invite_code: string;
}

export const LeagueModal: React.FC<LeagueModalProps> = ({ userId, onLeagueSelected }) => {
  const [step, setStep] = useState<'league' | 'profile'>('league');
  const [leagueMode, setLeagueMode] = useState<'my_leagues' | 'join' | 'create'>('my_leagues');
  const [myLeagues, setMyLeagues] = useState<UserLeague[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string>('member');

  // Profilo Giocatore (SENZA numero di maglia)
  const [profileMode, setProfileMode] = useState<'create' | 'claim'>('create');
  const [playerName, setPlayerName] = useState('');
  const [preferredFoot, setPreferredFoot] = useState<'Destro' | 'Sinistro' | 'Ambidestro'>('Destro');
  const [selectedRole, setSelectedRole] = useState<MainRole>('ATT');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('ATT_BOMBER');

  // Dummy players per il claim
  const [dummyPlayers, setDummyPlayers] = useState<any[]>([]);
  const [selectedDummyId, setSelectedDummyId] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingLeagues, setFetchingLeagues] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Archetipi disponibili per il ruolo selezionato
  const availableArchetypes = useMemo(() => {
    return Object.values(ARCHETYPES).filter((a) => a.role === selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    fetchUserLeagues();
  }, [userId]);

  const fetchUserLeagues = async () => {
    setFetchingLeagues(true);
    const { data, error: err } = await supabase
      .from('league_members')
      .select('league_id, role, leagues(id, name, invite_code)')
      .eq('user_id', userId);

    if (!err && data) {
      const list: UserLeague[] = data
        .filter((item: any) => item.leagues)
        .map((item: any) => ({
          league_id: item.league_id,
          role: item.role,
          name: item.leagues?.name || 'Lega Senza Nome',
          invite_code: item.leagues?.invite_code || '',
        }));

      setMyLeagues(list);
      setLeagueMode(list.length === 0 ? 'create' : 'my_leagues');
    } else {
      setLeagueMode('create');
    }
    setFetchingLeagues(false);
  };

  const fetchDummies = async (leagueId: string) => {
    const { data: dummies } = await supabase
      .from('players')
      .select('id, name, archetype, role')
      .eq('league_id', leagueId)
      .eq('is_dummy', true);

    if (dummies && dummies.length > 0) {
      setDummyPlayers(dummies);
    }
  };

  const handleSelectExistingLeague = async (league: UserLeague) => {
    setCurrentLeagueId(league.league_id);
    setCurrentRole(league.role);

    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('league_id', league.league_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPlayer) {
      onLeagueSelected(league.league_id, league.role);
    } else {
      await fetchDummies(league.league_id);
      setStep('profile');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLeagueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (leagueMode === 'create') {
        const generatedCode = 'ALCI-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const { data: newLeague, error: createErr } = await supabase
          .from('leagues')
          .insert({ name: leagueName.trim(), invite_code: generatedCode, created_by: userId })
          .select()
          .single();

        if (createErr) throw createErr;

        await supabase.from('league_members').insert({
          league_id: newLeague.id,
          user_id: userId,
          role: 'admin',
        });

        setCurrentLeagueId(newLeague.id);
        setCurrentRole('admin');
        setStep('profile');
      } else if (leagueMode === 'join') {
        const { data: league, error: findErr } = await supabase
          .from('leagues')
          .select('id, name')
          .eq('invite_code', inviteCode.trim().toUpperCase())
          .single();

        if (findErr || !league) throw new Error('Codice lega non valido o inesistente');

        await supabase.from('league_members').upsert({
          league_id: league.id,
          user_id: userId,
          role: 'member',
        });

        setCurrentLeagueId(league.id);
        setCurrentRole('member');
        await fetchDummies(league.id);
        setStep('profile');
      }
    } catch (err: any) {
      setError(err.message || "Errore durante l'operazione");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: MainRole) => {
    setSelectedRole(role);
    const firstArch = Object.values(ARCHETYPES).find((a) => a.role === role);
    if (firstArch) {
      setSelectedArchetype(firstArch.id);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLeagueId) return;
    setError(null);
    setLoading(true);

    try {
      if (profileMode === 'claim' && selectedDummyId) {
        const { error: claimErr } = await supabase.rpc('claim_player', {
          p_player_id: selectedDummyId,
          p_user_id: userId,
        });

        if (claimErr) throw claimErr;
      } else {
        // Base di partenza equilibrata a 70 OVR
        const baseAttrs = generateAttributesFromOverall(selectedArchetype, 70);
        const baseOvr = calculateArchetypeOverall(selectedArchetype, baseAttrs);

        const { error: playerErr } = await supabase.from('players').insert({
          league_id: currentLeagueId,
          user_id: userId,
          name: playerName.trim(),
          preferred_foot: preferredFoot,
          role: selectedRole,
          archetype: selectedArchetype,
          overall: baseOvr,
          attributes: baseAttrs,
          teamwork: 'Medio',
          gk_efficiency: 'Media',
          is_dummy: false,
        });

        if (playerErr) throw playerErr;
      }

      onLeagueSelected(currentLeagueId, currentRole);
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione del profilo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#121721] p-5 shadow-2xl">
        {step === 'league' ? (
          <div>
            <h2 className="mb-1 text-center font-bebas text-3xl tracking-wide text-amber-400">
              HUB DELLE LEGHE
            </h2>
            <p className="mb-5 text-center text-xs text-slate-400">
              Scegli una tua lega, inserisci un codice o fondane una nuova
            </p>

            <div className="mb-5 flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-[11px] font-bold">
              {myLeagues.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setLeagueMode('my_leagues'); setError(null); }}
                  className={`flex-1 rounded-lg py-2 transition uppercase ${
                    leagueMode === 'my_leagues' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
                  }`}
                >
                  Le Mie ({myLeagues.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => { setLeagueMode('create'); setError(null); }}
                className={`flex-1 rounded-lg py-2 transition uppercase ${
                  leagueMode === 'create' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                Crea Lega
              </button>
              <button
                type="button"
                onClick={() => { setLeagueMode('join'); setError(null); }}
                className={`flex-1 rounded-lg py-2 transition uppercase ${
                  leagueMode === 'join' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                Unisciti
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800/50 p-2 text-center text-xs text-red-300">
                {error}
              </div>
            )}

            {leagueMode === 'my_leagues' && (
              <div className="space-y-3">
                {fetchingLeagues ? (
                  <p className="py-6 text-center font-bebas text-amber-400">CARICAMENTO LEGHE...</p>
                ) : myLeagues.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Non fai parte di nessuna lega al momento. Creane una o unisciti tramite codice!
                  </div>
                ) : (
                  myLeagues.map((lg) => (
                    <div
                      key={lg.league_id}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex flex-col gap-2 hover:border-amber-400/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bebas text-xl text-slate-100 tracking-wide block">
                            {lg.name}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-amber-400">
                            Ruolo: {lg.role === 'admin' ? 'Amministratore' : 'Membro'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSelectExistingLeague(lg)}
                          className="rounded-lg bg-amber-400 px-3 py-1.5 font-bebas text-xs tracking-wider text-slate-950 hover:bg-amber-300 transition"
                        >
                          ENTRA
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-[#0b0e14] rounded-lg px-2.5 py-1.5 border border-slate-800 text-xs">
                        <span className="text-[11px] text-slate-400">
                          Codice: <strong className="text-amber-400 font-mono tracking-widest">{lg.invite_code}</strong>
                        </span>
                        <button
                          onClick={() => handleCopyCode(lg.invite_code)}
                          className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded transition"
                        >
                          {copiedCode === lg.invite_code ? 'COPIATO! ✓' : 'COPIA'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {leagueMode !== 'my_leagues' && (
              <form onSubmit={handleLeagueSubmit} className="space-y-4">
                {leagueMode === 'join' ? (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Codice Invito Lega
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ES: ALCI-9X2A"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-center font-mono tracking-widest text-amber-400 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Nome della Lega / Torneo
                    </label>
                    <input
                      type="text"
                      required
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      placeholder="es. Calcetto del Martedì"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-amber-400 py-3 font-bebas text-lg tracking-wider text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
                >
                  {loading
                    ? 'ELABORAZIONE...'
                    : leagueMode === 'join'
                    ? 'UNISCITI ALLA LEGA'
                    : 'CREA E GENERA CODICE INVITO'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <h2 className="mb-1 text-center font-bebas text-3xl tracking-wide text-amber-400">
              SCHEDA CALCIATORE
            </h2>
            <p className="mb-4 text-center text-xs text-slate-400">
              Scegli il tuo stile di gioco per questa lega
            </p>

            {dummyPlayers.length > 0 && (
              <div className="mb-4 flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setProfileMode('create')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase transition ${
                    profileMode === 'create' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
                  }`}
                >
                  Nuovo Profilo
                </button>
                <button
                  type="button"
                  onClick={() => setProfileMode('claim')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase transition ${
                    profileMode === 'claim' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400'
                  }`}
                >
                  Collega Esistente ({dummyPlayers.length})
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800/50 p-2 text-center text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-3.5">
              {profileMode === 'claim' ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                    Seleziona il tuo giocatore pre-caricato
                  </label>
                  <select
                    required
                    value={selectedDummyId}
                    onChange={(e) => setSelectedDummyId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">-- Scegli giocatore pre-caricato dall'Admin --</option>
                    {dummyPlayers.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name} ({dp.role || 'ATT'} - {ARCHETYPES[dp.archetype]?.name || dp.archetype})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                        Nome / Soprannome
                      </label>
                      <input
                        type="text"
                        required
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="es. Salvatore"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                        Piede
                      </label>
                      <select
                        value={preferredFoot}
                        onChange={(e: any) => setPreferredFoot(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="Destro">Destro</option>
                        <option value="Sinistro">Sinistro</option>
                        <option value="Ambidestro">Ambi</option>
                      </select>
                    </div>
                  </div>

                  {/* RUOLO PRINCIPALE */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Ruolo Principale
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(['POR', 'DIF', 'EST', 'UNI', 'ATT'] as MainRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleChange(r)}
                          className={`py-1.5 rounded-lg font-bebas text-sm border transition ${
                            selectedRole === r
                              ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-900/80 text-slate-400 border-slate-800'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 leading-snug">
                      {ROLE_DESCRIPTIONS[selectedRole]}
                    </p>
                  </div>

                  {/* ARCHETIPO & STILE */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Archetipo & Stile
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {availableArchetypes.map((arch) => {
                        const active = selectedArchetype === arch.id;
                        return (
                          <div
                            key={arch.id}
                            onClick={() => setSelectedArchetype(arch.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition ${
                              active
                                ? 'bg-amber-400/10 border-amber-400 ring-1 ring-amber-400/60'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`font-bebas text-base ${active ? 'text-amber-400' : 'text-slate-200'}`}>
                                {arch.name}
                              </span>
                              <span className="text-[10px] font-mono text-amber-300/80 bg-black/40 px-1.5 py-0.5 rounded border border-slate-800">
                                {arch.weightsSummary}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-tight">
                              {arch.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading || (!playerName.trim() && profileMode === 'create')}
                className="mt-2 w-full rounded-xl bg-amber-400 py-3 font-bebas text-lg tracking-wider text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading ? 'SALVATAGGIO...' : 'COMPLETA ED ENTRA IN SQUADRA'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
