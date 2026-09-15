export type SourceRef = { type: 'record' | 'visit' | 'place' | 'checkin' | 'route'; id: string; version: number };
export type Step = { id: string; meaning: string; sourceRecordIds: string[]; stayMinutes: number; required: boolean };
export type RecipeInput = { id: string; title: string; meaning: string; sourceRefs: SourceRef[]; steps: Step[]; requiredConditions: string[]; allowedChanges: string[] };
export type Recipe = RecipeInput & { version: number; createdAt: number; updatedAt: number };
export type Variant = 'faithful' | 'personalized';
export type Position = { longitude: number; latitude: number };
export type PlanInput = {
  id: string; recipeId: string; recipeVersion: number; region: string; start: Position;
  mode: 'walking' | 'driving'; timeBudgetMinutes: number; preferences: string;
};
export type Candidate = { placeId: string; version: number; name: string; position: Position; stepIds: string[] };
export type PlanStep = { stepId: string; placeId: string | null; explanation: string; evidenceIds: string[] };
export type Proposal = { variant: Variant; steps: PlanStep[]; explanation: string; unmetConditions: string[]; unknowns: string[] };
export type ModelResult = { plans: Proposal[]; commonalities: string[]; differences: string[] };
export type RoutePreview = { id: string; durationSeconds: number; distanceMeters: number; expiresAt: number; sourceRefs: SourceRef[] };
export type Plan = Proposal & { route: RoutePreview | null; travelMinutes: number | null; stayMinutes: number; totalMinutes: number | null; eligible: boolean };
export type PlanSet = PlanInput & {
  recipe: Recipe; sourceRefs: SourceRef[]; candidates: Candidate[]; generatorVersion: string;
  status: 'pending' | 'running' | 'complete' | 'incomplete' | 'failed' | 'cancelled' | 'adopted';
  assistantMessageId: string | null; plans: Plan[]; commonalities: string[]; differences: string[];
  selectedVariant: Variant | null; savedRouteId: string | null;
  error: { code: string; message: string; retryable: boolean } | null;
  version: number; createdAt: number; updatedAt: number;
};

export class TransferError extends Error {
  code: string;
  details: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message); this.code = code; this.details = details;
  }
}
