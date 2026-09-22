import { createClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const queryKeys = {
  all: ['futsal_hub'] as const,
  leagues: () => [...queryKeys.all, 'leagues'] as const,
  league: (leagueId: string) => [...queryKeys.leagues(), leagueId] as const,
  settings: (leagueId: string) => [...queryKeys.league(leagueId), 'settings'] as const,
  members: (leagueId: string) => [...queryKeys.league(leagueId), 'members'] as const,
  polls: (leagueId: string) => [...queryKeys.league(leagueId), 'polls'] as const,
  activePoll: (leagueId: string) => [...queryKeys.polls(leagueId), 'active'] as const,
  pollVotes: (pollId: string) => [...queryKeys.all, 'poll_votes', pollId] as const,
  matches: (leagueId: string) => [...queryKeys.league(leagueId), 'matches'] as const,
  matchDetail: (matchId: string) => [...queryKeys.all, 'match', matchId] as const,
  matchGrades: (matchId: string) => [...queryKeys.matchDetail(matchId), 'grades'] as const,
  nextMatchWidget: (leagueId: string) => [...queryKeys.league(leagueId), 'next_match_widget'] as const,
};

export async function invalidateMatchAndPollCache(queryClient: QueryClient, leagueId: string, pollId?: string) {
  const invalidations: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: queryKeys.activePoll(leagueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.nextMatchWidget(leagueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.matches(leagueId) }),
  ];

  if (pollId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.pollVotes(pollId) }));
  }

  await Promise.all(invalidations);
}

export interface PollSlotPreference {
  pollId: string;
  memberId: string;
  selectedSlots: string[];
}

export async function submitPollPreference(
  queryClient: QueryClient,
  leagueId: string,
  payload: PollSlotPreference
) {
  const { pollId, memberId, selectedSlots } = payload;

  const { error: upsertError } = await supabase
    .from('poll_votes')
    .upsert(
      {
        poll_id: pollId,
        member_id: memberId,
        selected_slots: selectedSlots,
        registered_at: new Date().toISOString(),
      },
      { onConflict: 'poll_id,member_id' }
    );

  if (upsertError) throw new Error(upsertError.message);

  const { error: syncError } = await supabase.rpc('rpc_sync_poll_queue', {
    p_poll_id: pollId,
  });

  if (syncError) throw new Error(syncError.message);

  await invalidateMatchAndPollCache(queryClient, leagueId, pollId);
}

export async function cancelPollReservation(
  queryClient: QueryClient,
  leagueId: string,
  pollId: string,
  memberId: string
) {
  const { error: deleteError } = await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('member_id', memberId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: syncError } = await supabase.rpc('rpc_sync_poll_queue', {
    p_poll_id: pollId,
  });

  if (syncError) throw new Error(syncError.message);

  await invalidateMatchAndPollCache(queryClient, leagueId, pollId);
}

export interface NextMatchState {
  pollId: string | null;
  targetDate: string | null;
  winningSlot: string | null;
  confirmedCount: number;
  maxSlots: number;
  isRosterFull: boolean;
  userStatus: 'CONFIRMED' | 'QUEUE' | 'NOT_REGISTERED';
  userQueuePosition: number;
}

export async function fetchNextMatchWidgetData(leagueId: string, currentMemberId?: string): Promise<NextMatchState> {
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id, target_date, time_slots')
    .eq('league_id', leagueId)
    .eq('is_closed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pollError || !poll) {
    return {
      pollId: null,
      targetDate: null,
      winningSlot: null,
      confirmedCount: 0,
      maxSlots: 10,
      isRosterFull: false,
      userStatus: 'NOT_REGISTERED',
      userQueuePosition: 0,
    };
  }

  const { data: votes } = await supabase
    .from('poll_votes')
    .select('member_id, selected_slots, is_confirmed, queue_position')
    .eq('poll_id', poll.id);

  const confirmedVotes = votes?.filter(v => v.is_confirmed) ?? [];
  const confirmedCount = confirmedVotes.length;

  const slotCounts: Record<string, number> = {};
  votes?.forEach(v => {
    v.selected_slots?.forEach((s: string) => {
      slotCounts[s] = (slotCounts[s] || 0) + 1;
    });
  });

  let winningSlot: string | null = null;
  let maxCount = -1;
  for (const [slot, count] of Object.entries(slotCounts)) {
    if (count > maxCount) {
      maxCount = count;
      winningSlot = slot;
    }
  }

  let userStatus: NextMatchState['userStatus'] = 'NOT_REGISTERED';
  let userQueuePosition = 0;

  if (currentMemberId) {
    const userVote = votes?.find(v => v.member_id === currentMemberId);
    if (userVote) {
      if (userVote.is_confirmed) {
        userStatus = 'CONFIRMED';
      } else {
        userStatus = 'QUEUE';
        userQueuePosition = userVote.queue_position;
      }
    }
  }

  return {
    pollId: poll.id,
    targetDate: poll.target_date,
    winningSlot,
    confirmedCount,
    maxSlots: 10,
    isRosterFull: confirmedCount >= 10,
    userStatus,
    userQueuePosition,
  };
}

export async function addGuestBotToMatch(
  queryClient: QueryClient,
  matchId: string,
  team: 'A' | 'B'
): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_add_guest_bot', {
    p_match_id: matchId,
    p_team: team,
  });

  if (error) throw new Error(error.message);
  await queryClient.invalidateQueries({ queryKey: queryKeys.matchDetail(matchId) });
  return data as string;
}

export interface SubmitGradeParams {
  matchId: string;
  ratedMemberId: string;
  stars: number;
}

export async function submitMatchGrade(
  queryClient: QueryClient,
  params: SubmitGradeParams
): Promise<{ match_id: string; rated_member_id: string; new_average_grade: number }> {
  const { matchId, ratedMemberId, stars } = params;

  const { data, error } = await supabase.rpc('rpc_submit_grade', {
    p_match_id: matchId,
    p_rated_member_id: ratedMemberId,
    p_stars: stars,
  });

  if (error) throw new Error(error.message);
  await queryClient.invalidateQueries({ queryKey: queryKeys.matchGrades(matchId) });
  return data;
}

export async function setMatchMvp(
  queryClient: QueryClient,
  matchId: string,
  mvpMemberId: string
) {
  const { error } = await supabase
    .from('matches')
    .update({ mvp_member_id: mvpMemberId })
    .eq('id', matchId);

  if (error) throw new Error(error.message);
  await queryClient.invalidateQueries({ queryKey: queryKeys.matchDetail(matchId) });
}
