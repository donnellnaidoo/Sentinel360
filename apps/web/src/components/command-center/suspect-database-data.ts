export type SuspectRecord = {
  name: string;
  id: string;
  imageUrl: string;
  imageAlt: string;
  indicatorClassName: string;
  classification: string;
  classificationClassName: string;
  status: string;
  statusClassName: string;
  location: string;
  officer: string;
};

export type DatabaseStat = {
  label: string;
  value: string;
  cardClassName: string;
  iconWrapClassName: string;
  iconClassName: string;
  icon: string;
  labelClassName: string;
  valueClassName: string;
  glow?: boolean;
};

export const suspectRecords: SuspectRecord[] = [
  {
    name: "Marcus Vane",
    id: "#SV-992-B",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBqSX_zU0Vr7RCMCqlMmu4TphaAujIz1Vb2UjhX5O3MzX0tDBETaUD-HIfa-5Pf1qY63IDKq1P38hYR7jRN5Qcr2rYndgwE9C_BccpZEdW8ZJEhauX_BX2LR0G8GqCCjPOy-4OfBgzJusGHoHjMqMTsk9gL2a0RNNbpE7QUqBp_gkpaPMbertBodrCv2UGZ_0d-c8rdMRZxBtYxlW5j1iqxYZkJPt2eXZtH9rVnqEYVKi45kW7VN3CIaIYX6lE0KjknRibEBJvIb1c",
    imageAlt:
      "Close-up mugshot of a man with a serious expression and short dark hair",
    indicatorClassName: "bg-[#ba1a1a]",
    classification: "Cyber Espionage",
    classificationClassName:
      "bg-[#051125]/10 text-[#051125] border border-[#051125]/20",
    status: "WANTED",
    statusClassName: "text-[#ba1a1a]",
    location: "Berlin, Germany",
    officer: "Agent J. Thorne",
  },
  {
    name: "Elena Petrova",
    id: "#SV-412-K",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAmPPpZNp7R2wPENR-eSnshMIfwLIEFr7sEWBtOEw8neyoh4boGJ57h_VGl8wVKvfh4Cc84N6sfHnHz-YaMnONdgSM8aMpJQYi_jxdYHy3bgwuqINuT-hON8fcjvsOCJTZbuq4MDxjQYf-9hyyNaRijaqtAy_kEvGLhl6J2HL9Xa4YhbLHXusv_Jic0G__igIb1gAhUSSyqV0SZT5qm5iA9isiyZcGdo0jeVKmS24Ifot_IPQC_PefoeOJ5Q3OYd7TVogevy7PDp8w",
    imageAlt:
      "Close-up mugshot of a woman with long dark hair and a neutral expression",
    indicatorClassName: "bg-[#47607e]",
    classification: "Money Laundering",
    classificationClassName:
      "bg-[#47607e]/10 text-[#47607e] border border-[#47607e]/20",
    status: "IN CUSTODY",
    statusClassName: "text-[#47607e]",
    location: "Zurich, Switzerland",
    officer: "Senior Lead Miller",
  },
  {
    name: "Julian Graves",
    id: "#SV-004-X",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBBAbBpMT3XoaNTO6aBiH_CXjwcKfUGrenUVF7naFDmtC2iS8JOl8pa-Xa-Sm6IPBQBcNMWIGYDpRNN0LxQ0gw-dCJjOSAS3TkLmlAin9I_3joFmpYRWaSNfUvmx9zlAcFEza9hVuKJAj_1L5ozcgBIXI5_fQ6I6bZq-GJ1SdN3uCmmbCdLKgA-VzCjvtXOCktySy3hFuKDMXx115bRAXzMckg7nb4sYci2UzfZLT5__iiQ0lIdTRPDBQqmR1Rk93U_P7jfwY8vXDY",
    imageAlt:
      "Mugshot style portrait of an older man with a grey beard and spectacles",
    indicatorClassName: "bg-[#ba1a1a]",
    classification: "High Priority Arms",
    classificationClassName:
      "bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20",
    status: "WANTED",
    statusClassName: "text-[#ba1a1a]",
    location: "Marseille, France",
    officer: "Agent D. Silas",
  },
  {
    name: "Li Wei",
    id: "#SV-551-Q",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDgCQ3tryobQnL_j_4Iewxfue4hKLbk2z2nFXLvmRVk44_ZZpvcDvRMwi9bGchTkJOjmVLC7DzamIUmKzrrQ2jAzAZ5689VqnDHSslj18v3rrBYTUTRvtCQVZy088EcsGkEoLG-EclQ0vQ4BDC30kfyBS57J1rowmb1dA18cy_ROd12lb0Oqa_9jG_hjgFPu_8grHTgBVdJk5F6lSvn9zeEUIiMN1-wQvLJqchzodh8Iz6_e4EG29HTMOfvaGhNMDQVgWwRzT4mYdE",
    imageAlt:
      "Professional portrait of a young man with dark curly hair looking slightly away",
    indicatorClassName: "bg-[#a28963]",
    classification: "Corporate Espionage",
    classificationClassName:
      "bg-[#a28963]/10 text-[#a28963] border border-[#a28963]/20",
    status: "UNDER WATCH",
    statusClassName: "text-[#a28963]",
    location: "Shanghai, China",
    officer: "Officer B. Taggert",
  },
];

export const databaseStats: DatabaseStat[] = [
  {
    label: "Active Search Warrants",
    value: "114",
    cardClassName: "bg-[#f3f4f5]",
    iconWrapClassName: "bg-[#ba1a1a]/10",
    iconClassName: "text-[#ba1a1a]",
    icon: "warning",
    labelClassName: "text-[#45474d]",
    valueClassName: "text-[#051125]",
  },
  {
    label: "Securely Detained",
    value: "682",
    cardClassName: "bg-[#f3f4f5]",
    iconWrapClassName: "bg-[#47607e]/10",
    iconClassName: "text-[#47607e]",
    icon: "lock",
    labelClassName: "text-[#45474d]",
    valueClassName: "text-[#051125]",
  },
  {
    label: "Profiles Updated (24h)",
    value: "42",
    cardClassName: "bg-[#051125] relative overflow-hidden",
    iconWrapClassName: "bg-white/10",
    iconClassName: "text-white",
    icon: "update",
    labelClassName: "text-white/60",
    valueClassName: "text-white",
    glow: true,
  },
];

export const suspectFilterOptions = {
  crimeTypes: [
    "All Crime Types",
    "Cybercrime",
    "Financial Fraud",
    "Organized Crime",
    "Narcotics",
  ],
  regions: [
    "All Regions",
    "North District",
    "South Sector",
    "Metropolitan",
    "International",
  ],
  statuses: ["All Statuses", "Wanted", "In Custody", "Under Observation"],
};
