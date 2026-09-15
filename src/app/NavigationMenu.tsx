import { messages } from '../messages';
import { Icon, type IconName } from '../ui/Icon';
import { NavigationArt } from '../ui/NavigationArt';
import type { ProfileView, ScreenProps } from './contracts';

export function NavigationMenu({ mode, profile, navigate }: { mode: 'main' | 'self' | 'community'; profile?: ProfileView | null; navigate: ScreenProps['navigate'] }) {
  const main = mode === 'main';
  const rows: { page: string; icon: IconName; label: string; description?: string; active?: boolean; outlined?: boolean }[] = main ? [
    { page: 'map', icon: 'map', label: messages.map, active: true },
    { page: 'self-home', icon: 'person', label: messages.self },
    { page: 'community-home', icon: 'people', label: messages.community },
    { page: 'plugin-store', icon: 'leaf', label: messages.plugins },
    { page: 'settings', icon: 'settings', label: messages.settings },
    { page: '$start', icon: 'exit', label: messages.start },
  ] : mode === 'self' ? [
    { page: 'daily-track', icon: 'clock', label: messages.today, description: messages.todayDescription, active: true },
    { page: 'type-diagnosis', icon: 'chart', label: messages.diagnosis, description: messages.diagnosisDescription },
    { page: 'personal-map', icon: 'map', label: messages.personalMap, description: messages.personalMapDescription, outlined: true },
  ] : [
    { page: 'local-knowledge', icon: 'pin', label: messages.knowledge, description: messages.knowledgeDescription, outlined: true },
    { page: 'friends-map', icon: 'people', label: messages.friends, description: messages.friendsDescription, active: true },
  ];
  return <div className={`sm-navigation sm-navigation--${mode}`}>
    {main ? <div className="sm-profile">
      {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="sm-profile__avatar"/> : <div className="sm-profile__avatar sm-profile__avatar--empty"><Icon name="person" size={30}/></div>}
      <h2>{profile?.name || messages.profileEmpty}</h2>
      {profile?.bio && <p>{profile.bio}</p>}
    </div> : <div className="sm-navigation__intro"><h2>{mode === 'self' ? messages.self : messages.community}</h2><p>{mode === 'self' ? messages.selfDescription : messages.communityDescription}</p></div>}
    <nav className="sm-navigation__links" aria-label={main ? messages.menu : mode === 'self' ? messages.self : messages.community}>
      {rows.map(row => <button key={row.page} type="button" className={`sm-nav-row${row.active ? ' sm-nav-row--active' : ''}${row.outlined ? ' sm-nav-row--outlined' : ''}`} onClick={() => navigate(row.page)}>
        <span className="sm-nav-row__icon"><Icon name={row.icon} size={30}/></span>
        <span className="sm-nav-row__copy"><strong>{row.label}</strong>{row.description && <small>{row.description}</small>}</span>
        <Icon name="chevron" size={17}/>
      </button>)}
    </nav>
    <footer className="sm-navigation__footer"><NavigationArt community={mode === 'community'}/><p>{main ? messages.menuFooter : mode === 'self' ? messages.selfFooter : messages.communityFooter}</p></footer>
  </div>;
}
