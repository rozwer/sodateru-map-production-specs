/** Presentation fields only. HTTP payloads remain the shared API client's types. */
export type Coordinates = [longitude: number, latitude: number];

export interface PlacePresentation {
  id: string;
  name: string;
  address: string | null;
  coordinates: Coordinates;
  photos: { url: string; alt: string }[];
  category?: string;
  description?: string;
  reason?: string;
  entrance?: string;
  facts?: string;
  source?: { url: string | null; title: string };
  walkingMinutes?: number;
  stayMinutes?: number;
}

export interface HistoryPresentation {
  id: string;
  title: string;
  updatedAt: number;
  preview: string;
  photo?: { url: string; alt: string };
  tags: string[];
}

export interface PositionReading {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: number;
}

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'transcribing' | 'error';

export interface VoicePresentation {
  state: RecordingState;
  seconds: number;
  levels: number[];
  error: string | null;
  transcript: string;
}
