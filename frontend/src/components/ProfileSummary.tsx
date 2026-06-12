import type { ScanProfile } from "../core/scan-profiles";

interface ProfileSummaryProps {
  profile: ScanProfile;
}

export function ProfileSummary({ profile }: ProfileSummaryProps): React.JSX.Element {
  return (
    <div className="profile-summary">
      <p>{profile.description}</p>
      <code>{profile.args.join(" ")}</code>
    </div>
  );
}
