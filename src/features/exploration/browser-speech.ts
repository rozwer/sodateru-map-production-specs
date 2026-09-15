import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceRecorder } from './device';

interface SpeechResult { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

/** Browser recognition may use its provider's service; no audio is sent to the application's AI. */
export function useBrowserSpeech(onTranscript: (text: string) => void) {
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef('');
  const recognitionError = useRef<string | null>(null);
  const ended = useRef(true);
  const finish = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transcribe = useCallback(async (_audio: Blob, signal: AbortSignal) => {
    if (!ended.current) await new Promise<void>((resolve, reject) => {
      const abort = () => { cleanup(); reject(new DOMException('取り消しました。', 'AbortError')); };
      const timeout = window.setTimeout(() => { recognition.current?.abort(); cleanup(); reject(new Error('音声認識が完了しませんでした。もう一度録音するか、文字で続けてください。')); }, 10_000);
      const cleanup = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); finish.current = null; };
      finish.current = () => { cleanup(); resolve(); };
      signal.addEventListener('abort', abort, { once: true });
      recognition.current?.stop();
    });
    signal.throwIfAborted();
    if (recognitionError.current) throw new Error(recognitionError.current);
    if (!utterance.current.trim()) throw new Error('音声を聞き取れませんでした。もう一度録音するか、文字で続けてください。');
    return utterance.current.slice(0, 300);
  }, []);
  const recorder = useVoiceRecorder(transcribe, onTranscript);
  const start = useCallback(async () => {
    const browser = window as SpeechWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) { setError('このブラウザでは音声認識を使えません。本文を入力して続けられます。'); return; }
    recognition.current?.abort();
    const next = new Constructor();
    next.lang = 'ja-JP'; next.continuous = true; next.interimResults = true;
    utterance.current = ''; recognitionError.current = null; ended.current = false; setError(null);
    next.onresult = event => { if (recognition.current === next) utterance.current = Array.from(event.results, result => result[0]?.transcript ?? '').join(''); };
    next.onerror = event => { if (recognition.current === next) recognitionError.current = event.error === 'not-allowed' ? '音声認識が許可されませんでした。文字で続けられます。' : '音声認識に失敗しました。もう一度録音するか、文字で続けてください。'; };
    next.onend = () => { if (recognition.current === next) { ended.current = true; finish.current?.(); } };
    recognition.current = next;
    try {
      next.start();
      if (!await recorder.start()) { next.abort(); ended.current = true; }
      else if (recognitionError.current) recorder.stop();
    } catch { next.abort(); setError('音声認識を開始できませんでした。文字で続けられます。'); }
  }, [recorder.start, recorder.stop]);
  const cancel = useCallback(() => { const active = recognition.current; recognition.current = null; active?.abort(); ended.current = true; finish.current?.(); recorder.cancel(); }, [recorder.cancel]);
  useEffect(() => () => { recognition.current?.abort(); }, []);
  return { ...recorder, start, cancel, error: error ?? recorder.error };
}
