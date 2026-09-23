import React, { useState, useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';
import { ARCHETYPES } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  const userRole = typeof window !== 'undefined'
    ? localStorage.getItem('alci_user_role') || 'member'
    : 'member';

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Ottieni l'utente autenticato
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // 2. Cerca il cartellino giocatore associato all'ID utente
        let playerQuery = supabase
          .from('players')
          .select('*')
          .eq('user_id', user.id);

        if (activeLeagueId) {
          playerQuery = playerQuery.eq('league_id', activeLeagueId);
        }

        const { data: pData } = await playerQuery.maybeSingle();

        if (pData) {
          setMyPlayer(pData);
        } else {
          // Se non trova per user_id, controlla tutti i giocatori della lega
          let allQuery = supabase.from('players').select('*');
          if (activeLeagueId) {
            allQuery = allQuery.eq('league_id', activeLeagueId);
          }
          const { data: allList } = await allQuery.order('name');
          
          // Se un giocatore ha lo stesso nome dell'utente, auto-collega
          const userName = user.user_metadata?.name || user.user_metadata?.full_name;
          const matchByName = userName 
            ? (allList || []).find((p: any) => p.name.toLowerCase() === userName.toLowerCase())
            : null;

          if (matchByName) {
            await supabase.from('players').update({ user_id: user.id }).eq('id', matchByName.id);
            setMyPlayer({ ...matchByName, user_id: user.id });
          } else {
            // Mostra come disponibili i giocatori senza user_id o tutti quelli della lega
            const unlinked = (allList || []).filter((p: any) => !p.user_id);
            setAvailablePlayers(unlinked.length > 0 ? unlinked : (allList || []));
          }
        }
      }
    } catch (err) {
      console.error('Errore caricamento profilo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeLeagueId]);

  const handleLinkPlayer = async (playerId: string) => {
    if (!currentUser?.id) return;
    setLinking(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ user_id: currentUser.id, is_dummy: false })
        .eq('id', playerId);

      if (error) throw error;
      alert('Cartellino collegato con successo!');
      await loadData();
    } catch (err: any) {
      alert(`Errore collegamento: ${err.message}`);
    } finally {
      setLinking(false);
    }
  };

  const archDef = myPlayer ? ARCHETYPES[myPlayer.archetype] : null;

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* Box Informazioni Account */}
      <div className="bg-[#121721] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              ACCOUNT UTENTE
            </span>
            <h1 className="font-bebas text-3xl text-slate-100">PROFILO</h1>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-1 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase">
            {userRole === 'admin' ? 'Admin' : 'Giocatore'}
          </span>
        </div>

        <div className="bg-[#0b0e14] border border-[#222c42] p-3 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Email:</span>
            <span className="font-mono text-slate-200 font-medium truncate max-w-[200px]">
              {currentUser?.email || 'Nessuna email trovata'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nome Utente:</span>
            <span className="font-semibold text-slate-100">
              {myPlayer?.name ||
                currentUser?.user_metadata?.name ||
                currentUser?.email?.split('@')[0] ||
                'Ospite'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">ID Utente:</span>
            <span className="font-mono text-[10px] text-slate-400">
              {currentUser?.id ? `${currentUser.id.slice(0, 12)}...` : 'Non autenticato'}
            </span>
          </div>
        </div>
      </div>

      {/* Stato Caricamento */}
      {loading && (
        <div className="text-center py-6 text-amber-400 font-bebas text-lg tracking-wider animate-pulse">
          CARICAMENTO CARTELLINO...
        </div>
      )}

      {/* CASO 1: Cartellino collegato con successo */}
      {!loading && myPlayer && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              La Tua Carta Ufficiale
            </span>
            <span className="text-[10px] text-lime-400 font-bold bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded">
              COLLEGATO ✓
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-[#1e273a] via-[#121721] to-[#0b0e14] p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bebas text-6xl text-amber-400 leading-none block">
                  {myPlayer.overall || 70}
                </span>
                <span className="font-bebas text-2xl text-slate-200 tracking-wider">
                  {myPlayer.role || 'ATT'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                  ARCHETIPO
                </span>
                <span className="font-bebas text-lg text-lime-400">
                  {archDef ? archDef.name : myPlayer.archetype || 'Universale'}
                </span>
              </div>
            </div>

            <div className="text-center py-2 border-y border-slate-800">
              <h2 className="font-bebas text-3xl text-slate-100 tracking-wide uppercase">
                {myPlayer.name}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {archDef?.weightsSummary || 'Valori Bilanciati'}
              </span>
            </div>

            {/* Statistiche esagono/attributi */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {myPlayer.attributes &&
                Object.entries(myPlayer.attributes).map(([stat, val]: any) => (
                  <div key={stat} className="bg-[#0b0e14]/80 border border-slate-800 p-2 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {stat}
                    </span>
                    <span className="font-bebas text-2xl text-amber-300 font-bold">{val}</span>
                  </div>
                ))}
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Intesa: <strong className="text-slate-200">{myPlayer.teamwork || 'Medio'}</strong></span>
              <span>In Porta: <strong className="text-slate-200">{myPlayer.gk_efficiency || 'Media'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* CASO 2: Nessun cartellino associato -> Seleziona e collega */}
      {!loading && !myPlayer && (
        <div className="bg-[#121721] border border-amber-400/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
              CARTELLINO NON COLLEGATO
            </span>
            <h2 className="font-bebas text-2xl text-slate-100 mt-2">COLLEGA LA TUA CARTA</h2>
            <p className="text-xs text-slate-400">
              Seleziona il tuo nome dalla lista sotto per collegare la scheda del giocatore al tuo profilo:
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {availablePlayers.length > 0 ? (
              availablePlayers.map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-100 block text-sm">{p.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {p.role} • OVR {p.overall}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={linking}
                    onClick={() => {
                      if (confirm(`Confermi di voler collegare "${p.name}" al tuo account?`)) {
                        handleLinkPlayer(p.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold transition shadow"
                  >
                    COLLEGA
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Nessun cartellino disponibile in questa lega.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
