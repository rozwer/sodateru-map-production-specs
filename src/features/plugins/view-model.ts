import type { ReactNode } from "react";

/** Display-only models. HTTP payloads are mapped from the shared API contracts. */
export type PluginKind = "bike" | "disaster" | "pilgrimage" | "other";
export type PluginCategory = "all" | "safety" | "mobility" | "walking";
export type PluginLegendItem = {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
};
export type PluginSource = {
  id: string;
  title: string;
  url?: string;
  updatedAt?: string;
};
export type PluginCardModel = {
  id: string;
  name: string;
  description: string;
  kind: PluginKind;
  displayIcon?: ReactNode;
  category: PluginCategory;
  author?: string;
  updatedAt?: string;
  versionLabel?: string;
  installed: boolean;
  enabled: boolean;
  regionLabel?: string;
  permissions: string[];
  summary?: string;
  sources?: PluginSource[];
  demo?: boolean;
};
export type PluginConditionField = {
  id: string;
  label: string;
  help?: string;
  type: "select" | "choice" | "boolean" | "text";
  options?: { value: string; label: string; detail?: string }[];
  value: string | boolean;
  disabled?: boolean;
};
export type PluginConditionValue = { label: string; value: string };
export type PluginViewStatus = {
  busy?: boolean;
  busyLabel?: string;
  error?: string;
  notice?: string;
  onRetry?: () => void;
};
export type PluginPreview = {
  map: ReactNode;
  caption?: string;
  legend?: PluginLegendItem[];
  mock?: boolean;
};
export type PluginConflictSide = {
  id: string;
  name: string;
  kind: PluginKind;
  description: string;
  preview: PluginPreview;
};
