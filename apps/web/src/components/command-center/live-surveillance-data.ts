export type FeedDetection = {
  label: string;
  boxClassName: string;
  labelClassName?: string;
};

export type LiveFeedCard = {
  cameraName: string;
  streamStatus: string;
  streamDotClassName: string;
  streamDotAnimated?: boolean;
  resolution?: string;
  imageUrl: string;
  imageAlt: string;
  detections: FeedDetection[];
  zoneLabel: string;
  zoneName: string;
  statusBadge: string;
  statusBadgeClassName: string;
  footerClassName: string;
  footerIconWrapClassName: string;
  footerIconClassName: string;
  footerLabelClassName: string;
  topOverlayClassName: string;
  cardClassName?: string;
  flagButtonClassName?: string;
};

export type IntelligenceFeedItem = {
  icon: string;
  iconClassName: string;
  borderClassName: string;
  label: string;
  elapsed: string;
  title: string;
  description?: string;
  chips: string[];
  location?: string;
};

export const liveFeedCards: LiveFeedCard[] = [
  {
    cameraName: "CAM-01: Entrance North",
    streamStatus: "REC 00:42:12",
    streamDotClassName: "bg-[#ba1a1a]",
    streamDotAnimated: true,
    resolution: "1080p | 60fps",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCPZHvwX9NMU2Fiu4r8lzAGyF3tbZaKPEIdz6C7mrAQjM8e2WgBFJJT3nHZu-rRGccTw87tyh-J1vnTkXXs5IRhH8loa2Y-GYDLt1GnPiVfR0kOo-xJtrkqbs1n02FGD3ms91SxiHO2NTCi5CDZEdVAMdLloVVylsXPqbnM59pFU2t-EnhPVX52zsBW01lGJx15CXAFyrwgqKtc5BABylP2vYp-mgcxCuQ2iWmSpKg1XOl_HjD35bfNMSglrX9oZLGkrH1ZyHi6UPM",
    imageAlt:
      "High angle view of a modern glass office building entrance with people walking in the courtyard",
    detections: [
      {
        label: "Person 84%",
        boxClassName: "left-1/4 top-1/3 h-24 w-12",
      },
      {
        label: "Vehicle 91%",
        boxClassName:
          "bottom-1/4 right-1/3 h-20 w-32 border-[#bbc6e2] bg-[#bbc6e2]/10",
        labelClassName: "bg-[#051125]",
      },
    ],
    zoneLabel: "Perimeter Zone A",
    zoneName: "HQ South Plaza",
    statusBadge: "SECURE",
    statusBadgeClassName: "bg-[#c2dcff] text-[#48617e]",
    footerClassName: "bg-[#f3f4f5]/50",
    footerIconWrapClassName: "bg-[#e7e8e9]",
    footerIconClassName: "text-[#051125]",
    footerLabelClassName: "text-[#45474d]",
    topOverlayClassName: "from-black/60 to-transparent",
  },
  {
    cameraName: "CAM-04: Parking Level 2",
    streamStatus: "LIVE",
    streamDotClassName: "bg-[#2a9d8f]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD4tuxp-BNOovh0fpvo_Xrs3t60NuluI8i2JrB1O-h2wiior7D04pXOAtxMHYeK-EtedihSSwpOOJqTlMUEIJiwviOinYySDePg3_4RUQEq4D9FW4ThGE8tSlaim8dn32alZB43fgiBq6dncwi0I-w2IFmkZfHPP-tv8qzHtc1oe4iSXXiP4Ycn5hLg_9Iy-LFDk98tcxe0RFnA6EPgpiiz7iU63brIYfzvUmLix0Fbg08NNLEuK_Rn0RqfMUIa8rYfbHG_pp9LGyM",
    imageAlt:
      "Modern concrete underground parking garage with low neon lighting and long perspective lines",
    detections: [
      {
        label: "Vehicle 98%",
        boxClassName:
          "left-1/2 top-1/2 h-24 w-48 -translate-x-1/2 -translate-y-1/2 border-[#bbc6e2] bg-[#bbc6e2]/10",
        labelClassName: "bg-[#051125]",
      },
    ],
    zoneLabel: "Internal Zone C",
    zoneName: "East Garage",
    statusBadge: "SECURE",
    statusBadgeClassName: "bg-[#c2dcff] text-[#48617e]",
    footerClassName: "bg-[#f3f4f5]/50",
    footerIconWrapClassName: "bg-[#e7e8e9]",
    footerIconClassName: "text-[#051125]",
    footerLabelClassName: "text-[#45474d]",
    topOverlayClassName: "from-black/60 to-transparent",
  },
  {
    cameraName: "CAM-07: Executive Lobby",
    streamStatus: "ALERT: MOTION DETECTED",
    streamDotClassName: "bg-white",
    streamDotAnimated: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDRwB7Fg84bGMd96j1RTgL7AL7i-OZcAimZX7dUBetHsZ6ER8Fp3CkGonnyWQu2yt5p_8UJ2W_GLv2Ve0D31t0a6niSMoqiB66lEpqRYf7I_cTVdLas-ULn1HFtf6Sekm4yYvXuW7aKfPvpFqUqU1Qg5W58dr0AAOEo_DpBJxD0thrsni9J_pt6mn8_upX8CnIKAhP4DPW3Zd6Bj0U0oe4p_HVfo0J195M7ZpsnEo2XpvfMTUas54_w2zQHHeefhb-ms5uj0zVJfIU",
    imageAlt:
      "Ultra-modern minimalist office lobby with white marble and glass architecture",
    detections: [
      {
        label: "Restricted Access",
        boxClassName: "bottom-1/4 left-1/3 h-32 w-16 border-[#ba1a1a] bg-[#ba1a1a]/10",
        labelClassName: "bg-[#ba1a1a]",
      },
    ],
    zoneLabel: "Priority 1 Zone",
    zoneName: "Lobby Floor 42",
    statusBadge: "ACTIVE ALERT",
    statusBadgeClassName: "bg-[#ba1a1a] text-white",
    footerClassName: "bg-[#ffdad6]/20",
    footerIconWrapClassName: "bg-[#ffdad6]",
    footerIconClassName: "text-[#ba1a1a]",
    footerLabelClassName: "text-[#ba1a1a]",
    topOverlayClassName: "from-[#ba1a1a]/60 to-transparent",
    cardClassName: "ring-2 ring-inset ring-[#ba1a1a]/30",
    flagButtonClassName: "bg-[#ba1a1a] text-white",
  },
  {
    cameraName: "CAM-09: Loading Dock 3",
    streamStatus: "LIVE",
    streamDotClassName: "bg-[#2a9d8f]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCta8cLVnj9zto8itqlss1TInmPEv6MyOod9GGKY9JVwfNuWhsuLSd_Zk6HV2Px3SN_Pe-MBKKPFPpvk9V3LPgQDAUnPx_2zGuO9hJ5vMrVaFFzMjiYUCkPcQwT-VwgRKz8_VRP1tclJTdkt9yjS9VhKJyjkCBQasbRTysmmkKBC5F8LWOqBVChRt2eosNxOSPR5IdbNcrD4zzmXYt_pwxuHPJt8gk9BleHNjyD5kmtHK_9N3E_nKJ2GmPmqPieHo8zt1kyQfPwBHc",
    imageAlt:
      "Busy logistics warehouse loading dock with a semi truck being loaded at night",
    detections: [],
    zoneLabel: "Industrial Zone B",
    zoneName: "Rear Logistics",
    statusBadge: "SECURE",
    statusBadgeClassName: "bg-[#c2dcff] text-[#48617e]",
    footerClassName: "bg-[#f3f4f5]/50",
    footerIconWrapClassName: "bg-[#e7e8e9]",
    footerIconClassName: "text-[#051125]",
    footerLabelClassName: "text-[#45474d]",
    topOverlayClassName: "from-black/60 to-transparent",
  },
  {
    cameraName: "CAM-02: Data Center A",
    streamStatus: "LIVE",
    streamDotClassName: "bg-[#2a9d8f]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCWOiI8DXN1ZieRKOAomRO6Xzw1vDRCfsuSMBc1MqPLyanfNzZIJaXNisAkINylcht6xjdhjhpFZ9GmeTpZJcsgBOZVXiSD5MuMP8l3_Mo55y6d7VGTjXbN2jD0T4RAHvIg0ik-c7-wrqomxN5gyoGz2sLW-LRAcdj5zfOC3YER-T22Xut5KwrkbyZ7pdnNQ1xJJ4Uuzva7EHF-S1b5g7VzqCDeJ6Bh6QNCwfFgN8hgdZW1d7JPbcsMMjbpnIGSyOHXkGPa4oI-6z4",
    imageAlt:
      "Rows of server racks in a high-security data center with blue status lights",
    detections: [],
    zoneLabel: "Restricted Zone D",
    zoneName: "Tier 4 Vault",
    statusBadge: "SECURE",
    statusBadgeClassName: "bg-[#c2dcff] text-[#48617e]",
    footerClassName: "bg-[#f3f4f5]/50",
    footerIconWrapClassName: "bg-[#e7e8e9]",
    footerIconClassName: "text-[#051125]",
    footerLabelClassName: "text-[#45474d]",
    topOverlayClassName: "from-black/60 to-transparent",
  },
  {
    cameraName: "CAM-11: Helipad North",
    streamStatus: "LIVE",
    streamDotClassName: "bg-[#2a9d8f]",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDyf6tTqfzKpS2mPovv5DJ00LRLwRlDXzQKbqpHRPBXiMuvo3tPEE6J2ddTqcMf62q5oZ_sEKlqpFYlWz0bfVI2O-jE73D7IvtaqBn7Z-OL8UBmLLhCkYL2BLCTtfoUTWE32806ep3Cb-eldqm9UECnSCs8OOPoKiWou74Jz9G-INvT4SUTZOWq57m6LJfyYNmMkDwtAXlTUKS_TjmNXnlCTk4VhpSw1HW67uJ5nL-pZvSEwMSlN6rJELuYepCfcC2f_kU3Ajdy5-A",
    imageAlt:
      "Architectural rooftop helipad at twilight with city lights in the background",
    detections: [],
    zoneLabel: "Perimeter Zone G",
    zoneName: "Rooftop Alpha",
    statusBadge: "SECURE",
    statusBadgeClassName: "bg-[#c2dcff] text-[#48617e]",
    footerClassName: "bg-[#f3f4f5]/50",
    footerIconWrapClassName: "bg-[#e7e8e9]",
    footerIconClassName: "text-[#051125]",
    footerLabelClassName: "text-[#45474d]",
    topOverlayClassName: "from-black/60 to-transparent",
  },
];

export const intelligenceFeedItems: IntelligenceFeedItem[] = [
  {
    icon: "person_alert",
    iconClassName: "text-[#ba1a1a]",
    borderClassName: "border-[#ba1a1a]",
    label: "High Priority",
    elapsed: "2m ago",
    title: "Unidentified Entity Detected",
    chips: ["CAM-07", "94% Confidence"],
    location: "Executive Lobby Floor 42",
  },
  {
    icon: "directions_car",
    iconClassName: "text-[#a28963]",
    borderClassName: "border-[#dfc299]",
    label: "Vehicle ID",
    elapsed: "12m ago",
    title: "Known Plate Identified",
    description: "Plate: ABC-1234 (Staff)",
    chips: ["CAM-04", "99% Confidence"],
  },
  {
    icon: "package_2",
    iconClassName: "text-[#47607e]",
    borderClassName: "border-[#47607e]",
    label: "Pattern Detected",
    elapsed: "18m ago",
    title: "Standard Delivery Arrival",
    chips: ["CAM-09", "82% Confidence"],
  },
  {
    icon: "face",
    iconClassName: "text-[#47607e]",
    borderClassName: "border-[#47607e]",
    label: "Face Recognition",
    elapsed: "25m ago",
    title: "Authorized Entry: Sarah J.",
    chips: ["CAM-01", "97% Match"],
  },
];
