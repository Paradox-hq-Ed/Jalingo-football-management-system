import { createApi } from '@jalingo/shared';

export const api = createApi({ storageKey: 'efc-token', base: import.meta.env?.VITE_API_URL || '' });
// Set VITE_DEMO_LABELS=false once the club has confirmed real content, to hide the "Sample" tags.
export const DEMO = import.meta.env?.VITE_DEMO_LABELS !== 'false';
