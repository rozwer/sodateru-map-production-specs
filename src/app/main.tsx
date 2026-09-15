import { createRoot } from 'react-dom/client';
import type { AppProps } from './App';
import { SessionRoot } from './SessionRoot';
import type { ScreenDefinition } from './contracts';

// Each feature owns its registration file. Only BASE owns this central loading boundary.
const modules = import.meta.glob<{ screens?: ScreenDefinition[]; MapToolbar?: AppProps['MapToolbar'] }>('../features/**/screens.tsx', { eager: true });
const renderers = import.meta.glob<{ MapRenderer?: AppProps['MapRenderer'] }>('../map/MapRenderer.tsx', { eager: true });
const companions = import.meta.glob<{ MapCompanion?: AppProps['MapCompanion'] }>('../features/companion/MapCompanion.tsx', { eager: true });
// The integration owner can compose the discovered UI without editing BASE's entry point.
const integrations = import.meta.glob<{ configureApp?: (discovered: AppProps) => AppProps }>('../integration/registry.ts', { eager: true });
const screens = Object.values(modules).flatMap(module => module.screens ?? []);
const MapRenderer = Object.values(renderers)[0]?.MapRenderer;
const MapToolbar = Object.values(modules).find(module => module.MapToolbar)?.MapToolbar;
const MapCompanion = Object.values(companions)[0]?.MapCompanion;
const discovered: AppProps = { screens, MapRenderer, MapToolbar, MapCompanion };
const configureApp = Object.values(integrations)[0]?.configureApp;
const configured = configureApp ? configureApp(discovered) : discovered;
const registered = configured.screens ?? [];
const duplicate = registered.find((screen, index) => registered.findIndex(candidate => candidate.id === screen.id) !== index);
if (duplicate) throw new Error(`Duplicate screen registration: ${duplicate.id}`);
createRoot(document.getElementById('root')!).render(<SessionRoot {...configured}/>);
