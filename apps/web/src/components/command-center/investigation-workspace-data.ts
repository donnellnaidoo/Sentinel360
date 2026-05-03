export type EvidenceItem = {
  title: string;
  meta: string;
  badge: string;
  imageUrl?: string;
  imageAlt?: string;
  previewIcon?: string;
  audioBars?: number[];
};

export type SubjectProfile = {
  name: string;
  status: string;
  statusClassName: string;
  detail: string;
  imageUrl: string;
  imageAlt: string;
  critical?: boolean;
};

export type InvestigationLog = {
  timestamp: string;
  text: string;
  borderClassName: string;
  dotClassName: string;
  timestampClassName: string;
};

export const evidenceItems: EvidenceItem[] = [
  {
    title: "Corridor Motion Segment",
    meta: "04:22:15 AM · 12.4 MB",
    badge: "CAM_04_WEST",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB2sa98_-n_vhQUwMUGoficx8Xv_j1_H_ayrpgojZcEye0w6jG9WDD_P9qLlKw8M6DbSbLeNArs-8B6p4CFHwfkjRbtSb9gcMJmrR5THHo1_xnatzeuBMfuMMeXEK_y6MlaFNFNQ7xBidBo_IjtaB8qlsoQ0vGh5Fj5xbBp1PEAJikpAUrH11pH1kVBXPYaGPdppEefh6vASpSaETtweE9xBSDaM6XJ22ELFwweA1rgIpqlPSUJ-FqYKV1DCJtoygrBLCYjZdYpr_A",
    imageAlt:
      "Security camera still showing a dark alleyway with a single flickering street lamp and industrial silhouettes",
    previewIcon: "play_circle",
  },
  {
    title: "License Plate Extraction",
    meta: "05:10:02 AM · High Confidence",
    badge: "DASH_992",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDw52xwV5N7zG0gB4lnJYVSTzrYYo5-3QOPDU7o2k-f1VEq4cBegiwUG1xBChhOgtOLsonxpPyoccrqYEN0l7mQJRz2_BCytc96m8J3y4TlUfy5cSOp8WOHfB0ZiRyUcix_HFp9xmvmsVcsiJ9KpAfgBoGXq1uwAiVmPSXNzq8lKanadcHLaY4OK_ydU9lRTrNyDxbpjwGXj3LuYXyfnAl5OcLbcA2IvP6z9bIXFKvNiexh083UMSoKOPaQ_sAQLs1jiHFw5_fiyYc",
    imageAlt:
      "City street surveillance at night with motion blur of passing cars and sharp focus on a pedestrian crossing",
    previewIcon: "image",
  },
  {
    title: "Encrypted Comms Intercept",
    meta: "04:45:30 AM · Audio Log",
    badge: "AUDIO_LOG",
    previewIcon: "play_circle",
    audioBars: [3, 5, 2, 6, 4],
  },
  {
    title: "Network Access Log #44",
    meta: "03:59:00 AM · JSON Data",
    badge: "TELEMETRY_LOG",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAGkxEwBH3RQtZwsF8BOGyXiKFGVza8dccPsqykpSiHLqTRw6d_5bOQfXOgp03e0-BwTL6UHnfVjfs2c3bWH96ovcXuvx1BFujtYqnAqsT7Co2x79afO8UqvxhRqYM1zQ3l5OSNc2bv11xLjTHImEzzVxHaWPifbY7Hcbl0ilj8KflwdhcgHxZFFx2SH4UqYg96zeH9fe_yztoJ-0IYCAU0vuL2gZk_V_AkIHNcFjlQhz7_JY3dfJsmAwcEokWZ9YDQ3HWVuieBn-k",
    imageAlt:
      "Technical dashboard with digital telemetry and data visualization charts in a dark theme",
  },
];

export const timelineBars = [
  { heightClassName: "h-4", className: "bg-white/10" },
  { heightClassName: "h-6", className: "bg-white/10" },
  { heightClassName: "h-3", className: "bg-white/10" },
  { heightClassName: "h-12", className: "bg-[#332306]/40" },
  {
    heightClassName: "h-20",
    className:
      "bg-[#ba1a1a]/60 border-t-2 border-[#ba1a1a] shadow-[0_0_15px_rgba(186,26,26,0.3)]",
  },
  { heightClassName: "h-10", className: "bg-[#332306]/40" },
  { heightClassName: "h-8", className: "bg-white/10" },
  { heightClassName: "h-5", className: "bg-white/10" },
  { heightClassName: "h-7", className: "bg-white/10" },
  { heightClassName: "h-14", className: "bg-[#c2dcff]/30" },
  {
    heightClassName: "h-[4.5rem]",
    className: "bg-[#c2dcff]/40 border-t-2 border-[#d1e4ff]",
  },
  { heightClassName: "h-12", className: "bg-[#c2dcff]/30" },
  { heightClassName: "h-4", className: "bg-white/10" },
  { heightClassName: "h-2", className: "bg-white/10" },
];

export const subjectProfiles: SubjectProfile[] = [
  {
    name: "Subject: UNKNOWN_ALPHA",
    status: "POI - Active Lead",
    statusClassName: "text-[#ba1a1a]",
    detail: "Last seen: Sector 4 G-Zone",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBRIIR0D1JrOdBjjST-ZvDXYZMbt0WYg57TocrqAlJZobL-KNklDRiYXvdw6FXQ1oxQ72tX44NVe281mkG7FgdY4qgneUY2T57mok3KW-nz0dwfo4_4ZJcjWOXXSUpUxPgE5gMzgATrmmBfJz8pKMjhja8Gw-e0nzu-ldEhTtI8lTPrddm5GmIfSvzdnTM5mXcxapvMcl-4ksGb2EXaOJGjOKRl3EBlHW4QfLa4paLLyVHYHP26tS74tk_d5fDEeowj-gHxWdIwcic",
    imageAlt:
      "Grainy black and white profile photo of a male suspect with sharp features and stubble",
    critical: true,
  },
  {
    name: "Subject: ELIAS_VANCE",
    status: "Citizen - Witness",
    statusClassName: "text-[#45474d]",
    detail: "Verified ID: #VT-441-2",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADEU2Jm2Oseh7VGTmC86VL4nKJi5ZAtyBnQhD2Uw9E9bK__f5MEsEUIMR401g30Vy5VYgM9FanNMXiXPxYbLkkVTcYjR_lvY-CJ2dd2SzR5xI1AyMC5VAPF3HdJcOfh5-7LYQEJECBdsV2ilXHTI7vbLiNvBnE2Drd6toddVG5y4ji1z-lFXE0wDqhDNLfAz41bytVFDKoh3qN6bAkm--nMYYRJRBhuJOtgXt-KC2UCq7bcvqYDkQ56w768aztTxH2Ny2FOWd8KI4",
    imageAlt:
      "Digital identification headshot of a person with a neutral expression in soft lighting",
  },
];

export const investigationLogs: InvestigationLog[] = [
  {
    timestamp: "Today, 04:35 AM",
    text: "Identified matching gait pattern from CAM_04 in Suspect Database. High probability link to Subject: UNKNOWN_ALPHA.",
    borderClassName: "border-[#1b263b]",
    dotClassName: "bg-[#1b263b]",
    timestampClassName: "text-[#828da7]",
  },
  {
    timestamp: "Today, 04:12 AM",
    text: "Case file initiated following perimeter alarm trigger at Downtown Transit G-Zone. All local feeds requested for archival.",
    borderClassName: "border-[#c5c6cd]",
    dotClassName: "bg-[#c5c6cd]",
    timestampClassName: "text-[#45474d]",
  },
];
