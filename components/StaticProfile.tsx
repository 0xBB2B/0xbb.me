import { StorySections } from './StorySections';

const noop = () => {};

export function StaticProfile() {
  return (
    <div hidden data-static-profile="">
      <StorySections
        language="en"
        active={false}
        currentIndex={0}
        failed={false}
        opacity={1}
        onLanguageChange={noop}
      />
    </div>
  );
}
