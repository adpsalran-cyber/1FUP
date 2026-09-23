import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/actions';
import { PlayerCard } from '../routes/players';

interface ProfileViewProps {
  onClose?: () => void;
}

export function ProfileView({ onClose }: ProfileViewProps) {
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
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
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
          let allQuery = supabase.from('players').select('*');
          if (activeLeagueId) {
            allQuery = allQuery.eq('league_id', activeLeagueId);
          }
          const { data: allList } = await allQuery.order('name');

          const userName = user.user_metadata?.name || user.user_metadata?.full_name;
          const matchByName = userName
            ? (allList || []).find((p: any) => p.name.toLowerCase() === userName.toLowerCase())
            : null;

          if (matchByName) {
            await supabase.from('players').update({ user_id: user.id }).eq('id', matchByName.id);
            setMyPlayer({ ...matchByName, user_id: user.id });
          } else {
            const unlinked = (allList || []).filter((p: any) => !p.user_id);
            setAvailablePlayers(unlinked.length > 0 ? unlinked : (allList || []));
          }
        }
      }
    } catch (err) {
      console.error('Errore profilo:', err);
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

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* Box Account Utente */}
      <div className="bg-[#131926] border border-[#1e2738] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex justify-between items-center border-b border-[#1e2738] pb-2">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              ACCOUNT PERSONALE
            </span>
            <h1 className="font-bebas text-3xl text-slate-100">PROFILO</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
              {userRole === 'admin' ? 'Admin' : 'Giocatore'}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#0b0e14] text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#0b0e14] border border-[#1e2738] p-3 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Email:</span>
            <span className="font-mono text-slate-200 font-medium truncate max-w-[200px]">
              {currentUser?.email || 'Nessuna email'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nome:</span>
            <span className="font-semibold text-slate-100">
              {myPlayer?.name ||
                currentUser?.user_metadata?.name ||
                currentUser?.email?.split('@')[0] ||
                'Ospite'}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-6 text-amber-400 font-bebas text-lg tracking-wider animate-pulse">
          CARICAMENTO CARTELLINO...
        </div>
      )}

      {/* Carta Giocatore Collegata: STESSO IDENTICO STILE SENZA BORDI DORATI */}
      {!loading && myPlayer && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              La Tua Carta Ufficiale
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
              COLLEGATO ✓
            </span>
          </div>

          <PlayerCard player={myPlayer} />
        </div>
      )}

      {/* Selezione Cartellino Libero */}
      {!loading && !myPlayer && (
        <div className="bg-[#131926] border border-[#1e2738] rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
              CARTELLINO NON COLLEGATO
            </span>
            <h2 className="font-bebas text-2xl text-slate-100 mt-2">COLLEGA LA TUA CARTA</h2>
            <p className="text-xs text-slate-400">
              Seleziona il tuo nome per associare il cartellino a questo account:
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {availablePlayers.length > 0 ? (
              availablePlayers.map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-[#0b0e14] border border-[#1e2738] p-2.5 rounded-xl text-xs"
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
