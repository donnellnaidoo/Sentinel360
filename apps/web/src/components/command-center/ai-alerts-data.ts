export type ProcessingTask = {
  fileName: string;
  progress: number;
  tags: { icon: string; label: string }[];
};

export type MatchCard = {
  name: string;
  matchScore: string;
  matchClassName: string;
  status: string;
  chips: string[];
  borderClassName: string;
  imageUrl: string;
  imageAlt: string;
};

export type DetectionBox = {
  label: string;
  boxClassName: string;
  labelClassName: string;
};

export type MetaChip = {
  label: string;
  value: string;
  borderClassName: string;
  valueClassName: string;
};

export const processingTask: ProcessingTask = {
  fileName: "Cam_04_North_Entrance_1024.mp4",
  progress: 72,
  tags: [
    { icon: "settings_accessibility", label: "Facial Extraction" },
    { icon: "directions_car", label: "Plate Recognition" },
  ],
};

export const matchCards: MatchCard[] = [
  {
    name: "Unknown Alpha-09",
    matchScore: "98.4% MATCH",
    matchClassName: "text-[#ba1a1a]",
    status: "Status: Wanted / Felony Warrant",
    chips: ["HIGH RISK", "CAM_04"],
    borderClassName: "border-[#ba1a1a]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCZUSyHt7794I-EYdPfLbXg91ciVbwVXATRsA2UpOfZyW09Gk3fJzm1iAinSNtElhW6vgJgNxzJ0ljwXXOdcwnwUBIf76LjXCRy9AUflwkWBiOfi3brtGz-Xvn31HPj_js-GaVEy-1pZ3-Ebu1QZNotTTxPwYbNep3_Bdiw5jj_HFy8ahbhAHnsbr9npUdtXCPiwecykjmIpJFCVU4FbchqdtGwCxh85M6txVJ66htXETf7wvOc6VZqWjK2oEaDdFszLKYm2F77xnU",
    imageAlt:
      "Distorted security camera style close-up profile of a man with stubble and a hoodie",
  },
  {
    name: "Subject Gamma-21",
    matchScore: "82.1% MATCH",
    matchClassName: "text-[#a28963]",
    status: "Status: Person of Interest",
    chips: ["PARKING B2"],
    borderClassName: "border-[#dfc299]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA8Fr6x3UcLCyHDyd2rQM6omxa5ODPnHKxu06M7CPYjtAxE5Ksvltm-TPG6X5IA-Xgtfr09PYSJdTyUbF6cKxwxbfkiwB78ZD5i6O4RfRXPuvkIs0vbnRvD6C4ZutPARPJSR9vUkJF9NDS-TW4inNey1XdO2Ekt5yWE3AorRaH5Vl4rSchOo2BAb0z7C94PcagmE8vGu7lTja566QwycCXGGjoYT1psrKot4MkkH74t9Bnljks1qqb4WTws0YPGsv2ERk0ZzSs_RTU",
    imageAlt:
      "Grainy black and white portrait of a person wearing glasses and a baseball cap",
  },
  {
    name: "Unidentified Male",
    matchScore: "64.0% MATCH",
    matchClassName: "text-[#45474d]",
    status: "Status: No Record",
    chips: ["LOBBY_WEST"],
    borderClassName: "border-[#c5c6cd]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDu0Bl5XG_YVXeAPjYx7OBleZWAK_o37r_hpeDLG7DvunLH6EoDyBpzsa9p2MFZtXpcuTM3H2RZBpXCRcwHtCOoER8JPlxMHpO09sY4x2EVn99ZbNEOdpLFNB7TTy_thEecVwspO3f0iWOfl9V0_w3kXKY2ifuzPYYWhayabd3GC6l2i4W_rN1ugPjnN5airdcpV-sfCrkaPJiubWr3i4F2vlHNxtTjSn3s8Y5dkbTwg4JYhCmtJGeClCZ8CfVajsEg4A4ecF3_tEk",
    imageAlt:
      "Low resolution digital zoom of a person walking through a doorway with face partially obscured",
  },
];

export const detectionBoxes: DetectionBox[] = [
  {
    label: "SUSPECT ID: ALPHA-09 (98.4%)",
    boxClassName:
      "left-[42%] top-[35%] h-[15%] w-[8%] border-[#ba1a1a] ring-1 ring-[#ba1a1a]/50",
    labelClassName: "bg-[#ba1a1a] text-white",
  },
  {
    label: "OBJECT: PERSON_002",
    boxClassName:
      "left-[65%] top-[42%] h-[14%] w-[7%] border-[#051125] ring-1 ring-[#051125]/50",
    labelClassName: "bg-[#051125] text-white",
  },
  {
    label: "OBJECT: PERSON_003",
    boxClassName: "left-[15%] top-[28%] h-[16%] w-[9%] border-[#c5c6cd] opacity-60",
    labelClassName: "bg-[#e1e3e4] text-[#191c1d]",
  },
];

export const metaChips: MetaChip[] = [
  {
    label: "Resolution",
    value: "3840 x 2160 (4K)",
    borderClassName: "border-[#051125]",
    valueClassName: "text-[#051125]",
  },
  {
    label: "Bitrate",
    value: "12.4 Mbps",
    borderClassName: "border-[#051125]",
    valueClassName: "text-[#051125]",
  },
  {
    label: "Threat Level",
    value: "CRITICAL (High Match)",
    borderClassName: "border-[#ba1a1a]",
    valueClassName: "text-[#ba1a1a]",
  },
  {
    label: "AI Processing",
    value: "Hardware Accelerated",
    borderClassName: "border-[#2a9d8f]",
    valueClassName: "text-[#2a9d8f]",
  },
];

export const diagnosticPreviewImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBBGPNKq63KCW5vYcL08tLeDgV8XYpF2iIhN0ncWVhikgo3GCEnYg63gmyCVpCmhJdCJ_fTRY52X8ha_Goi0pJafl71nJd5npR2Q_MS1kMEGWH3WfwohmZsxbW5EAAogtmM1e9uUdOEfb71F1xr0g1xgm5mGctJBFBYcyTY5pAEl_ctJFtKotM8MXogIF5UH04Aq6TDYoPxaA7QxBNPJmnefX42jfkFK6dx9Spr7qujP2K505HKfks62Ibn87UQDV7IrFrKVx38gkw";

export const diagnosticEngines = [
  { label: "AI", className: "bg-[#ba1a1a]" },
  { label: "DB", className: "bg-[#051125]" },
  { label: "IR", className: "bg-[#47607e]" },
];
