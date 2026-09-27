import { useEffect } from 'react';
import { api } from './api';

/** Display preferences follow the authenticated person and data mode. */
export function useDisplaySettings(scopeKey: string | null) {
  useEffect(() => {
    const root = document.documentElement;
    const previousSize = root.style.fontSize;
    const previousMotion = root.dataset.reduceMotion;
    let request: AbortController | undefined;
    const apply = (size: string, reduceMotion: boolean) => {
      root.style.fontSize = size;
      root.dataset.reduceMotion = String(reduceMotion);
      window.dispatchEvent(new Event('sodateru:display-settings-applied'));
    };
    apply('16px', false);
    const refresh = () => {
      request?.abort();
      if (!scopeKey) return;
      const controller = new AbortController();
      request = controller;
      void api.request('getMeSettings', { signal: controller.signal }).then(({ data }) => {
        if (!controller.signal.aborted) apply(({ standard: '16px', large: '20px', extraLarge: '24px' })[data.display.fontSize], data.display.reduceMotion);
      }).catch(() => { /* Keep the current display; settings owns API error feedback. */ });
    };
    refresh();
    window.addEventListener('sodateru:settings-changed', refresh);
    return () => {
      request?.abort();
      window.removeEventListener('sodateru:settings-changed', refresh);
      root.style.fontSize = previousSize;
      if (previousMotion === undefined) delete root.dataset.reduceMotion;
      else root.dataset.reduceMotion = previousMotion;
      window.dispatchEvent(new Event('sodateru:display-settings-applied'));
    };
  }, [scopeKey]);
}
