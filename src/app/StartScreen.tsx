import { messages } from '../messages';
import { Icon } from '../ui/Icon';
import { Status } from '../ui/Status';
import { ProviderMark } from '../ui/ProviderMark';
import type { SessionController } from './session';
import './start.css';

export function StartScreen({ controller, onContinue }: { controller: SessionController; onContinue: () => void }) {
  const { dataMode, profiles, session, selectedProfile, selectProfile, busy, error, switchMode, refresh } = controller;
  const copy = messages.session;
  return <div className="sm-start-root">
    <header className="sm-data-mode" aria-label={copy.dataMode}>
      <label><span>{copy.demoData} <strong>{dataMode === 'demo' ? 'ON' : 'OFF'}</strong></span><input type="checkbox" role="switch" aria-label={copy.demoData} checked={dataMode === 'demo'} onChange={event => switchMode(event.target.checked ? 'demo' : 'live')}/></label>
      <label><span>{copy.person}</span><select aria-label={copy.person} value={selectedProfile} disabled={busy} onChange={event => selectProfile(event.target.value)}><option value="">{session ? copy.continueAs(session.person.name) : copy.choose}</option>{profiles.map(profile => <option key={profile.profileKey} value={profile.profileKey}>{profile.name}</option>)}</select></label>
      <small>{busy ? copy.loading : dataMode === 'demo' ? copy.demoDescription : copy.liveDescription}</small>
    </header>
    <main className="sm-welcome">
      <header className="sm-welcome__brand"><h1>{messages.appName}</h1><p>{copy.brandLine}</p></header>
      <button type="button" className="sm-welcome__profile sm-icon-button" aria-label={copy.choosePerson} onClick={() => document.querySelector<HTMLSelectElement>('.sm-data-mode select')?.focus()}><Icon name="person" size={27}/></button>
      <p className="sm-welcome__slogan">{copy.slogan}</p>
      <button type="button" className="sm-welcome__explore" disabled={busy || (!session && !selectedProfile)} onClick={onContinue}><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/></svg><span>{busy ? copy.opening : copy.explore}</span><small>{copy.preview}</small></button>
      <div className="sm-welcome__actions">
        {error && <Status kind="error" onRetry={refresh}>{error}</Status>}
        {!busy && profiles.length === 0 && !error && <Status kind="empty">{copy.empty}</Status>}
        <p className="sm-welcome__divider">{copy.account}</p>
        {(['google', 'apple', 'openai'] as const).map(provider => <button key={provider} type="button" className="sm-login-button" disabled><span className="sm-provider"><ProviderMark provider={provider}/></span>{copy[provider]}<Icon name="chevron" size={18}/></button>)}
        <small className="sm-welcome__notice">{copy.accountPending}</small>
      </div>
    </main>
  </div>;
}
