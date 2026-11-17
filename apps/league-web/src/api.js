import { createApi } from '@jalingo/shared';
export const api = createApi({ storageKey: 'jfl-token', base: import.meta.env?.VITE_API_URL || '' });
export const ROLES = ['admin', 'team', 'coach', 'player', 'referee', 'media', 'sponsor'];
