import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface LeagueModalProps {
  userId: string;
  onLeagueSelected: (leagueId: string, role: string) => void;
}

const ARCHETYPES = {
  Portiere: ['Saracinesca', 'Portiere Volante', 'Reattivo'],
  Difensore: ['Muro Fisico', 'Impostatore', 'Laterale Difensivo'],
  Centrocampista: ['Regista Totale', 'Mediano Incursore', 'Metronomo'],
  Attaccante: ['Bomber d\'Area', 'Boa / Sponda', 'Falso Nueve', 'Folletto Rapido'],
};

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

  // Profilo Giocatore
  const [profileMode, setProfileMode] = useState<'create' | 'claim'>('create');
  const [playerName, setPlayerName] = useState('');
  const [number, setNumber] = useState('10');
  const [preferredFoot, setPreferredFoot] = useState<'Destro' | 'Sinistro' | 'Ambidestro'>('Destro');
  const [position, setPosition] = useState<'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante'>('Attaccante');
  const [archetype, setArchetype] = useState('Bomber d\'Area');

  // Dummy players per il claim
  const [dummyPlayers, setDummyPlayers] = useState<any[]>([]);
  const [selectedDummyId, setSelectedDummyId] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingLeagues, setFetchingLeagues] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carica le leghe a cui l'utente appartiene già
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
      if (list.length === 0) {
        setLeagueMode('create');
      } else {
        setLeagueMode('my_leagues');
      }
    } else {
      setLeagueMode('create');
    }
    setFetchingLeagues(false);
  };

  const fetchDummies = async (leagueId: string) => {
    const { data: dummies } = await supabase
      .from('players')
      .select('id, name, number, archetype, position')
      .eq('league_id', leagueId)
      .eq('is_dummy', true);

    if (dummies && dummies.length > 0) {
      setDummyPlayers(dummies);
    }
  };

  // Selezione di una lega esistente dall'elenco "Le mie leghe"
  const handleSelectExistingLeague = async (league: UserLeague) => {
    setCurrentLeagueId(league.league_id);
    setCurrentRole(league.role);

    // Controlla se ha già una carta giocatore per questa lega
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

  // Creazione o join lega
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
      setError(err.message || 'Errore durante l\'operazione');
    } finally {
      setLoading(false);
    }
  };

  // Gestione profilo calciatore
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
        const { error: playerErr } = await supabase.from('players').insert({
          league_id: currentLeagueId,
          user_id: userId,
          name: playerName.trim(),
          number: parseInt(number, 10) || 10,
          preferred_foot: preferredFoot,
          position,
          archetype,
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
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#121721] p-6 shadow-2xl">
        {step === 'league' ? (
          <div>
            <h2 className="mb-1 text-center font-bebas text-3xl tracking-wide text-amber-400">
              HUB DELLE LEGHE
            </h2>
            <p className="mb-5 text-center text-xs text-slate-400">
              Scegli una tua lega, inserisci un codice o fondane una nuova
            </p>

            {/* Menu modalità a 3 Tab */}
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

            {/* TAB 1: LISTA DELLE MIE LEGHE ESISTENTI */}
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

                      {/* Box Codice Invito */}
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

            {/* TAB 2 & 3: FORM CREAZIONE O INGRESSO CON CODICE */}
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
              Configura la tua carta per la lega selezionata
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
                    Seleziona il tuo giocatore
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
                        #{dp.number || '10'} {dp.name} ({dp.position} - {dp.archetype})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Nome / Soprannome
                    </label>
                    <input
                      type="text"
                      required
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="es. Salvatore"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                        N° Maglia
                      </label>
                      <input
                        type="number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                        Piede Preferito
                      </label>
                      <select
                        value={preferredFoot}
                        onChange={(e: any) => setPreferredFoot(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="Destro">Destro</option>
                        <option value="Sinistro">Sinistro</option>
                        <option value="Ambidestro">Ambidestro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Ruolo Principale
                    </label>
                    <select
                      value={position}
                      onChange={(e: any) => {
                        const newPos = e.target.value;
                        setPosition(newPos);
                        setArchetype(ARCHETYPES[newPos as keyof typeof ARCHETYPES][0]);
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="Portiere">Portiere</option>
                      <option value="Difensore">Difensore</option>
                      <option value="Centrocampista">Centrocampista</option>
                      <option value="Attaccante">Attaccante</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-400">
                      Archetipo / Stile di Gioco
                    </label>
                    <select
                      value={archetype}
                      onChange={(e) => setArchetype(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-amber-300 focus:border-amber-400 focus:outline-none"
                    >
                      {ARCHETYPES[position].map((arch) => (
                        <option key={arch} value={arch}>
                          {arch}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
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
