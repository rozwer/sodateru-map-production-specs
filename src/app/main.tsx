import { createRoot } from 'react-dom/client';
import type { AppProps } from './App';
import { SessionRoot } from './SessionRoot';
import type { ScreenDefinition } from './contracts';

// Each feature owns its registration file. Only BASE owns this central loading boundary.
const modules = import.meta.glob<{ screens?: ScreenDefinition[]; MapToolbar?: AppProps['MapToolbar'] }>('../features/**/screens.tsx', { eager: true });
const renderers = import.meta.glob<{ MapRenderer?: AppProps['MapRenderer'] }>('../map/MapRenderer.tsx', { eager: true });
const companions = import.meta.glob<{ MapCompanion?: AppProps['MapCompanion'] }>('../features/companion/MapCompanion.tsx', { eager: true });
const screens = Object.values(modules).flatMap(module => module.screens ?? []);
const duplicate = screens.find((screen, index) => screens.findIndex(candidate => candidate.id === screen.id) !== index);
if (duplicate) throw new Error(`Duplicate screen registration: ${duplicate.id}`);
const MapRenderer = Object.values(renderers)[0]?.MapRenderer;
const MapToolbar = Object.values(modules).find(module => module.MapToolbar)?.MapToolbar;
const MapCompanion = Object.values(companions)[0]?.MapCompanion;
createRoot(document.getElementById('root')!).render(<SessionRoot screens={screens} MapRenderer={MapRenderer} MapToolbar={MapToolbar} MapCompanion={MapCompanion}/>);
