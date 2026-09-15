import type { EvidenceRecordView, InsightIcon } from '../insights/types';
/** THEMES.json v1.0.0 colorKey values. */
export type ThemeColor = 'teal' | 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
export interface ThemeView {
  id: string; version: number; name: string; description: string; color: ThemeColor | null;
  photoUrl?: string | null; photoLabel?: string; placeLabel?: string; icon?: InsightIcon; recordIds: string[];
}
export interface ThemeDraft {
  name: string; description: string; color: ThemeColor; recordIds: string[];
  photoFile: File | null; photoUrl: string | null;
  coverMediaId: string | null; photoRecordId: string | null;
}
export type ThemeRecordView = EvidenceRecordView;
