import Link from "next/link";

const features = [
  {
    icon: "visibility",
    fill: true,
    iconBg: "bg-primary-container/20",
    iconColor: "text-primary",
    title: "Real-Time Detection",
    description:
      "Instantaneous identification of anomalies and high-value targets across distributed camera networks with sub-second latency.",
    footer: "Active Monitoring",
    footerBadge: true,
    hoverEffect: "group-hover:scale-110",
  },
  {
    icon: "layers",
    fill: true,
    iconBg: "bg-primary-container",
    iconColor: "text-white",
    title: "3D Scene Reconstruction",
    description:
      "Advanced spatial temporal mapping to recreate environments in three dimensions for evidence gathering and situational analysis.",
    footer: "Spatial Analysis Engine",
    footerBadge: false,
    hoverEffect: "group-hover:rotate-12",
    highlight: "border-primary/20 bg-primary/5",
  },
  {
    icon: "description",
    fill: true,
    iconBg: "bg-tertiary-container/20",
    iconColor: "text-tertiary",
    title: "Automated Reporting",
    description:
      "Generate comprehensive dockets and evidence summaries with AI-assisted narratives for courtroom-ready documentation.",
    footer: "ISO 27001 Compliant",
    footerBadge: false,
    hoverEffect: "group-hover:scale-110",
  },
];

const stats = [
  { value: "2.4M", label: "Nodes Connected" },
  { value: "99.9%", label: "Uptime Reliability" },
  { value: "42ms", label: "Avg Detection Speed" },
  { value: "150+", label: "Federal Agencies" },
];

export default function Home() {
  return (
    <>
      <section className="relative w-full h-[90vh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-10 hero-gradient-overlay" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full z-20 pointer-events-none opacity-60" />
        <div className="relative z-30 container mx-auto px-margin-desktop text-center flex flex-col items-center gap-stack-lg">
          <div className="mb-stack-lg animate-fade-in">
            <div className="h-12 w-auto inline-flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
          </div>
          <div className="max-w-4xl space-y-stack-md">
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-none md:text-[64px]">
              AI-Powered Public Safety <br />
              <span className="text-primary">Intelligence</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              A sophisticated instrument for intelligence analysts and law enforcement, delivering surgical precision through real-time surveillance data and predictive analytics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-stack-md mt-stack-md">
            <Link
              href="/login"
              className="px-8 py-4 bg-primary-container text-on-primary-container font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-stack-sm"
            >
              Login
              <span className="material-symbols-outlined">login</span>
            </Link>
            <Link
              href="/wanted-feed"
              className="px-8 py-4 bg-surface-container-highest text-primary font-bold rounded-xl border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-stack-sm"
            >
              Explore Wanted Feed
              <span className="material-symbols-outlined">person_search</span>
            </Link>
          </div>
          <div className="absolute bottom-10 animate-bounce text-on-surface-variant/40">
            <span className="material-symbols-outlined text-[32px]">expand_more</span>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background relative z-40">
        <div className="container mx-auto px-margin-desktop">
          <div className="flex flex-col items-center text-center mb-16">
            <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-stack-xs">Operational Capabilities</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Precision Surveillance Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`bg-white/70 backdrop-blur-md border border-white/30 p-stack-lg rounded-xl shadow-sm hover:shadow-md transition-all group ${feature.highlight || ""}`}
              >
                <div className={`w-12 h-12 ${feature.iconBg} ${feature.iconColor} rounded-lg flex items-center justify-center mb-stack-md ${feature.hoverEffect} transition-transform`}>
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: feature.fill ? "'FILL' 1" : "'FILL' 0" }}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-stack-sm">{feature.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{feature.description}</p>
                <div className="mt-stack-md flex items-center text-primary font-bold text-xs uppercase tracking-tighter">
                  {feature.footer}
                  {feature.footerBadge && <span className="ml-2 w-2 h-2 rounded-full bg-secondary animate-pulse" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-outline-variant bg-surface-container-low">
        <div className="container mx-auto px-margin-desktop grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-stack-xs">
              <div className="font-headline-xl text-headline-xl text-primary">{stat.value}</div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-surface-container-lowest dark:bg-on-surface flex justify-between px-margin-desktop items-center w-full py-stack-md border-t border-outline-variant">
        <div className="flex flex-col md:flex-row items-center gap-stack-md">
          <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest font-bold">Sentinel360 Intelligence</div>
          <span className="hidden md:block text-outline">|</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">© 2024 Sentinel360 Intelligence. All rights reserved.</p>
        </div>
        <div className="flex gap-stack-md">
          <Link href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-opacity">Privacy Policy</Link>
          <Link href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-opacity">Terms of Service</Link>
          <Link href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-opacity">Security Disclosure</Link>
          <Link href="#" className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-opacity">Contact Support</Link>
        </div>
      </footer>

      <style>{`
        .hero-gradient-overlay {
          background: linear-gradient(to bottom, transparent, #f8f9ff);
        }
      `}</style>
    </>
  );
}
