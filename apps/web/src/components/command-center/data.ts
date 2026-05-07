export type SidebarItem = {
  label: string;
  icon: string;
  href?:
    | "/dashboard"
    | "/dashboard/live-surveillance"
    | "/dashboard/ai-alerts"
    | "/dashboard/investigations"
    | "/dashboard/crime-docket"
    | "/dashboard/suspect-database";
};

export type KpiCard = {
  label: string;
  value: string;
  accentClassName: string;
  detailText?: string;
  detailIcon?: string;
  detailClassName?: string;
  progressPercent?: number;
};

export type AlertItem = {
  title: string;
  location: string;
  priorityLabel: string;
  priorityClassName: string;
  elapsed: string;
  tags: string[];
  imageUrl: string;
  imageAlt: string;
};

export type DeploymentStat = {
  label: string;
  value: string;
  dotClassName: string;
  pulse?: boolean;
};

export type InvestigationRow = {
  caseId: string;
  incidentType: string;
  lead: string;
  leadAvatarUrl: string;
  leadAvatarAlt: string;
  status: string;
  statusClassName: string;
  timestamp: string;
  icon: string;
  iconWrapClassName: string;
  iconClassName: string;
};

export const agentProfile = {
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDZ-dPqFKFTu9iH3HN1RQSsVC_OQF9VJyTfJEw_xgGo6Q9oyBNi9oE0YjVfd5JeycTf4D9nKDW3qW5q9VIfyVTIOLFuOb_nEwj0HcRJdyxGkHR4ssokTN0H32E-Mhwk1XcxOSZhPAnlPNBx8E4gsLRJbsTuIec6UuwT8stZlkRkHT_2LIUSv8OWGTTA0XVH_hpM17ux4_hCIBf60zQ7Xde83lvRZgusNeplE_znslEmeTF99wrZhAyubduAX4U3JMvCB-FY-Yi5N0M",
  avatarAlt:
    "Professional portrait of an intelligence officer in a dark suit with a neutral background",
};

export const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  {
    label: "Live Surveillance",
    icon: "videocam",
    href: "/dashboard/live-surveillance",
  },
  {
    label: "AI Alerts",
    icon: "notifications_active",
    href: "/dashboard/ai-alerts",
  },
  {
    label: "Investigations",
    icon: "search_check",
    href: "/dashboard/investigations",
  },
  {
    label: "Crime Docket",
    icon: "folder_open",
    href: "/dashboard/crime-docket",
  },
  {
    label: "Suspect Database",
    icon: "person_search",
    href: "/dashboard/suspect-database",
  },
  { label: "Vehicles Database", icon: "directions_car" },
];

export const navTabs = ["Global View", "Analytics", "Reports"];

export const kpiCards: KpiCard[] = [
  {
    label: "Active Threat Alerts",
    value: "12",
    accentClassName: "border-[#ba1a1a]",
    detailText: "+30%",
    detailIcon: "trending_up",
    detailClassName: "text-[#ba1a1a]",
  },
  {
    label: "Surveillance Streams",
    value: "1,248",
    accentClassName: "border-[#47607e]",
    detailText: "98.2% ONLINE",
    detailClassName: "text-[#45474d]",
  },
  {
    label: "Pending Investigations",
    value: "42",
    accentClassName: "border-[#a28963]",
    detailText: "8 Urgent",
    detailIcon: "history",
    detailClassName: "text-[#a28963]",
  },
  {
    label: "AI Processing Load",
    value: "24%",
    accentClassName: "border-[#051125]",
    progressPercent: 24,
  },
];

export const alertItems: AlertItem[] = [
  {
    title: "Restricted Area Breach",
    location: "Gate 4C - Logistics Wing",
    priorityLabel: "Critical Priority",
    priorityClassName: "text-[#ba1a1a]",
    elapsed: "2m ago",
    tags: ["Human Det.", "Night Vision"],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCmO5stqD_j4DxgO-vKmYABi0UgMZElSstCCc0bUZKabueefIR8e0_rXMJTtOrmX-Z9jzJGOb3RkI6XTWMrmw67_DwC9DM8yM4uyKCdH1kHpjOkcbVIBwcc7a8Kz0v-1s2QvyHu5WaB4h7FSrJQE21uDbDQYXGIoDOvm0M7BNtiAGYLtBs_kQiVrj7W0Mat9UKWQoktSUUebknzl75-uAamiMhUFDJP8ZwFEgi9fW1gzxuV5uM7RY-FJRHGsOEUN74fFfLgtXhxgBM",
    imageAlt:
      "Security camera night-vision footage showing a figure near a restricted perimeter fence",
  },
  {
    title: "Unidentified Vehicle",
    location: "Employee Parking - Sector B",
    priorityLabel: "High Priority",
    priorityClassName: "text-[#a28963]",
    elapsed: "14m ago",
    tags: ["ALPR Flag"],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJ_VrNEJ-0CfGdJs8fybsfqcq6lCyn1G-6GfD3SLmbFzy0M4Qhg6Qhd2X3i3Afnd4ATQPjKw2jR6zoW3XQvoeFn4WbvJY4XFyMfzKOuu4rZsLZaCwVUKeDBjm5v7cIsInUnp9ByFZL0uod9vfA0C9fJwFARmAbg2Ha0Fed5NeCR8dpkJR7GYrk0qhcA5k8r-bWlwuHbEfDaZXhrd0WEQX7FZXa-69n0RtYA85cbEZqL7ixAeWfYHqrDle-Ci5EK_rN8vqDqY7JB3k",
    imageAlt:
      "Street surveillance view showing a dark car parked in a restricted zone with blurred city lights",
  },
  {
    title: "Crowd Density Alert",
    location: "Main Lobby - South Entrance",
    priorityLabel: "Medium Priority",
    priorityClassName: "text-[#48617e]",
    elapsed: "32m ago",
    tags: ["Congestion"],
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAIuJNaTR-V615tvhJ5EoFwNiTZ8buIAvCEe1EXVFrHgd8sx3GmEzgD9E8xqJhNJT3T6qVkbLunNe2SeIyPGUVErhDD-Ky2Z7M5OqEVSXMns2pawBFC9SL9WqW01lJJvlIAqXb83UaUaXsMatqiZoOlvf_mdD4KgsLXQrKQ8zwJRAPpO-8DGQuiQTLfe6mLbw1MRykJuQk-gEruJChUjfJ1e97SR13GKTDlsyhS3-vuoV-om_vw-W3JU6dlNFJ7pkgPyj0DrE_RmFw",
    imageAlt:
      "Abstract heat map visualization showing foot traffic density inside a building lobby",
  },
];

export const mapImageUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCOJ6ggtjr_Si-NQokHS8c0zTn361dkCuNkhuGKHFMJ_vM7kEuelkrlBHUTyCY7JsUqzf0EidxIsOBODFpnPbky9diZUH10rfavkSUEeDWzOAraFG31m8LfjDh2dS5PVOIe2fKo10W17Wro1ChEiW4v0j6oEC78YVLAj0IZWiOcrCXQA7j7C0eYLW-918hWjCV-Y_at2TOiZ5RrciicNIznft4qFj3j4cGfJ-H98hh5ckq4z8cvWhfp7z2fiDpw8jUNMea49et5hlk";

export const mapDeployments: DeploymentStat[] = [
  { label: "Critical", value: "03", dotClassName: "bg-[#ba1a1a]", pulse: true },
  { label: "Active", value: "18", dotClassName: "bg-[#1a0f00]" },
  { label: "Patrol", value: "05", dotClassName: "bg-[#47607e]" },
];

export const surveillanceStats = {
  activeCapacity: 94,
  onlineNodes: "1,176",
};

export const aiStats = [
  { label: "Latency", value: "42ms" },
  { label: "Precision", value: "99.8%" },
  { label: "Throughput", value: "4.2 TB/s" },
];

export const investigationRows: InvestigationRow[] = [
  {
    caseId: "INV-8842-A",
    incidentType: "Perimeter Breach",
    lead: "S. Jenkins",
    leadAvatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB9k2l9uk16SciS8maioh98WE3k1gwpLnxbtl4ftJIE3Hc2Nzc1UZOKEvtf3xk3NwAeIomTtQfOjyr8r-56p7QizJAWJZCqg1E0FQcbKtGyuzfwelg0IO8Jo8WSEJYxJHCVEQ7qu8fP68EB4s14h7pfwfYLWpB3Vlq9AuY7oWikXapme8uNYrVUSQveevouSQiNxUQHDnUMYe_JlnRcvipJOK4_NiniAi3F0WzztLZAW6SE8jkUVgaQkxrrC3pfa-cfE_5sPPlDg5c",
    leadAvatarAlt:
      "Professional headshot of a female investigator with glasses in a modern office",
    status: "URGENT",
    statusClassName: "bg-[#ba1a1a] text-white",
    timestamp: "Today, 14:22",
    icon: "lock_open",
    iconWrapClassName: "bg-[#ba1a1a]/10",
    iconClassName: "text-[#ba1a1a]",
  },
  {
    caseId: "INV-8839-C",
    incidentType: "Banned Plate Entry",
    lead: "T. Walsh",
    leadAvatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBSsdqEWt2c7Dl2MtMHwQLfqbWNnIWrf2yDIRd5Qn6cTt-EWBRaFtsub858iBZHiPnj8VVi5mVdHAYdZXSfHmr7QOHKod-a1rAo4m2jcbqlv-yLg18xcDurDTm9d2pukdisrQBh1M8lHk4YV-Mmlb4Yc0SOlBrUN-4vWUWyieDW1Un2Nt_qQxogC4pjrZLVjlveay0H6ac55xy92eNkwaJHR1iA83EhkgK9cXzgcgFwAaPug_V4mbGK8R4Vf2uWoeaA6o32dYfHw_c",
    leadAvatarAlt: "Professional portrait of a young investigator with a focused expression",
    status: "IN PROGRESS",
    statusClassName: "bg-[#a28963] text-white",
    timestamp: "Today, 11:05",
    icon: "directions_car",
    iconWrapClassName: "bg-[#a28963]/10",
    iconClassName: "text-[#a28963]",
  },
  {
    caseId: "INV-8831-D",
    incidentType: "Object Left Behind",
    lead: "M. Rivera",
    leadAvatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA2toXwRCfVQma7piUHbG7xdfNYWZJ2uO3UMUfkoOX0V9o3YMg_LvaSx5sf2OaZ2Lc0JU6T0vW7i06DXlK92tYQTI8Eeth556RpuaeIGg2SXNX3Jr17dmqyG6uEzLRa-Nc57p9HHNBqSr8LNuFDGVCgJMsg2Few161u_CmbfrxYg3pas1MddxDYEvxmAKDuiDa439TPcL7qDjxpMKHv5OpUHE7j_DDkP3VN3Gj0zSivC8JJLua6pwrG4jXyZfkFtIZz0Xb8unKKXSQ",
    leadAvatarAlt: "Close-up portrait of a woman working at a technology company",
    status: "REVIEWED",
    statusClassName: "bg-[#47607e] text-white",
    timestamp: "Yesterday, 18:45",
    icon: "inventory_2",
    iconWrapClassName: "bg-[#47607e]/10",
    iconClassName: "text-[#47607e]",
  },
];
