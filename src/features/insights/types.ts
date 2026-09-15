/** UI presentation values. These are not additional HTTP DTO fields. */
export type Period = 'today' | 'week' | 'month' | 'all';
export type ReviewChoice = 'agree' | 'disagree' | 'unsure';
export type InsightIcon = 'leaf' | 'coffee' | 'book' | 'tree' | 'people';
export interface EvidenceRecordView {
  id: string; version: number; title: string; dateLabel: string; placeLabel: string;
  quote?: string; observation?: string; inference?: string;
  photoUrl?: string | null; photoMediaId?: string | null; photos?: Array<{ id: string; url: string }>; icon?: InsightIcon;
  sourceState?: 'current' | 'changed' | 'unavailable'; counterexample?: boolean;
}
export interface AxisView {
  key: string; label: string; numerator: number; denominator: number;
  value: number | null; unknownDays: number;
}
export interface InsightView {
  id: string; version: number; title: string | null; summary: string;
  periodLabel: string; provisional: boolean; icon?: InsightIcon;
  axes: AxisView[]; records: EvidenceRecordView[];
  alternatives: Array<{ id: string; title: string; text: string }>;
  unknown: string[]; review: ReviewChoice | null; reviewNote: string;
}
export interface ReviewDraft { choice: ReviewChoice | null; note: string }
export interface ViewStatus { loading?: boolean; error?: string | null; busy?: boolean; notice?: string | null }
