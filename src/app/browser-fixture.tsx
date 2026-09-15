/** Explicit UI-only acceptance fixture; never imported by the product entry point. */
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { App } from './App';
import type { ScreenDefinition } from './contracts';
import { useScreenState } from './useScreenState';
import { Button } from '../ui/Button';
import { Chat } from '../ui/Chat';

if (new URLSearchParams(location.search).get('fontScale') === '2') document.documentElement.style.fontSize = '32px';

const screens: ScreenDefinition[] = [{
  id: 'fixture-input', title: 'UI動作確認用の入力',
  component: ({ navigate, route }) => {
    const [value, setValue] = useScreenState('');
    return <div className="sm-stack"><p>UI fixture / API未接続。{route.params.date}</p><label>確認用の下書き<textarea id="fixture-draft" value={value} onChange={event => setValue(event.target.value)}/></label>
      {value && <p>未保存の下書き</p>}
      <Button onClick={() => navigate('fixture-chat')}>チャットを開く</Button>
      {Array.from({ length: 8 }, (_, i) => <p key={i}>スクロール復帰の確認 {i + 1}</p>)}
      <Button id="fixture-bottom" onClick={() => navigate('navigation', { mode: 'main' })}>末尾からメニューを開く</Button>
    </div>;
  },
}, {
  id: 'fixture-chat', title: 'UI動作確認用の会話',
  component: () => {
    const [value, setValue] = useScreenState('');
    const [busy, setBusy] = useState(false);
    return <Chat messages={[{ id: 'fixture-message', role: 'assistant', content: 'UI fixture / API未接続。入力・送信・取消を確認します。' }]} value={value} onChange={setValue} busy={busy} onSend={() => setBusy(true)} onCancel={() => setBusy(false)} toolbar={<Button>履歴（fixture）</Button>}/>;
  },
}];
function Fixture() {
  const [scope, setScope] = useState('fixture-person-a:demo');
  return <><App screens={screens} scopeKey={scope} dataMode="demo" profile={{ name: '表示確認用の人', bio: '日々の小さな発見を\n地図に育てています。', avatarUrl: null }}/><button style={{ position: 'fixed', bottom: 84, left: 8, zIndex: 100 }} onClick={() => setScope(scope.includes('a:') ? 'fixture-person-b:demo' : 'fixture-person-a:demo')}>別本人に切替（fixture）</button></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
