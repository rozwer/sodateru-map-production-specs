import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { KnowledgeMediaView } from '../../../src/features/knowledge/Media';
import '../../../src/features/knowledge/knowledge.css';

// A generated silent WAV verifies native playback and cleanup. It is never a product response.
function silentAudio() {
  const bytes = new ArrayBuffer(44 + 240000 * 2), view = new DataView(bytes);
  const text = (offset: number, value: string) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, bytes.byteLength - 44, true);
  return new Blob([bytes], { type: 'audio/wav' });
}
function Preview() {
  const [active, setActive] = useState(true);
  const [slow, setSlow] = useState(false);
  const [started, setStarted] = useState(0);
  const [aborted, setAborted] = useState(0);
  const load = useCallback(async (_media: unknown, signal: AbortSignal) => {
    setStarted(value => value + 1);
    signal.addEventListener('abort', () => setAborted(value => value + 1), { once: true });
    if (slow) await new Promise(resolve => setTimeout(resolve, 1200));
    return silentAudio();
  }, [slow]);
  return <main><p>媒体のテスト応答。業務APIと保存の証拠ではありません。</p>
    <button onClick={() => setActive(value => !value)}>{active ? '画面を非表示にする' : '画面を再表示する'}</button>
    <label><input type="checkbox" checked={slow} onChange={event => setSlow(event.target.checked)} />遅い応答</label>
    <output>取得開始 {started} / 中断 {aborted}</output>
    <div hidden={!active} inert={!active}>
      <KnowledgeMediaView active={active} loadMedia={load} media={{ id: 'test-audio', kind: 'audio', mimeType: 'audio/wav', byteSize: 480044, position: 0, status: 'ready', contentUrl: '/test-audio' }} description="再生停止確認用の無音音声" />
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
