import { useState } from 'react';
import { App, type AppProps } from './App';
import { StartScreen } from './StartScreen';
import { SessionContext, useLocalSession } from './session';

export function SessionRoot(props: AppProps) {
  const controller = useLocalSession();
  const [showStart, setShowStart] = useState(location.hash.includes('$start') || location.hash.includes('%24start'));
  const visibleStart = showStart || !controller.session || controller.busy;
  const current = controller.session;
  return <SessionContext.Provider value={controller}>
    {visibleStart && <StartScreen controller={controller} onContinue={() => { void controller.start().then(success => { if (success) { history.replaceState({ sodateruDepth: 1 }, '', '#/map'); setShowStart(false); } }); }}/>} 
    {current && <div hidden={visibleStart} inert={visibleStart}><App {...props} active={!visibleStart} scopeKey={`${current.dataMode}:${current.person.id}`} profile={current.person} dataMode={current.dataMode} onStart={() => { history.replaceState({ sodateruDepth: 1 }, '', '#/$start'); setShowStart(true); }}/></div>}
  </SessionContext.Provider>;
}
