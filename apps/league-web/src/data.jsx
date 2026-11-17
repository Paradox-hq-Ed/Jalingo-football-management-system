import { createContext, useContext, useMemo } from 'react';
import { Skeleton, ErrorState, useQuery } from '@jalingo/shared';
import { api } from './api.js';

const Ctx = createContext(null);
export const useLeague = () => useContext(Ctx);

/** Loads competition-wide reference data once (config, season, divisions, clubs, teams, venues, sponsors). */
export function LeagueProvider({ children }) {
  const q = useQuery(api, '/league/bootstrap');
  const value = useMemo(() => {
    const b = q.data; if (!b) return null;
    const by = (arr) => new Map(arr.map((x) => [x.id, x]));
    const teams = by(b.teams), clubs = by(b.clubs), venues = by(b.venues), divisions = by(b.divisions);
    const season = b.seasons.find((s) => s.id === b.activeSeasonId);
    return {
      ...b, season,
      activeDivisions: b.divisions.filter((d) => d.seasonId === season.id && d.status !== 'draft'),
      activeTeams: b.teams.filter((t) => t.seasonId === season.id),
      team: (id) => teams.get(id), club: (id) => clubs.get(teams.get(id)?.clubId || id), venue: (id) => venues.get(id), division: (id) => divisions.get(id),
      teamName: (id) => teams.get(id)?.name || '', reload: q.reload
    };
  }, [q.data, q.reload]);
  if (q.error) return <main className="wrap" style={{ paddingBlock: 80 }}><ErrorState error={q.error} onRetry={q.reload} /></main>;
  if (!value) return <main className="wrap" style={{ paddingBlock: 80 }} aria-busy="true"><Skeleton lines={6} height={22} /></main>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
