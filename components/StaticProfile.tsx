import { ProfileContent } from './ProfileContent';

const noop = () => {};

export function StaticProfile() {
  return (
    <div hidden data-static-profile="">
      <ProfileContent language="en" onLanguageChange={noop} />
    </div>
  );
}
