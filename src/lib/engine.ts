export type MainRole = 'ATT' | 'DIF' | 'EST' | 'UNI' | 'POR';

export interface FieldAttributes {
  vel: number;
  dri: number;
  tir: number;
  pas: number;
  fis: number;
  dif: number;
}

export interface GkAttributes {
  rif: number;
  pos: number;
  agg: number;
  pas: number;
  usc: number;
  com: number;
}

export type PlayerAttributes = FieldAttributes | GkAttributes | any;

export interface ArchetypeDef {
  id: string;
  name: string;
  role: MainRole;
  description: string;
  weights: Record<string, number>;
  weightsSummary: string;
}

export const ARCHETYPES: Record<string, ArchetypeDef> = {
  // ATTACCANTI
  ATT_BOMBER: {
    id: 'ATT_BOMBER',
    name: 'Bomber',
    role: 'ATT',
    description: 'Letale negli ultimi metri, tiro immediato e istinto del gol.',
    weights: { tir: 0.35, fis: 0.20, vel: 0.15, pas: 0.10, dif: 0.10, dri: 0.10 },
    weightsSummary: 'TIR 35% • FIS 20% • VEL 15%',
  },
  ATT_FANTASISTA: {
    id: 'ATT_FANTASISTA',
    name: 'Fantasista',
    role: 'ATT',
    description: 'Visione di gioco sopraffina, assist illuminanti e controllo nello stretto.',
    weights: { dri: 0.25, pas: 0.25, tir: 0.20, vel: 0.15, dif: 0.10, fis: 0.05 },
    weightsSummary: 'DRI 25% • PAS 25% • TIR 20%',
  },
  ATT_BOA: {
    id: 'ATT_BOA',
    name: 'Boa',
    role: 'ATT',
    description: 'Difesa palla col corpo, fa salire la squadra e si gira di potenza.',
    weights: { fis: 0.40, tir: 0.30, pas: 0.10, dif: 0.10, vel: 0.05, dri: 0.05 },
    weightsSummary: 'FIS 40% • TIR 30% • DIF 10%',
  },
  ATT_VIRTUOSO: {
    id: 'ATT_VIRTUOSO',
    name: 'Virtuoso',
    role: 'ATT',
    description: 'Dribbling costante, giocate di suola e superiorità numerica.',
    weights: { dri: 0.35, tir: 0.20, vel: 0.15, pas: 0.15, dif: 0.10, fis: 0.05 },
    weightsSummary: 'DRI 35% • TIR 20% • VEL 15%',
  },

  // ESTERNI
  EST_FRECCIA: {
    id: 'EST_FRECCIA',
    name: 'Freccia',
    role: 'EST',
    description: 'Allunghi in campo aperto e ripartenze micidiali palla al piede.',
    weights: { vel: 0.35, dri: 0.20, tir: 0.15, pas: 0.10, fis: 0.10, dif: 0.10 },
    weightsSummary: 'VEL 35% • DRI 20% • TIR 15%',
  },
  EST_INCURSORE: {
    id: 'EST_INCURSORE',
    name: 'Incursore',
    role: 'EST',
    description: 'Tagli profondi senza palla e inserimenti puntuali sul secondo palo.',
    weights: { tir: 0.25, vel: 0.20, fis: 0.15, dif: 0.15, dri: 0.15, pas: 0.10 },
    weightsSummary: 'TIR 25% • VEL 20% • FIS 15%',
  },
  EST_FINALIZZATORE: {
    id: 'EST_FINALIZZATORE',
    name: 'Finalizzatore',
    role: 'EST',
    description: 'Converge al centro dalla fascia per scaricare conclusioni potenti.',
    weights: { tir: 0.30, vel: 0.25, fis: 0.15, dri: 0.15, dif: 0.10, pas: 0.05 },
    weightsSummary: 'TIR 30% • VEL 25% • FIS 15%',
  },

  // UNIVERSALI
  UNI_JOLLY: {
    id: 'UNI_JOLLY',
    name: 'Jolly',
    role: 'UNI',
    description: 'Completo ed essenziale: copre ogni zona senza punti deboli.',
    weights: { vel: 0.17, dri: 0.17, pas: 0.17, dif: 0.17, tir: 0.16, fis: 0.16 },
    weightsSummary: 'Bilanciato 16-17%',
  },
  UNI_ONNIPRESENTE: {
    id: 'UNI_ONNIPRESENTE',
    name: 'Onnipresente',
    role: 'UNI',
    description: 'Resistenza inesauribile, pressing asfissiante e transizioni continue.',
    weights: { vel: 0.20, fis: 0.20, dif: 0.20, tir: 0.15, pas: 0.15, dri: 0.10 },
    weightsSummary: 'VEL 20% • FIS 20% • DIF 20%',
  },
  UNI_REGISTA: {
    id: 'UNI_REGISTA',
    name: 'Regista',
    role: 'UNI',
    description: 'Metronomo: pulizia nei passaggi e gestione lucida del possesso.',
    weights: { pas: 0.35, dif: 0.20, dri: 0.15, vel: 0.10, tir: 0.10, fis: 0.10 },
    weightsSummary: 'PAS 35% • DIF 20% • DRI 15%',
  },

  // DIFENSORI
  DIF_MURO: {
    id: 'DIF_MURO',
    name: 'Muro',
    role: 'DIF',
    description: 'Contrasti duri, respinta fisica sui tiri e marcatura implacabile.',
    weights: { dif: 0.40, fis: 0.35, pas: 0.10, vel: 0.05, dri: 0.05, tir: 0.05 },
    weightsSummary: 'DIF 40% • FIS 35% • PAS 10%',
  },
  DIF_TECNICO: {
    id: 'DIF_TECNICO',
    name: 'Tecnico',
    role: 'DIF',
    description: 'Recupero palla pulito e costruzione lucida della manovra dal basso.',
    weights: { pas: 0.25, dif: 0.25, dri: 0.15, fis: 0.15, vel: 0.10, tir: 0.10 },
    weightsSummary: 'PAS 25% • DIF 25% • FIS 15%',
  },
  DIF_LIBERO: {
    id: 'DIF_LIBERO',
    name: 'Libero',
    role: 'DIF',
    description: 'Lettura anticipata delle traiettorie, diagonali e chiusure sicure.',
    weights: { dif: 0.35, pas: 0.20, vel: 0.15, fis: 0.15, dri: 0.10, tir: 0.05 },
    weightsSummary: 'DIF 35% • PAS 20% • FIS 15%',
  },
  DIF_SUPPORTO: {
    id: 'DIF_SUPPORTO',
    name: 'Supporto',
    role: 'DIF',
    description: 'Solido dietro e sempre pronto ad accompagnare l’azione per lo scarico.',
    weights: { pas: 0.25, dif: 0.25, vel: 0.15, dri: 0.15, fis: 0.10, tir: 0.10 },
    weightsSummary: 'PAS 25% • DIF 25% • VEL 15%',
  },

  // PORTIERI
  POR_MURO: {
    id: 'POR_MURO',
    name: 'Muro',
    role: 'POR',
    description: 'Parate d’istinto, riflessi ravvicinati e piazzamento impeccabile.',
    weights: { rif: 0.35, pos: 0.25, com: 0.15, agg: 0.10, usc: 0.10, pas: 0.05 },
    weightsSummary: 'RIF 35% • POS 25% • COM 15%',
  },
  POR_LIBERO: {
    id: 'POR_LIBERO',
    name: 'Libero',
    role: 'POR',
    description: 'Attento fuori dai pali, scivolate sui filtranti e chiusure aggressive.',
    weights: { usc: 0.25, rif: 0.20, agg: 0.20, pos: 0.15, pas: 0.10, com: 0.10 },
    weightsSummary: 'USC 25% • RIF 20% • AGG 20%',
  },
  POR_COSTRUTTORE: {
    id: 'POR_COSTRUTTORE',
    name: 'Costruttore',
    role: 'POR',
    description: 'Gestione eccellente del pallone con piedi e mani, ideale per 5vs4.',
    weights: { pas: 0.35, rif: 0.15, pos: 0.15, com: 0.15, usc: 0.10, agg: 0.10 },
    weightsSummary: 'PAS 35% • RIF 15% • POS 15%',
  },
};

export const ROLE_DESCRIPTIONS: Record<MainRole, string> = {
  POR: 'Reattività tra i pali, uscite nell’1vs1 e gestione del ritmo dal fondo.',
  DIF: 'Chiusure difensive, senso della posizione e pulizia nell’uscita palla.',
  EST: 'Corsa continua lungo la banda, 1vs1 in velocità e ripiegamenti rapidi.',
  UNI: 'Duttilità totale: garantisce equilibrio, difende con ordine e supporta l’attacco.',
  ATT: 'Terminale offensivo: protezione palla spalle alla porta e finalizzazione.',
};

/**
 * Calcola l'Overall ponderato a partire dalle statistiche e dall'archetipo
 */
export function calculateArchetypeOverall(archetypeKey: string, attrs: Record<string, number>): number {
  const arch = ARCHETYPES[archetypeKey];
  if (!arch || !attrs) return 70;

  let weightedSum = 0;
  for (const [key, weight] of Object.entries(arch.weights)) {
    const val = attrs[key] ?? 70;
    weightedSum += val * weight;
  }
  return Math.round(weightedSum);
}

/**
 * Genera le 6 statistiche proporzionate partendo dall'Overall target dell'admin
 */
export function generateAttributesFromOverall(archetypeKey: string, targetOverall: number): Record<string, number> {
  const arch = ARCHETYPES[archetypeKey] || ARCHETYPES.ATT_BOMBER;
  const target = Math.max(40, Math.min(99, targetOverall));
  const result: Record<string, number> = {};

  // Media pesi ideale: 1 / numero di attributi = ~0.166
  const baseWeight = 1 / Object.keys(arch.weights).length;

  for (const [stat, weight] of Object.entries(arch.weights)) {
    // Statistiche con peso superiore alla media ricevono un boost proporzionale
    // Statistiche secondarie ricevono una riduzione controllata
    const diffRatio = (weight - baseWeight) / baseWeight;
    const offset = Math.round(diffRatio * 18); // escursione tra -12 e +14 punti
    result[stat] = Math.max(40, Math.min(99, target + offset));
  }

  // Micro-bilanciamento finale per far coincidere esattamente la media ponderata
  let currentOvr = calculateArchetypeOverall(archetypeKey, result);
  let attempts = 0;
  while (currentOvr !== target && attempts < 10) {
    const diff = target - currentOvr;
    const highestStat = Object.keys(arch.weights).reduce((a, b) => (arch.weights[a] > arch.weights[b] ? a : b));
    result[highestStat] = Math.max(40, Math.min(99, result[highestStat] + (diff > 0 ? 1 : -1)));
    currentOvr = calculateArchetypeOverall(archetypeKey, result);
    attempts++;
  }

  return result;
}
// Tipi e funzioni per la classifica (richiesti da standings.tsx)
export interface PlayerInput {
  id: string;
  name: string;
  avatar_url?: string | null;
  overall: number;
  matches_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goals?: number;
  assists?: number;
  mvp_count?: number;
  points?: number;
  form_trend?: number[];
  [key: string]: any;
}

export function calculateOfficialStandings(players: PlayerInput[] = []): PlayerInput[] {
  return [...players].sort((a, b) => {
    const ptsA = (a.wins || 0) * 3 + (a.draws || 0);
    const ptsB = (b.wins || 0) * 3 + (b.draws || 0);
    if (ptsB !== ptsA) return ptsB - ptsA;
    if ((b.goals || 0) !== (a.goals || 0)) return (b.goals || 0) - (a.goals || 0);
    return (b.overall || 0) - (a.overall || 0);
  });
}

export function calculateGeneralStandings(players: PlayerInput[] = []): PlayerInput[] {
  return calculateOfficialStandings(players);
}
export function calculateDynamicOverall(player: any): number {
  if (!player) return 70;
  
  // Se ha un archetipo definito e gli attributi, calcola l'overall ponderato
  if (player.archetype && player.attributes) {
    const baseOvr = calculateArchetypeOverall(player.archetype, player.attributes);
    const formBonus = (player.current_form ?? 0);
    return Math.max(40, Math.min(99, baseOvr + formBonus));
  }

  // Fallback sull'overall memorizzato o su 70
  const baseOvr = player.overall ?? 70;
  const formBonus = (player.current_form ?? 0);
  return Math.max(40, Math.min(99, baseOvr + formBonus));
}
export interface TeamParticipant {
  id: string | null;
  name: string;
  role: string;
  overall: number;
  isGuest: boolean;
}

export interface BalancedTeamsResult {
  teamA: TeamParticipant[];
  teamB: TeamParticipant[];
  avgA: number;
  avgB: number;
}

/**
 * Algoritmo modulare di bilanciamento squadre.
 * Modificabile in futuro per intesa ruoli, portieri e storico.
 */
export function balanceTeams(participants: TeamParticipant[]): BalancedTeamsResult {
  const sorted = [...participants].sort((a, b) => b.overall - a.overall);

  const teamA: TeamParticipant[] = [];
  const teamB: TeamParticipant[] = [];

  // Distribuzione a serpente (Snake Draft: 1, 4, 5, 8, 9 vs 2, 3, 6, 7, 10)
  const snakePattern = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1];

  sorted.forEach((p, idx) => {
    if (snakePattern[idx] === 0) {
      teamA.push(p);
    } else {
      teamB.push(p);
    }
  });

  const sumA = teamA.reduce((acc, p) => acc + (p.overall || 65), 0);
  const sumB = teamB.reduce((acc, p) => acc + (p.overall || 65), 0);

  return {
    teamA,
    teamB,
    avgA: teamA.length ? Math.round((sumA / teamA.length) * 10) / 10 : 0,
    avgB: teamB.length ? Math.round((sumB / teamB.length) * 10) / 10 : 0,
  };
}
