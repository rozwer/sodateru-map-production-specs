import { createContext, useContext, useState, type Dispatch, type SetStateAction } from 'react';

export const ScreenStateContext = createContext<Map<string, unknown> | null>(null);
export const ScreenKeyContext = createContext('map');

/** React-style state retained across navigation; isolated by the shell's person/mode key. */
export function useScreenState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const saved = useContext(ScreenStateContext);
  const key = useContext(ScreenKeyContext);
  const [value, setValue] = useState<T>(() => saved?.has(key) ? saved.get(key) as T : typeof initial === 'function' ? (initial as () => T)() : initial);
  const set: Dispatch<SetStateAction<T>> = next => {
    setValue(previous => {
      const result = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      saved?.set(key, result);
      return result;
    });
  };
  return [value, set];
}
