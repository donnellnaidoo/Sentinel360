import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { AccountSightingCard } from "@/components/account-sighting-card";
import { AuthCta } from "@/components/auth-flow-ui";
import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";
import { isAccountReport, sightingPlace } from "@/lib/account-activity";
import { trpc } from "@/utils/trpc";

export default function MySightingsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery(trpc.sightings.listMine.queryOptions());
  const reports = (data ?? []).filter(isAccountReport);

  return (
    <SettingsDetailScreen
      title="My Sightings"
      subtitle="Reports saved on this account. This is the number shown on your profile."
      icon="document-text-outline"
    >
      <SettingsInfoCard
        title="What counts as a report"
        body="A report is a community sighting sent with your account and not tied to a wanted person. Anonymous reports are left off your account, so they are not included in this count."
      />
      {isLoading && <SettingsInfoCard title="Loading reports" body="Checking the reports saved on this account." />}
      {isError && (
        <SettingsInfoCard
          title="Could not load reports"
          body={error.message || "The report count on your profile could not be refreshed."}
        />
      )}
      {!isLoading && !isError && reports.length === 0 && (
        <SettingsInfoCard
          title="Nothing here yet"
          body="You have not submitted a report on this account. Use Report to send one. Your reference code is shown right after you submit."
        />
      )}
      {reports.map((report) => (
        <AccountSightingCard
          key={report.id}
          referenceCode={report.referenceCode}
          description={report.description}
          moderationStatus={report.moderationStatus}
          createdAt={report.createdAt}
          place={sightingPlace(report.location)}
        />
      ))}
      <AuthCta label="Go to Report" onPress={() => router.push("/(drawer)/(tabs)/report")} />
    </SettingsDetailScreen>
  );
}
