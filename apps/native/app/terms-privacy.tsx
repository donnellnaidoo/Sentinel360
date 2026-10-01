import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";

export default function TermsPrivacyScreen() {
  return (
    <SettingsDetailScreen
      title="Terms & Privacy"
      subtitle="How Sentinel360 Community expects members to use the app, and what we do with account data."
      icon="document-outline"
    >
      <SettingsInfoCard
        title="Community use"
        body="Send reports and tips that are truthful and about public safety. Do not use the app to harass someone, to post private information about a person who is not part of a safety report, or to submit a sighting you know is false."
      />
      <SettingsInfoCard
        title="Your account"
        body="You are responsible for the password on this account. Profile details you save — name, phone, and profile picture — identify you inside Sentinel360. Sign out on a shared device."
      />
      <SettingsInfoCard
        title="Reports and tips"
        body="A sighting may include a description, photos, and a location so it can be reviewed. An anonymous report withholds your name from the public view of that report. Secure tips are meant to stay separate from your public profile."
      />
      <SettingsInfoCard
        title="Privacy"
        body="Sentinel360 processes your name, email, phone, profile picture, and location so the app can sign you in, show nearby alerts, and attach reports to your account. This follows the Protection of Personal Information Act (POPIA): the data is used for community safety, not sold, and you can ask for your account to be closed."
      />
      <SettingsInfoCard
        title="Location"
        body="Location is used to label your home neighborhood and to decide which alerts are nearby. You can turn location permission off in your device settings. Nearby matching will stop until it is on again."
      />
    </SettingsDetailScreen>
  );
}