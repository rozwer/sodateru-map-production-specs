import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, type DataMode, type LocalProfile, type LocalSession } from '../../packages/api-client/index';
import { api } from './api';
import { messages } from '../messages';

const modeKey = 'sodateru.dataMode';
const initialMode = (): DataMode => { try { return localStorage.getItem(modeKey) === 'demo' ? 'demo' : 'live'; } catch { return 'live'; } };
export interface SessionController {
  session: LocalSession | null;
  profiles: LocalProfile[];
  dataMode: DataMode;
  busy: boolean;
  error: string | null;
  selectedProfile: string;
  selectProfile: (profileKey: string) => void;
  switchMode: (mode: DataMode) => void;
  refresh: () => void;
  start: () => Promise<boolean>;
  end: () => Promise<boolean>;
}
export const SessionContext = createContext<SessionController | null>(null);
export const useSession = () => useContext(SessionContext);

/** CORE owns cookies, profile resolution and cancellation; this hook owns only screen state. */
export function useLocalSession(): SessionController {
  const [dataMode, setDataMode] = useState<DataMode>(initialMode);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [selectedProfile, selectProfile] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const generation = useRef(0);
  const attempt = useRef<{ mode: DataMode; profile: string; key: string } | null>(null);
  const currentMode = useRef(dataMode); currentMode.current = dataMode;
  const describe = (problem: unknown) => problem instanceof ApiError || problem instanceof Error ? problem.message : messages.session.connectionError;
  useEffect(() => {
    const started = ++generation.current;
    const controller = new AbortController();
    api.cancelPending(); api.setDataMode(dataMode);
    setSession(previous => previous?.dataMode === dataMode ? previous : null); setProfiles([]); selectProfile(''); setBusy(true); setError(null);
    void (async () => {
      try {
        let restored: LocalSession | null = null;
        try { restored = (await api.request('getSession', { signal: controller.signal })).data; }
        catch (problem) { if (!(problem instanceof ApiError) || ![401,403].includes(problem.status)) throw problem; }
        const available = await api.request('getSessionProfiles', { signal: controller.signal });
        if (controller.signal.aborted || started !== generation.current) return;
        if (restored && restored.dataMode !== dataMode) throw new Error(messages.session.modeError);
        setProfiles(available.items); setSession(restored);
        // The start button uses the server's configured default; another profile remains selectable.
        selectProfile(restored ? '' : (available.items.find(profile => profile.profileKey === 'self') ?? available.items[0])?.profileKey ?? '');
        setBusy(false);
      } catch (problem) {
        if (controller.signal.aborted || started !== generation.current) return;
        setError(describe(problem)); setBusy(false);
      }
    })();
    return () => { controller.abort(); };
  }, [dataMode, refreshKey]);
  useEffect(() => {
    const updateProfile = () => {
      const started = generation.current;
      void api.request('getMe', {}).then(response => {
        if (started === generation.current) setSession(previous => previous?.person.id === response.data.id ? { ...previous, person: response.data } : previous);
      }).catch(() => { /* The settings screen presents its own save/reload failure. */ });
    };
    window.addEventListener('sodateru:settings-changed', updateProfile);
    return () => window.removeEventListener('sodateru:settings-changed', updateProfile);
  }, []);
  const switchMode = useCallback((mode: DataMode) => {
    if (mode === currentMode.current) return;
    ++generation.current;
    api.setDataMode(mode); api.cancelPending();
    setSession(null); setProfiles([]); selectProfile(''); setBusy(true); setError(null);
    setDataMode(mode);
    try { localStorage.setItem(modeKey, mode); } catch { /* Preference persistence is optional. */ }
    history.replaceState(null, '', '#/map');
  }, []);
  const start = async () => {
    if (busy) return false;
    if (!selectedProfile) return session !== null;
    if (!profiles.some(profile => profile.profileKey === selectedProfile)) return false;
    const started = ++generation.current;
    setBusy(true); setError(null); setSession(null);
    if (attempt.current?.mode !== dataMode || attempt.current.profile !== selectedProfile) attempt.current = { mode: dataMode, profile: selectedProfile, key: crypto.randomUUID() };
    try {
      const response = await api.request('postSession', { body: { profileKey: selectedProfile }, idempotencyKey: attempt.current.key });
      if (started !== generation.current) return false;
      if (response.data.dataMode !== dataMode) throw new Error(messages.session.modeError);
      setSession(response.data); selectProfile(''); attempt.current = null;
      history.replaceState(null, '', '#/map');
      return true;
    } catch (problem) { if (started === generation.current) setError(describe(problem)); return false; }
    finally { if (started === generation.current) setBusy(false); }
  };
  const end = async () => {
    if (!session || busy) return false;
    const started = ++generation.current;
    setBusy(true); setError(null); api.cancelPending();
    try {
      await api.request('deleteSession', { version: session.version });
      if (started !== generation.current) return false;
      setSession(null); selectProfile(''); attempt.current = null;
      history.replaceState(null, '', '#/map');
      return true;
    } catch (problem) { if (started === generation.current) setError(describe(problem)); return false; }
    finally { if (started === generation.current) setBusy(false); }
  };
  return { session, profiles, selectedProfile, selectProfile, dataMode, busy, error, switchMode, refresh: () => setRefreshKey(key => key + 1), start, end };
}
