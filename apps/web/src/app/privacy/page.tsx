export const metadata = {
  title: "Privacy Policy — Sentinel360",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose">
      <h1 className="font-headline-md text-headline-md text-on-surface font-semibold">
        Privacy Policy
      </h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Draft — last updated {new Date().toISOString().slice(0, 10)}. This notice will be
        reviewed by legal counsel before production launch.
      </p>

      <p>
        Sentinel360 (&ldquo;we&rdquo;, &ldquo;us&rdquo;) processes personal information in
        accordance with the Protection of Personal Information Act, 2013 (POPIA). This
        notice explains what we collect, why, and your rights as a data subject.
      </p>

      <h2>What we collect</h2>
      <p>
        Account details (name, email, phone number), case and evidence records you or your
        organisation create, and — for community app users — sighting reports and their
        associated location and media.
      </p>

      <h2>Why we process it</h2>
      <p>
        Solely for crime detection, investigation, and community safety alerting. We do not
        sell personal information or use it for unrelated marketing.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Request a copy of the personal information we hold about you.</li>
        <li>Request correction of inaccurate information.</li>
        <li>Request deletion of your information, subject to our legal retention obligations
          (evidentiary records connected to an open case cannot be deleted while the case is
          active — Criminal Procedure Act 51 of 1977).</li>
        <li>Withdraw consent for processing that relies on consent as its legal basis.</li>
      </ul>
      <p>
        To exercise these rights, contact your organisation&rsquo;s Sentinel360 administrator.
        A self-service request API is planned but not yet available.
      </p>

      <h2>Retention</h2>
      <p>
        Case and evidence records are retained for a minimum of 7 years in line with law
        enforcement evidentiary requirements. Account data is retained for the lifetime of
        your account plus the applicable retention period after deactivation.
      </p>

      <h2>Security</h2>
      <p>
        Evidence is stored with cryptographic integrity verification and an immutable
        chain-of-custody log. Access to case and evidence data is role-restricted and
        logged.
      </p>
    </div>
  );
}
