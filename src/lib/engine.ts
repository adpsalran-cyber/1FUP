export type PlayerRole = 'ATT' | 'EST' | 'UNI' | 'DIF' | 'POR';
export type FormStatus = 'UP' | 'STABLE' | 'DOWN';

export interface PlayerAttributesMovement {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface PlayerAttributesGK {
  rif: number;
  pos: number;
  agg: number;
  pas: number;
  usc: number;
  com: number;
}

export interface PlayerInput {
  id: string;
  nickname: string;
  role: PlayerRole;
  isEligible: boolean;
  isGuest: boolean;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  mvpCount: number;
  consecutiveAbsences: number;
  currentFormModifier: number;
  attributes: PlayerAttributesMovement | PlayerAttributesGK;
}

export interface OfficialStandingRow {
  position: number;
  playerId: string;
  nickname: string;
  role: PlayerRole;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  mvpCount: number;
  basePoints: number;
  participationBonus: number;
  absenceMalus: number;
  realPoints: number;
  pointsPerMatch: number;
}

export interface GeneralStandingRow {
  position: number;
  playerId: string;
  nickname: string;
  role: PlayerRole;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  mvpCount: number;
  totalPoints: number;
}

export interface MatchPlayerPerformance {
  playerId: string;
  isGuest: boolean;
  isMvp: boolean;
  averageGrade: number;
}

export interface FormCalculationResult {
  playerId: string;
  previousForm: number;
  newForm: number;
  status: FormStatus;
  reason: string;
}

export function calculateLeagueAverageAppearances(players: PlayerInput[]): number {
  const eligible = players.filter(p => !p.isGuest && p.isEligible && p.matchesPlayed >= 1);
  if (eligible.length === 0) return 0;
  const totalAppearances = eligible.reduce((acc, p) => acc + p.matchesPlayed, 0);
  return Math.round(totalAppearances / eligible.length);
}

export function calculateOfficialStandings(
  players: PlayerInput[],
  mvpPointValue: number = 1.0
): OfficialStandingRow[] {
  const eligible = players.filter(p => !p.isGuest && p.isEligible && p.matchesPlayed >= 1);
  if (eligible.length === 0) return [];

  const leagueAvgAppearances = calculateLeagueAverageAppearances(players);

  const calculated = eligible.map(player => {
    const basePoints = (player.wins * 3) + (player.draws * 1) + (player.losses * 0) + (player.mvpCount * mvpPointValue);
    const participationBonus = player.matchesPlayed * 1.0;
    const missingAppearances = Math.max(0, leagueAvgAppearances - player.matchesPlayed);
    const absenceMalus = -(missingAppearances * 0.5);
    const realPoints = basePoints + participationBonus + absenceMalus;
    const pointsPerMatch = player.matchesPlayed > 0 ? Number((realPoints / player.matchesPlayed).toFixed(2)) : 0;

    return {
      playerId: player.id,
      nickname: player.nickname,
      role: player.role,
      matchesPlayed: player.matchesPlayed,
      wins: player.wins,
      draws: player.draws,
      losses: player.losses,
      mvpCount: player.mvpCount,
      basePoints,
      participationBonus,
      absenceMalus,
      realPoints,
      pointsPerMatch,
    };
  });

  calculated.sort((a, b) => {
    if (b.pointsPerMatch !== a.pointsPerMatch) return b.pointsPerMatch - a.pointsPerMatch;
    if (b.realPoints !== a.realPoints) return b.realPoints - a.realPoints;
    return b.wins - a.wins;
  });

  return calculated.map((row, index) => ({
    position: index + 1,
    ...row,
  }));
}

export function calculateGeneralStandings(
  players: PlayerInput[],
  mvpPointValue: number = 1.0
): GeneralStandingRow[] {
  const activePlayers = players.filter(p => !p.isGuest);

  const calculated = activePlayers.map(p => {
    const totalPoints = (p.wins * 3) + (p.draws * 1) + (p.mvpCount * mvpPointValue);
    return {
      playerId: p.id,
      nickname: p.nickname,
      role: p.role,
      matchesPlayed: p.matchesPlayed,
      wins: p.wins,
      draws: p.draws,
      losses: p.losses,
      mvpCount: p.mvpCount,
      totalPoints,
    };
  });

  calculated.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.matchesPlayed - a.matchesPlayed;
  });

  return calculated.map((row, index) => ({
    position: index + 1,
    ...row,
  }));
}

export function getFormStatus(formValue: number): FormStatus {
  if (formValue > 0) return 'UP';
  if (formValue < 0) return 'DOWN';
  return 'STABLE';
}

export function calculateDynamicOverall(
  attributes: PlayerAttributesMovement | PlayerAttributesGK,
  wins: number,
  draws: number,
  losses: number
): number {
  const values = Object.values(attributes);
  const technicalAverage = values.reduce((sum, v) => sum + v, 0) / values.length;
  const totalMatches = wins + draws + losses;
  let performancePpmScale = technicalAverage;

  if (totalMatches > 0) {
    const rawPpm = ((wins * 3) + (draws * 1)) / totalMatches;
    performancePpmScale = (rawPpm / 3) * 99;
  }

  const updatedOverall = Math.round((technicalAverage * 0.75) + (performancePpmScale * 0.25));
  return Math.min(99, Math.max(1, updatedOverall));
}
