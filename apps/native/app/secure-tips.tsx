import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";

export default function SecureTipsScreen() {
  const tips = [
    {
      title: "What a secure tip is",
      body: "A secure tip is a short anonymous note about something you know but do not want attached to your name. It is separate from a full sighting report.",
    },
    {
      title: "What reviewers see",
      body: "Reviewers see the tip text and the area you chose to share. Your name, email, and phone stay off the tip.",
    },
    {
      title: "Your tip history",
      body: "Past tips will appear here so you can see that they were received. There are no tips saved on this screen yet.",
    },
  ];

  return (
    <SettingsDetailScreen
      title="Secure Tips"
      subtitle="Anonymous notes you send stay off your public profile."
      icon="chatbox-ellipses-outline"
    >
      {tips.map((tip) => (
        <SettingsInfoCard key={tip.title} title={tip.title} body={tip.body} />
      ))}
    </SettingsDetailScreen>
  );
}
