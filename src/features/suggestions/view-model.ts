/** Display-only structures. Wire DTOs belong to packages/api-client. */
export interface CheckinForm {
  state: string;
  wishes: string;
  time: '' | '15' | '30' | '60' | '120+';
  mode: '' | 'walking' | 'cycling' | 'driving' | 'transit' | 'any';
  companion: '' | 'solo' | 'friends_family' | 'children' | 'pet';
  effort: '' | 'easy' | 'moderate' | 'any';
}
export const emptyForm: CheckinForm = { state: '', wishes: '', time: '', mode: '', companion: '', effort: '' };
export interface CandidateView {
  id: string;
  title: string;
  tags: string[];
  reason: string;
  wishes: string;
  evaluation: string;
  travel: string;
  stay: string;
  total: string;
  status: string;
  photos: { id: string; url: string; alt: string }[];
  confirmed: string[];
  unknown: string[];
  sourceUrl: string | null;
  sourceLabel: string;
  fetchedAt: string;
  expiresAt: string;
  memo: string;
  bookmarked: boolean;
}
export interface Notice { kind: 'error' | 'success' | 'loading' | 'info'; text: string; retry?: () => void }
