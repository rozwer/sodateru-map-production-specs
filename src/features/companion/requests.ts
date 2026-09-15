import { useEffect, useRef, useState } from 'react';
import { api } from '../../app/api';
import { ApiError, type OperationId, type OperationInput, type OperationOutput } from '../../../packages/api-client/index';
import type { Notice } from './views';
type MutationData<T extends OperationId> = OperationOutput<T> extends { data: infer Data } ? Data : never;

/** A request key belongs to one confirmed input, and survives an uncertain response. */
export function useCompanionRequests(active: boolean) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const keys = useRef(new Map<string, string>());
  useEffect(() => {
    if (!active) { controller.current?.abort(); running.current = false; setBusy(false); }
    return () => { controller.current?.abort(); };
  }, [active]);
  const keyFor = (operation: string, input: unknown) => {
    const fingerprint = `${operation}:${JSON.stringify(input)}`;
    if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID());
    return { fingerprint, key: keys.current.get(fingerprint)! };
  };
  async function mutate<T extends OperationId>(operation: T, input: Omit<OperationInput<T>, "idempotencyKey" | "signal">, identity: unknown = input): Promise<MutationData<T>> {
    const { fingerprint, key } = keyFor(operation, identity);
    try {
      const result = await api.request(operation, { ...input, idempotencyKey: key, signal: controller.current?.signal } as OperationInput<T>);
      // Keep the successful receipt too: a follow-up GET can fail, and retrying
      // the complete action must not create another resource.
      return (result as { data: MutationData<T> }).data;
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.code !== 'BUSY') keys.current.delete(fingerprint);
      throw error;
    }
  }
  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (running.current || !active) return;
    running.current = true; setBusy(true); setNotice(undefined);
    const current = new AbortController(); controller.current = current;
    try { await action(current.signal); }
    catch (error) {
      if (!current.signal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) {
        const conflict = error instanceof ApiError && (error.status === 412 || error.code === 'VERSION_CONFLICT');
        const unavailable = error instanceof Error && error.message.startsWith('Unknown operation:');
        setNotice({ kind: 'error', text: conflict ? '保存済みの情報が更新されています。入力は残しています。最新の情報を確認してから保存してください。' : unavailable ? '相棒の機能にまだ接続できません。入力は残っています。' : error instanceof Error ? error.message : '処理に失敗しました。入力は残っています。', retry: () => void run(action) });
      }
    } finally { if (controller.current === current) { running.current = false; setBusy(false); } }
  }
  return { busy, notice, setNotice, run, mutate };
}

let revision = 0;
const listeners = new Set<() => void>();
export function notifyCompanionSaved() { revision++; listeners.forEach(listener => listener()); }
export function subscribeCompanion(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function companionRevision() { return revision; }

export function downloadInstructions(text: string, name = 'companion-instructions.txt') {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
