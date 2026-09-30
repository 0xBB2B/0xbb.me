import { hydrateRoot } from 'react-dom/client';
import { ProfilePage } from './components/ProfilePage';

hydrateRoot(document.getElementById('root')!, <ProfilePage />);
