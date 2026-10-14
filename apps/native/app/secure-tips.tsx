import { useQuery } from "@tanstack/react-query";

import { AccountSightingCard } from "@/components/account-sighting-card";
import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";
import { isActiveTip, isSecureTip, sightingPlace } from "@/lib/account-activity";
import { trpc } from "@/utils/trpc";

export default function SecureTipsScreen() {
  const { data, isLoading, isError, error } = useQuery(trpc.sightings.listMine.queryOptions());
  const tips = (data ?? []).filter(isSecureTip);
  const activeTips = tips.filter(isActiveTip);
  const closedTips = tips.filter((tip) => !isActiveTip(tip));

  return (
    <SettingsDetailScreen
      title="Secure Tips"
      subtitle="A tip is a sighting you sent about a wanted person. Active tips are the ones still waiting for review."
      icon="chatbox-ellipses-outline"
    >
      <SettingsInfoCard
        title="What counts as an active tip"
        body="The profile count is tips still pending review. Once a reviewer marks a tip reviewed, not accepted, or a duplicate, it moves to closed tips and drops out of that count. Anonymous tips are not stored on your account."
      />
      {isLoading && <SettingsInfoCard title="Loading tips" body="Checking the tips saved on this account." />}
      {isError && (
        <SettingsInfoCard
          title="Could not load tips"
          body={error.message || "The active tip count on your profile could not be refreshed."}
        />
      )}
      {!isLoading && !isError && activeTips.length === 0 && (
        <SettingsInfoCard
          title="No active tips"
          body="You have no wanted-person tips waiting for review. Open someone on the Wanted tab and choose Submit a secure tip."
        />
      )}
      {activeTips.map((tip) => (
        <AccountSightingCard
          key={tip.id}
          referenceCode={tip.referenceCode}
          description={tip.description}
          moderationStatus={tip.moderationStatus}
          createdAt={tip.createdAt}
          place={sightingPlace(tip.location)}
        />
      ))}
      {closedTips.length > 0 && (
        <SettingsInfoCard
          title="Closed tips"
          body={`${closedTips.length} tip${closedTips.length === 1 ? "" : "s"} already reviewed. These are not included in Active Tips.`}
        />
      )}
      {closedTips.map((tip) => (
        <AccountSightingCard
          key={tip.id}
          referenceCode={tip.referenceCode}
          description={tip.description}
          moderationStatus={tip.moderationStatus}
          createdAt={tip.createdAt}
          place={sightingPlace(tip.location)}
        />
      ))}
    </SettingsDetailScreen>
  );
}
