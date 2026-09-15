import type { ComponentType } from 'react';

/** Logical page IDs and parameters from docs/01_requirements/03_pages. */
export interface RouteState {
  pageId: string;
  params: Record<string, string>;
}

export interface ScreenProps {
  route: RouteState;
  navigate: (pageId: string, params?: Record<string, string>) => void;
  back: () => void;
  /** Changes when the server-resolved person or live/demo context changes. */
  scopeKey: string;
  /** False while this cached screen is behind another page. */
  active?: boolean;
}

/** Feature screens render the content of the one shared Sheet. */
export interface ScreenDefinition {
  id: string;
  title: string;
  component: ComponentType<ScreenProps>;
  /** Select only the chrome shown in this page's reference image. */
  layout?: {
    header?: 'back' | 'close' | 'back-close';
    bottomNav?: boolean;
    background?: 'surface' | 'soft';
  };
}

export interface ProfileView {
  name: string;
  bio: string;
  avatarUrl: string | null;
}
