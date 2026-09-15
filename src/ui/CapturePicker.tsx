import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

/** Native capture keeps permission and device handling in the browser/OS. */
export function CapturePicker({ onFiles, onClose }: { onFiles: (files: File[]) => void; onClose: () => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const receive = (input: HTMLInputElement) => {
    const files = Array.from(input.files ?? []); input.value = '';
    if (files.length) onFiles(files);
  };
  return <dialog ref={dialog} className="sm-capture-picker" aria-label="写真を記録する" onCancel={onClose} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
    <h2>写真を記録する</h2>
    <p>撮影または写真を選んで、体験の記録へ進みます。</p>
    <button className="sm-button sm-button--primary" onClick={() => camera.current?.click()}><Icon name="camera"/>写真を撮る</button>
    <button className="sm-button" onClick={() => library.current?.click()}>端末の写真を選ぶ</button>
    <button className="sm-button" onClick={onClose}>キャンセル</button>
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label="撮影した写真" onCancel={onClose} onChange={event => receive(event.currentTarget)}/>
    <input ref={library} hidden type="file" accept="image/*" multiple aria-label="選択した写真" onCancel={onClose} onChange={event => receive(event.currentTarget)}/>
  </dialog>;
}
