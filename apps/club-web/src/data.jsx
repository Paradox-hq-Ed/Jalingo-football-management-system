import { createContext, useContext, useMemo } from 'react';
import { useQuery, ErrorState, Skeleton } from '@jalingo/shared';
import { api } from './api.js';

const ClubContext = createContext(null);
export const useClub = () => useContext(ClubContext);

/** Loads the small, site-wide reference data once: club profile, squads and staff. */
export function ClubProvider({ children }) {
  const profile = useQuery(api, '/club/profile');
  const squads = useQuery(api, '/club/squads');
  const people = useQuery(api, '/club/people');
  const error = profile.error || squads.error || people.error;
  const value = useMemo(() => {
    if (!profile.data || !squads.data || !people.data) return null;
    const p = profile.data;
    return {
      ...p, squads: squads.data, people: people.data,
      squadById: (id) => squads.data.find((s) => s.id === id),
      personById: (id) => people.data.find((x) => x.id === id)
    };
  }, [profile.data, squads.data, people.data]);

  if (error) return <main className="wrap" style={{ paddingTop: 120 }}><ErrorState error={error} onRetry={() => { profile.reload(); squads.reload(); people.reload(); }} /></main>;
  if (!value) return <main className="wrap" style={{ paddingTop: 120 }} aria-busy="true"><Skeleton lines={6} height={22} /></main>;
  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}
