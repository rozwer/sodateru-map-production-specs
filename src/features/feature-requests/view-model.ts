export type FeatureRequestModel = {
  id: string;
  name: string;
  body: string;
  timestampLabel: string;
  avatarUrl?: string;
  visibility: "private" | "public";
  tags: { id: string; label: string; icon?: "place" | "weather" | "walking" }[];
  liked: boolean;
  likeCount: number;
  owned: boolean;
};
export type FeatureRequestDraft = {
  name: string;
  body: string;
  visibility: "private" | "public";
};

export function requestCharacterCount(body: string): number {
  return Array.from(body).length;
}
export function limitRequestBody(body: string): string {
  return Array.from(body).slice(0, 200).join("");
}
