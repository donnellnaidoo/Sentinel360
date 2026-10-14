// South African demo dataset. Scenarios mirror the trends in the SAPS
// Q1 2026/27 crime statistics (released Aug 2026) and Parliament's Q4
// 2025/26 crime-stats analysis (Mar 2026): kidnapping-for-ransom
// concentrated in Gauteng, extortion/protection rackets (spaza shops, taxis,
// construction "business forums"), Gauteng-dominated carjacking and truck
// hijacking, Cape Flats gang murders, mob justice, liquor-outlet violence,
// rape at familiar residences (Inanda, Delft), illegal mining, cable theft,
// ATM bombings and Eastern Cape stock theft.
//
// Places, police precincts and courts are real. Every PERSON, plate and
// narrative detail is fictitious test data — do not mistake for real dockets.

export type UserKey = "donnell" | "serati" | "linda" | "devs" | "tashen" | "secure" | "timothy";

export const USERS: Record<UserKey, string> = {
  donnell: "05836f4f-2888-4ecd-8e81-e75ef061bf0d", // super_admin
  serati: "3cf59f9c-785d-45fe-aa65-fc6c6aabaea9", // investigator + admin
  linda: "73957b8f-f8ca-4e24-90d3-dab41b53ce6e",
  devs: "ed602b37-bfeb-4dd0-b386-2be2418f343d",
  tashen: "062ff03c-142d-47e8-8b22-20bad56e468d",
  secure: "3be75b92-5997-4a52-85fa-7ca4565abafb",
  timothy: "8b0bdfa4-c9b0-46db-8958-938dff1ea59f",
};
export const STAFF: UserKey[] = ["donnell", "serati"];
export const COMMUNITY: UserKey[] = ["linda", "devs", "tashen", "secure", "timothy"];

export type Place = { address: string; latitude: number; longitude: number };
const p = (address: string, latitude: number, longitude: number): Place => ({ address, latitude, longitude });

export const PLACES = {
  kemptonPark: p("Outside Kempton River Mall, Kempton Park, Gauteng", -26.0985, 28.229),
  umlaziSite: p("Housing development site, Section V, Umlazi, KwaZulu-Natal", -29.9685, 30.884),
  n12Daveyton: p("N12 eastbound near the Daveyton off-ramp, Ekurhuleni, Gauteng", -26.153, 28.41),
  kwazakele: p("Tavern, Ntshekisa Road, KwaZakhele, Gqeberha, Eastern Cape", -33.883, 25.588),
  ivoryPark: p("Ivory Park Extension 2, Midrand, Gauteng", -25.993, 28.192),
  tembisa: p("Andrew Mapheto Drive, Tembisa, Gauteng", -25.997, 28.227),
  n3Heidelberg: p("N3 northbound near the Heidelberg off-ramp, Gauteng", -26.503, 28.357),
  nyanga: p("Spaza shop, Sithandatu Avenue, Nyanga, Cape Town", -33.993, 18.58),
  philippiEast: p("Philippi East, Cape Town, Western Cape", -34.0, 18.605),
  breeRank: p("Bree Street Taxi Rank, Johannesburg CBD, Gauteng", -26.2005, 28.0365),
  tafelsig: p("Tafelsig, Mitchells Plain, Cape Town", -34.057, 18.642),
  mfuleni: p("Extension 6, Mfuleni, Cape Town", -34.006, 18.683),
  inanda: p("Newtown A, Inanda, KwaZulu-Natal", -29.692, 30.945),
  delft: p("Delft South, Cape Town, Western Cape", -33.978, 18.644),
  riverlea: p("Disused mine shaft off Main Reef Road, Riverlea, Johannesburg", -26.2135, 27.972),
  stilfontein: p("Old shaft area near Stilfontein, North West", -26.843, 26.777),
  kraaifontein: p("Metrorail Northern Line near Kraaifontein station, Cape Town", -33.848, 18.723),
  vanderbijlpark: p("Shopping centre ATM bank, Vanderbijlpark CBD, Gauteng", -26.711, 27.837),
  durbanNorth: p("Residential complex, Durban North, KwaZulu-Natal", -29.79, 31.03),
  sandton: p("Jewellery store, Sandton City, Sandton, Gauteng", -26.1076, 28.0567),
  tsolo: p("Communal grazing land near Tsolo, OR Tambo District, Eastern Cape", -31.311, 28.756),
  bishopLavis: p("Bishop Lavis, Cape Town, Western Cape", -33.948, 18.572),
  hatfield: p("Hatfield, Pretoria, Gauteng", -25.748, 28.238),
  vosloorus: p("Vosloorus Extension 14, Ekurhuleni, Gauteng", -26.351, 28.205),
  bekkersdal: p("Tavern, Bekkersdal, West Rand, Gauteng", -26.287, 27.711),
  rustenburg: p("Mine hostel near Rustenburg, North West", -25.65, 27.35),
  jeppe: p("Jeppe Station precinct, Johannesburg, Gauteng", -26.204, 28.062),
  orangeFarm: p("Orange Farm Extension 7, Gauteng", -26.487, 27.862),
  milnerton: p("Montague Gardens business park, Milnerton, Cape Town", -33.869, 18.53),
  thohoyandou: p("Thohoyandou Block G, Limpopo", -22.945, 30.485),
  parkStation: p("Park Station concourse, Johannesburg CBD, Gauteng", -26.196, 28.042),
  warwick: p("Warwick Junction taxi rank, Durban CBD, KwaZulu-Natal", -29.858, 31.013),
  bellville: p("Bellville public transport interchange, Cape Town", -33.903, 18.629),
  maponya: p("Maponya Mall, Pimville, Soweto, Gauteng", -26.258, 27.91),
  williamNicol: p("N1 / William Nicol Drive off-ramp, Fourways, Gauteng", -26.05, 28.011),
  malibongwe: p("N1 / Malibongwe Drive off-ramp, Randburg, Gauteng", -26.067, 27.987),
  gugulethu: p("NY1, Gugulethu, Cape Town", -33.976, 18.566),
  umlaziMall: p("Umlazi Mega City, Umlazi, KwaZulu-Natal", -29.97, 30.889),
};
export type PlaceKey = keyof typeof PLACES;

// ---------------------------------------------------------------- people --
export type PersonSpec = {
  key: string;
  entityType: "PERSON" | "VEHICLE";
  displayName: string;
  physicalDescription: string;
  charges: string[];
  plates?: string[];
  status: "ACTIVE" | "INACTIVE";
  watchlist?: { priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; reason: string; caseKey: string };
  seenAt?: PlaceKey[];
};

export const PEOPLE: PersonSpec[] = [
  { key: "mthembu", entityType: "PERSON", displayName: "Sibusiso \"Bra Sbu\" Mthembu", status: "INACTIVE",
    physicalDescription: "Male, approx. 41, 1.80 m, heavy build, shaved head, scar above left eyebrow.",
    charges: ["Kidnapping", "Extortion", "Possession of unlicensed firearm"], seenAt: ["kemptonPark"] },
  { key: "kekana", entityType: "PERSON", displayName: "Thabo Kekana", status: "INACTIVE",
    physicalDescription: "Male, approx. 29, 1.74 m, slim, short dreadlocks.",
    charges: ["Kidnapping", "Defeating the ends of justice"], seenAt: ["kemptonPark"] },
  { key: "zungu", entityType: "PERSON", displayName: "Mandla Zungu", status: "ACTIVE",
    physicalDescription: "Male, approx. 46, 1.70 m, stocky, grey beard, often wears a business-forum T-shirt.",
    charges: ["Extortion", "Intimidation"], seenAt: ["umlaziSite", "umlaziMall"] },
  { key: "molefe", entityType: "PERSON", displayName: "Kagiso Molefe", status: "ACTIVE",
    physicalDescription: "Male, approx. 34, 1.85 m, athletic build, tattoo of a lion on right forearm.",
    charges: ["Robbery with aggravating circumstances (CIT)", "Attempted murder", "Possession of prohibited firearm"],
    watchlist: { priority: "CRITICAL", reason: "Absconded after the N12 cash-in-transit robbery; armed and dangerous — do not approach.", caseKey: "cit" },
    seenAt: ["n12Daveyton", "vosloorus"] },
  { key: "ntuli", entityType: "PERSON", displayName: "Lwazi Ntuli", status: "INACTIVE",
    physicalDescription: "Male, approx. 27, 1.76 m, slim, gold front tooth.",
    charges: ["Robbery with aggravating circumstances (CIT)"], seenAt: ["n12Daveyton"] },
  { key: "mkhize", entityType: "PERSON", displayName: "Andile Mkhize", status: "INACTIVE",
    physicalDescription: "Male, approx. 31, 1.78 m, medium build.",
    charges: ["Murder (6 counts)", "Attempted murder (4 counts)", "Possession of unlicensed firearm"], seenAt: ["kwazakele"] },
  { key: "shabangu", entityType: "PERSON", displayName: "Vusi \"Lucky\" Shabangu", status: "ACTIVE",
    physicalDescription: "Male, approx. 38, 1.82 m, medium build, wears a black Kangol cap, walks with a slight limp.",
    charges: ["Carjacking", "Theft of motor vehicle", "Fraudulent vehicle registration"],
    watchlist: { priority: "HIGH", reason: "Suspected coordinator of a Toyota Hilux/Fortuner carjacking syndicate operating in Ivory Park and Tembisa.", caseKey: "carjack" },
    seenAt: ["ivoryPark", "tembisa", "williamNicol"] },
  { key: "mahlangu", entityType: "PERSON", displayName: "Neo Mahlangu", status: "ACTIVE",
    physicalDescription: "Male, approx. 24, 1.72 m, slim, braids.",
    charges: ["Carjacking", "Possession of suspected stolen property"], seenAt: ["tembisa"] },
  { key: "adams", entityType: "PERSON", displayName: "Ricardo \"Boeta\" Adams", status: "ACTIVE",
    physicalDescription: "Male, approx. 36, 1.75 m, prison-gang tattoos on neck and hands, missing right incisor.",
    charges: ["Murder (2 counts)", "Contravention of POCA (gang activity)", "Dealing in drugs"],
    watchlist: { priority: "CRITICAL", reason: "Wanted for the Tafelsig double murder; linked to ongoing gang turf war in Mitchells Plain.", caseKey: "gang" },
    seenAt: ["tafelsig", "bishopLavis"] },
  { key: "mgqibisa", entityType: "PERSON", displayName: "Zola Mgqibisa", status: "ACTIVE",
    physicalDescription: "Male, approx. 33, 1.79 m, slim, usually in a red tracksuit top, travels in a white Toyota Quantum.",
    charges: ["Extortion", "Malicious damage to property", "Intimidation"],
    watchlist: { priority: "HIGH", reason: "Collects weekly \"protection fees\" from spaza shops in Nyanga and Philippi East.", caseKey: "spaza" },
    seenAt: ["nyanga", "philippiEast", "bellville", "gugulethu"] },
  { key: "dube", entityType: "PERSON", displayName: "Sizwe Dube", status: "ACTIVE",
    physicalDescription: "Male, approx. 40, 1.83 m, heavy build, close-cropped hair, sunglasses.",
    charges: ["Murder", "Extortion", "Possession of unlicensed firearm"],
    watchlist: { priority: "CRITICAL", reason: "Suspected hitman in the Bree Street taxi rank shooting linked to route-extortion dispute.", caseKey: "taxi" },
    seenAt: ["breeRank", "parkStation"] },
  { key: "cele", entityType: "PERSON", displayName: "Bongani Cele", status: "INACTIVE",
    physicalDescription: "Male, approx. 35, 1.77 m, medium build.",
    charges: ["Rape", "Assault GBH"], seenAt: ["inanda"] },
  { key: "mokoena", entityType: "PERSON", displayName: "Teboho Mokoena", status: "ACTIVE",
    physicalDescription: "Male, approx. 44, 1.68 m, stocky, burn scars on both hands.",
    charges: ["Illegal mining (MPRDA)", "Possession of explosives", "Dealing in unwrought precious metals"],
    watchlist: { priority: "HIGH", reason: "Alleged financier of illegal mining crews at disused Riverlea and Stilfontein shafts.", caseKey: "zama" },
    seenAt: ["riverlea", "stilfontein"] },
  { key: "pillay", entityType: "PERSON", displayName: "Jason Pillay", status: "ACTIVE",
    physicalDescription: "Male, approx. 28, 1.73 m, slim, glasses.",
    charges: ["Fraud", "Contravention of the Cybercrimes Act 19 of 2020"], seenAt: ["hatfield"] },
  { key: "jacobs", entityType: "PERSON", displayName: "Ashwin Jacobs", status: "INACTIVE",
    physicalDescription: "Male, approx. 39, 1.70 m, thin, shaved head.",
    charges: ["Manufacturing of drugs (methamphetamine)", "Dealing in drugs"], seenAt: ["bishopLavis"] },
  { key: "radebe", entityType: "PERSON", displayName: "Sipho Radebe", status: "ACTIVE",
    physicalDescription: "Male, approx. 30, 1.81 m, medium build, wore a reflective vest during the bombing.",
    charges: ["Robbery with aggravating circumstances", "Possession of explosives", "Malicious damage to property"],
    watchlist: { priority: "HIGH", reason: "Identified on CCTV at the Vanderbijlpark ATM bombing; suspected member of an explosives crew.", caseKey: "atm" },
    seenAt: ["vanderbijlpark"] },
  { key: "hilux", entityType: "VEHICLE", displayName: "White Toyota Hilux GD-6 double cab", status: "ACTIVE",
    physicalDescription: "White 2023 Hilux GD-6 Raider, tinted windows, tow bar removed. Hijacked in Ivory Park.",
    charges: ["Hijacked vehicle"], plates: ["HJ 42 KL GP"],
    watchlist: { priority: "HIGH", reason: "Hijacked at gunpoint in Ivory Park; suspected to be heading for the Lebombo border.", caseKey: "carjack" },
    seenAt: ["ivoryPark", "williamNicol"] },
  { key: "fortuner", entityType: "VEHICLE", displayName: "Silver Toyota Fortuner", status: "ACTIVE",
    physicalDescription: "Silver 2022 Fortuner 2.8 GD-6, roof racks, dent on rear left door. Used as a follow car in hijackings.",
    charges: ["Vehicle used in commission of crime"], plates: ["JK 18 PX GP"],
    watchlist: { priority: "MEDIUM", reason: "Follow car linked to the Ivory Park/Tembisa carjacking syndicate.", caseKey: "carjack" },
    seenAt: ["tembisa", "malibongwe"] },
  { key: "quantum", entityType: "VEHICLE", displayName: "White Toyota Quantum minibus", status: "ACTIVE",
    physicalDescription: "White 14-seater Quantum, no route signage, cracked windscreen.",
    charges: ["Vehicle used in extortion"], plates: ["CA 739-412"],
    watchlist: { priority: "MEDIUM", reason: "Used by spaza-shop extortion collectors in Nyanga.", caseKey: "spaza" },
    seenAt: ["nyanga", "gugulethu"] },
  { key: "polo", entityType: "VEHICLE", displayName: "Grey VW Polo Vivo", status: "ACTIVE",
    physicalDescription: "Grey Polo Vivo hatchback, false plates suspected. Getaway car in the Durban North house robbery.",
    charges: ["Vehicle used in commission of crime"], plates: ["ND 451-993"], seenAt: ["durbanNorth"] },
];

// ----------------------------------------------------------------- cases --
export type HearingSpec = {
  type: "FIRST_APPEARANCE" | "BAIL_HEARING" | "PRE_TRIAL" | "PLEA" | "TRIAL" | "SENTENCING" | "APPEAL" | "POSTPONEMENT";
  at: string;
  court: string;
  roll?: string;
  officer?: string;
  outcome: "PENDING" | "POSTPONED" | "PROCEEDED" | "GUILTY" | "NOT_GUILTY" | "SENTENCED" | "WITHDRAWN" | "STRUCK_OFF_ROLL";
  notes?: string;
  next?: string;
  bail?: { cls: "SCHEDULE_1" | "SCHEDULE_5" | "SCHEDULE_6" | "NONE"; amount?: string; conditions?: string; decision: "GRANTED" | "DENIED" };
};

export type CaseSpec = {
  key: string;
  number: string;
  type: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "UNDER_INVESTIGATION" | "AWAITING_REVIEW" | "CLOSED" | "ARCHIVED";
  assignee: UserKey | null;
  creator: UserKey;
  sensitive?: boolean;
  created: string;
  reviewAt?: string;
  closed?: string;
  resolution?: string;
  incidents: { type: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; title: string; description: string; at: string; place: PlaceKey; status?: string }[];
  notes: { type: "GENERAL" | "INTERVIEW" | "SURVEILLANCE" | "FOLLOW_UP"; at: string; content: string }[];
  evidence: { title: string; description: string; at: string; place: PlaceKey; camera?: string; label: string }[];
  people?: { person: string; role: "SUSPECT" | "PERSON_OF_INTEREST" | "WITNESS" | "VICTIM" | "ARRESTED"; at: string; notes?: string }[];
  arrests?: { person: string; at: string; withWarrant: boolean; warrant?: string; custody: "IN_CUSTODY" | "RELEASED_ON_BAIL" | "RELEASED_NO_CHARGE" | "ESCAPED"; place: PlaceKey; notes?: string }[];
  decisions?: { decision: "PROCEED_TO_TRIAL" | "DECLINE_TO_PROSECUTE" | "DIVERSION" | "FURTHER_INVESTIGATION" | "PLEA_BARGAIN"; prosecutor: string; at: string; reason: string }[];
  hearings?: HearingSpec[];
};

export const CASES: CaseSpec[] = [
  // ------------------------------------------------------------ 2025 -----
  {
    key: "kidnap", number: "S360-2025-00001", type: "Kidnapping", priority: "CRITICAL", status: "CLOSED",
    title: "Kidnapping for ransom — businessman abducted outside Kempton River Mall",
    description: "Owner of a logistics company was forced into a grey sedan in the mall parking area. Captors demanded R2.5 million via WhatsApp voice notes. Victim rescued after 4 days in a house in Birch Acres following a joint operation with Crime Intelligence. Part of the Gauteng ransom-kidnapping trend (Gauteng accounts for ~76% of ransom kidnappings nationally).",
    assignee: "serati", creator: "donnell", created: "2025-11-03T19:20:00+02:00", reviewAt: "2026-02-10T09:00:00+02:00",
    closed: "2026-06-24T15:30:00+02:00", resolution: "Both accused convicted in the Gauteng Division of the High Court. Mthembu sentenced to 25 years, Kekana to 15 years. Victim's family assisted by Victim Empowerment Programme.",
    incidents: [
      { type: "KIDNAPPING", severity: "CRITICAL", title: "Abduction in mall parking area", description: "Witnesses saw a man forced into a grey sedan by two armed suspects at 18:55.", at: "2025-11-03T18:55:00+02:00", place: "kemptonPark" },
      { type: "EXTORTION", severity: "HIGH", title: "Ransom demand received", description: "Family received a ransom demand of R2.5m via WhatsApp from an unregistered number.", at: "2025-11-04T10:12:00+02:00", place: "kemptonPark" },
    ],
    notes: [
      { type: "INTERVIEW", at: "2025-11-04T13:00:00+02:00", content: "Interviewed spouse. Victim had no known threats; company recently won a large municipal tender — possible tip-off motive." },
      { type: "SURVEILLANCE", at: "2025-11-06T22:40:00+02:00", content: "Cellphone tower data places the ransom number in Birch Acres, Kempton Park. Tactical Response Team briefed." },
      { type: "FOLLOW_UP", at: "2025-11-07T05:30:00+02:00", content: "Victim rescued unharmed from a rented house. Two suspects arrested on scene; a 9mm pistol with filed-off serial number recovered." },
    ],
    evidence: [
      { title: "Mall parking CCTV still — abduction", description: "Exit camera frame showing the grey sedan leaving at 18:57.", at: "2025-11-03T18:57:00+02:00", place: "kemptonPark", camera: "CAM-EKU-KRM-06", label: "Grey sedan exiting parking — suspects in rear seat" },
      { title: "Ransom message screenshot", description: "Screenshot of the WhatsApp ransom demand provided by the family.", at: "2025-11-04T10:20:00+02:00", place: "kemptonPark", label: "Ransom demand — R2.5m — 48 hour deadline" },
      { title: "Recovered firearm photo", description: "9mm pistol with obliterated serial number recovered at the Birch Acres house.", at: "2025-11-07T06:10:00+02:00", place: "kemptonPark", label: "Exhibit A1 — 9mm pistol, serial filed off" },
    ],
    people: [
      { person: "mthembu", role: "SUSPECT", at: "2025-11-07T06:00:00+02:00", notes: "Ringleader; negotiated the ransom." },
      { person: "kekana", role: "SUSPECT", at: "2025-11-07T06:00:00+02:00", notes: "Guarded the victim at the house." },
    ],
    arrests: [
      { person: "mthembu", at: "2025-11-07T05:30:00+02:00", withWarrant: false, custody: "IN_CUSTODY", place: "kemptonPark", notes: "Arrested during rescue operation." },
      { person: "kekana", at: "2025-11-07T05:35:00+02:00", withWarrant: false, custody: "IN_CUSTODY", place: "kemptonPark" },
    ],
    decisions: [{ decision: "PROCEED_TO_TRIAL", prosecutor: "Adv. N. Maseko (NPA, Gauteng Local Division)", at: "2026-02-12T10:00:00+02:00", reason: "Victim identification, phone records and recovered firearm provide a strong prima facie case." }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2025-11-09T09:00:00+02:00", court: "Kempton Park Magistrate's Court", roll: "KP 1123/2025", officer: "Magistrate L. Nkosi", outcome: "POSTPONED", next: "2025-11-17T09:00:00+02:00", notes: "Remanded in custody; matter postponed for formal bail application." },
      { type: "BAIL_HEARING", at: "2025-11-17T09:00:00+02:00", court: "Kempton Park Magistrate's Court", roll: "KP 1123/2025", officer: "Magistrate L. Nkosi", outcome: "PROCEEDED", notes: "Accused failed to show exceptional circumstances.", bail: { cls: "SCHEDULE_6", decision: "DENIED" } },
      { type: "TRIAL", at: "2026-04-20T10:00:00+02:00", court: "Gauteng Division of the High Court, Johannesburg", roll: "SS 41/2026", officer: "Judge M. van der Merwe", outcome: "GUILTY", notes: "Both accused convicted of kidnapping and extortion." },
      { type: "SENTENCING", at: "2026-06-24T10:00:00+02:00", court: "Gauteng Division of the High Court, Johannesburg", roll: "SS 41/2026", officer: "Judge M. van der Merwe", outcome: "SENTENCED", notes: "Mthembu: 25 years. Kekana: 15 years." },
    ],
  },
  {
    key: "construction", number: "S360-2025-00002", type: "Extortion", priority: "HIGH", status: "AWAITING_REVIEW",
    title: "Construction \"business forum\" extortion — 30% stake demanded at Umlazi housing site",
    description: "Armed group claiming to be a local business forum stopped work on a government-subsidised housing project and demanded 30% of the contract value. Site manager threatened at gunpoint; work halted for 3 weeks. Construction-sector extortion is estimated to have cost the economy ~R68bn over a decade.",
    assignee: "serati", creator: "serati", created: "2025-12-02T08:40:00+02:00", reviewAt: "2026-09-18T14:00:00+02:00",
    incidents: [
      { type: "EXTORTION", severity: "HIGH", title: "Armed group halts construction work", description: "About 15 people, some armed, entered the site and ordered workers off.", at: "2025-12-01T07:10:00+02:00", place: "umlaziSite" },
      { type: "INTIMIDATION", severity: "MEDIUM", title: "Threatening calls to site manager", description: "Site manager received three threatening calls demanding a meeting with the \"forum\".", at: "2025-12-04T20:30:00+02:00", place: "umlaziSite" },
    ],
    notes: [
      { type: "INTERVIEW", at: "2025-12-03T11:00:00+02:00", content: "Contractor confirms demand of 30% of the R48m contract. Names Mandla Zungu as spokesperson." },
      { type: "FOLLOW_UP", at: "2026-03-15T10:00:00+02:00", content: "Referred to the Provincial Extortion Task Team. Contractor agreed to testify." },
    ],
    evidence: [
      { title: "Site gate CCTV still", description: "Group entering the site at 07:08.", at: "2025-12-01T07:08:00+02:00", place: "umlaziSite", camera: "CAM-DBN-UMZ-SITE-01", label: "Approx. 15 persons entering site gate" },
      { title: "Voice-note transcript", description: "Transcript of threatening voice note sent to site manager.", at: "2025-12-04T21:00:00+02:00", place: "umlaziSite", label: "Voice note transcript — demand for 30% stake" },
    ],
    people: [
      { person: "zungu", role: "SUSPECT", at: "2025-12-03T12:00:00+02:00", notes: "Identified by contractor as forum spokesperson." },
    ],
    arrests: [{ person: "zungu", at: "2026-01-20T06:00:00+02:00", withWarrant: true, warrant: "J50-UMZ-0094/2026", custody: "RELEASED_ON_BAIL", place: "umlaziSite" }],
    decisions: [{ decision: "PROCEED_TO_TRIAL", prosecutor: "Adv. S. Govender (NPA, KZN)", at: "2026-08-28T10:00:00+02:00", reason: "Contractor and two workers willing to testify; voice notes forensically linked to accused's phone." }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2026-01-22T09:00:00+02:00", court: "Umlazi Magistrate's Court", roll: "UMZ 87/2026", officer: "Magistrate P. Ngcobo", outcome: "PROCEEDED" },
      { type: "BAIL_HEARING", at: "2026-01-29T09:00:00+02:00", court: "Umlazi Magistrate's Court", roll: "UMZ 87/2026", officer: "Magistrate P. Ngcobo", outcome: "PROCEEDED", bail: { cls: "SCHEDULE_5", amount: "20000.00", conditions: "Not to contact state witnesses or enter the construction site; report to Umlazi SAPS every Monday.", decision: "GRANTED" } },
      { type: "TRIAL", at: "2026-11-16T10:00:00+02:00", court: "Durban Regional Court", roll: "RC 512/2026", outcome: "PENDING" },
    ],
  },
  {
    key: "cit", number: "S360-2025-00003", type: "Cash-in-Transit Robbery", priority: "CRITICAL", status: "UNDER_INVESTIGATION",
    title: "Cash-in-transit robbery — armoured vehicle bombed on the N12 near Daveyton",
    description: "A cash van was rammed by a Mercedes-Benz sedan and its safe blown open with explosives. 8 suspects with R5 rifles fired on guards; one guard wounded. Undisclosed amount taken. Gauteng remains the main CIT hotspot.",
    assignee: "serati", creator: "donnell", created: "2025-12-18T11:30:00+02:00",
    incidents: [
      { type: "CASH_IN_TRANSIT_ROBBERY", severity: "CRITICAL", title: "CIT van rammed and bombed", description: "Van forced off the road; explosives used to open the safe; shots fired.", at: "2025-12-18T10:47:00+02:00", place: "n12Daveyton" },
    ],
    notes: [
      { type: "GENERAL", at: "2025-12-18T15:00:00+02:00", content: "54 R5/AK cartridges recovered. Ballistics linked two firearms to a 2025 CIT in Mpumalanga." },
      { type: "FOLLOW_UP", at: "2026-02-02T09:00:00+02:00", content: "Ntuli arrested in Vosloorus with R86 000 in dye-stained notes. Molefe fled before the raid — circulated as wanted." },
      { type: "SURVEILLANCE", at: "2026-09-30T20:00:00+02:00", content: "Informer reports Molefe moving between Vosloorus and Daveyton using a borrowed taxi." },
    ],
    evidence: [
      { title: "Dashcam still — ramming", description: "Frame from a passing motorist's dashcam.", at: "2025-12-18T10:47:00+02:00", place: "n12Daveyton", camera: "DASHCAM-PUBLIC", label: "Mercedes sedan ramming CIT vehicle" },
      { title: "Dye-stained notes", description: "Recovered banknotes stained by the cash-box dye system.", at: "2026-02-02T08:00:00+02:00", place: "vosloorus", label: "Exhibit B3 — R86 000 dye-stained notes" },
    ],
    people: [
      { person: "ntuli", role: "SUSPECT", at: "2026-02-02T08:30:00+02:00" },
      { person: "molefe", role: "SUSPECT", at: "2026-01-25T12:00:00+02:00", notes: "Identified via cellphone records; at large." },
    ],
    arrests: [{ person: "ntuli", at: "2026-02-02T05:45:00+02:00", withWarrant: true, warrant: "J50-BEN-0031/2026", custody: "IN_CUSTODY", place: "vosloorus" }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2026-02-04T09:00:00+02:00", court: "Benoni Magistrate's Court", roll: "BEN 220/2026", officer: "Magistrate K. Dlamini", outcome: "POSTPONED", next: "2026-02-11T09:00:00+02:00" },
      { type: "BAIL_HEARING", at: "2026-02-11T09:00:00+02:00", court: "Benoni Magistrate's Court", roll: "BEN 220/2026", officer: "Magistrate K. Dlamini", outcome: "PROCEEDED", bail: { cls: "SCHEDULE_6", decision: "DENIED" } },
      { type: "PRE_TRIAL", at: "2026-09-08T09:00:00+02:00", court: "Benoni Regional Court", roll: "BEN 220/2026", outcome: "POSTPONED", next: "2026-11-05T09:00:00+02:00", notes: "Postponed for outstanding cellphone-records analysis." },
    ],
  },
  {
    key: "tavern", number: "S360-2025-00004", type: "Murder", priority: "CRITICAL", status: "ARCHIVED",
    title: "Mass shooting at KwaZakhele tavern — 6 killed",
    description: "Gunman opened fire on patrons at an unlicensed tavern after an argument over a pool game. 6 killed, 4 wounded. KwaZakhele recorded the most murders of any station nationally in Q4 2025/26; liquor outlets remain a recurring setting.",
    assignee: "serati", creator: "donnell", created: "2025-08-10T01:15:00+02:00", reviewAt: "2025-12-01T10:00:00+02:00",
    closed: "2026-03-27T15:00:00+02:00", resolution: "Accused pleaded guilty. Sentenced to 6 life terms plus 40 years. Tavern closed by Eastern Cape Liquor Board.",
    incidents: [
      { type: "MURDER", severity: "CRITICAL", title: "Shooting at tavern", description: "Shots fired inside the tavern at approx. 23:40.", at: "2025-08-09T23:40:00+02:00", place: "kwazakele" },
    ],
    notes: [
      { type: "INTERVIEW", at: "2025-08-10T10:00:00+02:00", content: "Tavern owner confirms premises had no liquor licence. Argument started over a R20 pool bet." },
      { type: "FOLLOW_UP", at: "2025-08-12T16:00:00+02:00", content: "Accused handed himself over at KwaZakhele SAPS with his attorney." },
    ],
    evidence: [
      { title: "Scene photograph — tavern interior", description: "Scene photographed by LCRC.", at: "2025-08-10T03:00:00+02:00", place: "kwazakele", label: "LCRC scene photo — 23 cartridge cases marked" },
    ],
    people: [{ person: "mkhize", role: "SUSPECT", at: "2025-08-12T16:00:00+02:00" }],
    arrests: [{ person: "mkhize", at: "2025-08-12T16:00:00+02:00", withWarrant: false, custody: "IN_CUSTODY", place: "kwazakele", notes: "Handed himself over." }],
    decisions: [{ decision: "PROCEED_TO_TRIAL", prosecutor: "Adv. T. Jacobs (NPA, Eastern Cape)", at: "2025-12-03T10:00:00+02:00", reason: "Multiple eyewitnesses and ballistic match." }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2025-08-14T09:00:00+02:00", court: "Gqeberha Magistrate's Court", roll: "GQ 902/2025", outcome: "PROCEEDED" },
      { type: "PLEA", at: "2026-03-02T10:00:00+02:00", court: "Eastern Cape Division of the High Court, Gqeberha", roll: "CC 12/2026", officer: "Judge A. Mbenenge", outcome: "GUILTY", notes: "Accused pleaded guilty on all counts." },
      { type: "SENTENCING", at: "2026-03-27T10:00:00+02:00", court: "Eastern Cape Division of the High Court, Gqeberha", roll: "CC 12/2026", officer: "Judge A. Mbenenge", outcome: "SENTENCED", notes: "6 life terms plus 40 years." },
    ],
  },
  // ------------------------------------------------------------ 2026 -----
  {
    key: "carjack", number: "S360-2026-00001", type: "Carjacking", priority: "HIGH", status: "UNDER_INVESTIGATION",
    title: "Carjacking syndicate targeting Toyota Hilux and Fortuner — Ivory Park and Tembisa",
    description: "Series of 7 carjackings since July where victims were followed home from N1 off-ramps and robbed at gunpoint in their driveways. Vehicles believed to be moved to Mozambique. Gauteng accounts for ~58% of national carjackings.",
    assignee: "serati", creator: "donnell", created: "2026-07-21T09:00:00+02:00",
    incidents: [
      { type: "CARJACKING", severity: "HIGH", title: "Hilux hijacked in driveway", description: "Victim followed from the N1/William Nicol off-ramp and robbed at gunpoint at his gate.", at: "2026-07-19T21:15:00+02:00", place: "ivoryPark" },
      { type: "CARJACKING", severity: "HIGH", title: "Fortuner hijacked at traffic light", description: "Two armed men took a Fortuner at a red light on Andrew Mapheto Drive.", at: "2026-08-14T19:40:00+02:00", place: "tembisa" },
      { type: "CARJACKING", severity: "HIGH", title: "Follow-home hijacking attempt", description: "Driver noticed a silver Fortuner following and drove to a police station.", at: "2026-09-27T20:05:00+02:00", place: "malibongwe" },
    ],
    notes: [
      { type: "GENERAL", at: "2026-07-22T10:00:00+02:00", content: "Pattern: victims in late-model Toyotas, followed from N1 off-ramps between 19:00 and 22:00." },
      { type: "SURVEILLANCE", at: "2026-08-20T23:00:00+02:00", content: "ANPR hits on JK 18 PX GP (silver Fortuner) near three of the scenes within 30 min of the hijackings." },
      { type: "FOLLOW_UP", at: "2026-09-29T11:00:00+02:00", content: "Mahlangu arrested driving the follow car; released on R10 000 bail. Shabangu still at large." },
    ],
    evidence: [
      { title: "Driveway CCTV — Hilux hijacking", description: "Neighbour's camera frame.", at: "2026-07-19T21:16:00+02:00", place: "ivoryPark", camera: "CAM-PRIV-IVP-12", label: "Two armed suspects at driveway gate" },
      { title: "ANPR hit — follow car", description: "ANPR capture of the Fortuner on the N1.", at: "2026-08-14T19:12:00+02:00", place: "williamNicol", camera: "ANPR-N1-WN-02", label: "ANPR: JK 18 PX GP — 19:12" },
      { title: "Tracker report", description: "Tracking company report showing the Hilux heading east on the N4.", at: "2026-07-20T02:30:00+02:00", place: "ivoryPark", label: "Vehicle tracker — last ping N4 near Komatipoort" },
    ],
    people: [
      { person: "shabangu", role: "SUSPECT", at: "2026-08-21T09:00:00+02:00" },
      { person: "mahlangu", role: "SUSPECT", at: "2026-09-28T10:00:00+02:00" },
      { person: "hilux", role: "VICTIM", at: "2026-07-21T09:30:00+02:00", notes: "Stolen vehicle." },
      { person: "fortuner", role: "PERSON_OF_INTEREST", at: "2026-08-20T23:30:00+02:00", notes: "Follow car." },
    ],
    arrests: [{ person: "mahlangu", at: "2026-09-27T21:00:00+02:00", withWarrant: false, custody: "RELEASED_ON_BAIL", place: "malibongwe" }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2026-09-29T09:00:00+02:00", court: "Tembisa Magistrate's Court", roll: "TMB 611/2026", outcome: "PROCEEDED" },
      { type: "BAIL_HEARING", at: "2026-10-06T09:00:00+02:00", court: "Tembisa Magistrate's Court", roll: "TMB 611/2026", outcome: "PROCEEDED", bail: { cls: "SCHEDULE_5", amount: "10000.00", conditions: "Surrender passport; report daily to Tembisa SAPS.", decision: "GRANTED" }, next: "2026-11-19T09:00:00+02:00" },
    ],
  },
  {
    key: "truck", number: "S360-2026-00002", type: "Truck Hijacking", priority: "HIGH", status: "OPEN",
    title: "Truck hijacking — grocery load taken on the N3 near Heidelberg",
    description: "Truck carrying R1.2m in groceries pulled over by men in a vehicle with blue lights posing as police. Driver tied up and left in veld. Gauteng accounts for ~66% of truck hijackings.",
    assignee: null, creator: "donnell", created: "2026-10-11T07:30:00+02:00",
    incidents: [
      { type: "TRUCK_HIJACKING", severity: "HIGH", title: "Truck stopped by fake police", description: "Sedan with blue lights flagged truck down; three suspects took control.", at: "2026-10-11T02:20:00+02:00", place: "n3Heidelberg" },
    ],
    notes: [{ type: "GENERAL", at: "2026-10-11T08:00:00+02:00", content: "Truck recovered empty in Ratanda at 06:10. Awaiting assignment to an investigating officer." }],
    evidence: [{ title: "Truck telematics snapshot", description: "Fleet telematics route deviation.", at: "2026-10-11T02:35:00+02:00", place: "n3Heidelberg", label: "Telematics — route deviation 02:24, engine off 03:05" }],
  },
  {
    key: "spaza", number: "S360-2026-00003", type: "Extortion", priority: "HIGH", status: "UNDER_INVESTIGATION",
    title: "Protection-fee racket targeting spaza shops — Nyanga and Philippi East",
    description: "At least 14 spaza-shop owners report being forced to pay R500–R1 000 per week for \"protection\". Two shops set alight after owners refused. The Western Cape accounts for most protection-fee extortion cases nationally.",
    assignee: "serati", creator: "serati", created: "2026-08-03T10:00:00+02:00",
    incidents: [
      { type: "EXTORTION", severity: "HIGH", title: "Weekly protection fee collected", description: "Collectors in a white Quantum demanded R800 from a shop owner.", at: "2026-08-01T17:30:00+02:00", place: "nyanga" },
      { type: "ARSON", severity: "HIGH", title: "Spaza shop set alight", description: "Shop torched after owner refused to pay. No injuries.", at: "2026-08-22T02:10:00+02:00", place: "philippiEast" },
    ],
    notes: [
      { type: "INTERVIEW", at: "2026-08-04T12:00:00+02:00", content: "Three owners interviewed with an interpreter. All describe the same collector (red tracksuit top)." },
      { type: "SURVEILLANCE", at: "2026-09-12T16:00:00+02:00", content: "Quantum CA 739-412 observed making stops at 9 shops between 16:00 and 18:30 on Friday." },
    ],
    evidence: [
      { title: "Shop CCTV — collection", description: "Shop counter camera.", at: "2026-08-01T17:31:00+02:00", place: "nyanga", camera: "CAM-PRIV-NYA-03", label: "Collector at counter receiving cash" },
      { title: "Fire scene photo", description: "Burnt-out spaza shop.", at: "2026-08-22T07:00:00+02:00", place: "philippiEast", label: "Fire scene — accelerant suspected" },
    ],
    people: [
      { person: "mgqibisa", role: "SUSPECT", at: "2026-08-05T09:00:00+02:00" },
      { person: "quantum", role: "PERSON_OF_INTEREST", at: "2026-09-12T17:00:00+02:00" },
    ],
  },
  {
    key: "taxi", number: "S360-2026-00004", type: "Murder", priority: "CRITICAL", status: "UNDER_INVESTIGATION", sensitive: true,
    title: "Taxi-rank shooting linked to route extortion — Bree Street, Johannesburg CBD",
    description: "Taxi association marshal shot dead at the Bree Street rank during rush hour after a dispute over route levies. Two commuters wounded. Taxi-related businesses are the most frequent target of protection rackets in SAPS extortion data.",
    assignee: "serati", creator: "donnell", created: "2026-09-16T08:00:00+02:00",
    incidents: [
      { type: "MURDER", severity: "CRITICAL", title: "Marshal shot at taxi rank", description: "Gunman fired 8 shots at a marshal, then fled on foot towards Park Station.", at: "2026-09-16T07:12:00+02:00", place: "breeRank" },
    ],
    notes: [
      { type: "INTERVIEW", at: "2026-09-17T10:00:00+02:00", content: "Association chairperson reluctant to talk. Witness protection being considered for a commuter witness." },
      { type: "SURVEILLANCE", at: "2026-10-02T18:00:00+02:00", content: "Camera network flagged a person matching Dube near Park Station; operator confirmed partial match." },
    ],
    evidence: [
      { title: "Rank CCTV — shooter", description: "City camera frame at the rank.", at: "2026-09-16T07:12:00+02:00", place: "breeRank", camera: "CAM-JHB-BREE-03", label: "Shooter in dark jacket, sunglasses" },
      { title: "Cartridge cases", description: "8 x 9mm cartridge cases collected by LCRC.", at: "2026-09-16T09:00:00+02:00", place: "breeRank", label: "Exhibit C1–C8 — 9mm cartridge cases" },
    ],
    people: [{ person: "dube", role: "SUSPECT", at: "2026-09-20T12:00:00+02:00" }],
  },
  {
    key: "gang", number: "S360-2026-00005", type: "Murder", priority: "CRITICAL", status: "UNDER_INVESTIGATION", sensitive: true,
    title: "Gang-related double murder — Tafelsig, Mitchells Plain",
    description: "Two men shot dead in a drive-by in Tafelsig amid a turf war between rival gangs. A 9-year-old was wounded by a stray bullet. 225 of 242 gang-related murders in Q4 2025/26 were in the Western Cape.",
    assignee: "serati", creator: "serati", created: "2026-09-05T22:00:00+02:00",
    incidents: [
      { type: "MURDER", severity: "CRITICAL", title: "Drive-by shooting", description: "Occupants of a white sedan opened fire on a group outside a flat.", at: "2026-09-05T20:45:00+02:00", place: "tafelsig" },
      { type: "ATTEMPTED_MURDER", severity: "HIGH", title: "Child wounded by stray bullet", description: "9-year-old struck in the leg; taken to Mitchells Plain Hospital.", at: "2026-09-05T20:46:00+02:00", place: "tafelsig" },
    ],
    notes: [
      { type: "GENERAL", at: "2026-09-06T09:00:00+02:00", content: "Anti-Gang Unit taking the lead with the station detective branch. Retaliation expected." },
      { type: "INTERVIEW", at: "2026-09-08T15:00:00+02:00", content: "Witness (protected) identifies Adams as the front-seat shooter." },
    ],
    evidence: [
      { title: "ShotSpotter alert record", description: "Acoustic gunshot detection alert.", at: "2026-09-05T20:45:00+02:00", place: "tafelsig", label: "ShotSpotter: 11 rounds detected 20:45:12" },
      { title: "Street camera — white sedan", description: "Neighbourhood watch camera frame.", at: "2026-09-05T20:44:00+02:00", place: "tafelsig", camera: "CAM-NHW-TAF-02", label: "White sedan, no plates visible" },
    ],
    people: [
      { person: "adams", role: "SUSPECT", at: "2026-09-08T16:00:00+02:00" },
    ],
  },
  {
    key: "mob", number: "S360-2026-00006", type: "Murder", priority: "HIGH", status: "AWAITING_REVIEW",
    title: "Mob justice killing of suspected housebreaker — Mfuleni",
    description: "A man accused of housebreaking was assaulted and set alight by a crowd. Vigilantism was the second-largest cause of murder in Q4 2025/26. Mfuleni is among the top three murder stations nationally.",
    assignee: "serati", creator: "donnell", created: "2026-08-17T09:00:00+02:00", reviewAt: "2026-10-08T12:00:00+02:00",
    incidents: [
      { type: "MURDER", severity: "HIGH", title: "Crowd assault on suspected thief", description: "Crowd of ~40 assaulted a man accused of breaking into homes; victim died on scene.", at: "2026-08-16T22:30:00+02:00", place: "mfuleni" },
    ],
    notes: [
      { type: "INTERVIEW", at: "2026-08-19T11:00:00+02:00", content: "Residents frustrated by repeated burglaries; few willing to identify participants." },
      { type: "FOLLOW_UP", at: "2026-10-08T11:00:00+02:00", content: "Docket submitted to the senior public prosecutor for a decision on three identified participants." },
    ],
    evidence: [{ title: "Cellphone video still", description: "Frame from a video circulated on social media.", at: "2026-08-16T22:35:00+02:00", place: "mfuleni", label: "Social-media video frame — crowd at scene" }],
  },
  {
    key: "gbv", number: "S360-2026-00007", type: "Sexual Offence", priority: "HIGH", status: "UNDER_INVESTIGATION", sensitive: true,
    title: "Rape at familiar residence — Inanda",
    description: "Woman raped by an acquaintance at her home. Two-thirds of rapes occur at the residence of the victim or perpetrator; Inanda recorded the highest number of rapes nationally in Q4 2025/26. Victim referred to a Thuthuzela Care Centre.",
    assignee: "serati", creator: "serati", created: "2026-09-21T08:00:00+02:00",
    incidents: [{ type: "RAPE", severity: "HIGH", title: "Rape reported at residence", description: "Victim reported at Inanda SAPS; FCS unit notified.", at: "2026-09-20T23:00:00+02:00", place: "inanda" }],
    notes: [
      { type: "INTERVIEW", at: "2026-09-21T10:00:00+02:00", content: "Statement taken by FCS officer in private room. Sexual assault evidence kit collected at Thuthuzela Care Centre." },
      { type: "FOLLOW_UP", at: "2026-09-23T14:00:00+02:00", content: "Suspect arrested at his workplace. Protection order applied for." },
    ],
    evidence: [{ title: "J88 medico-legal report (cover page)", description: "Cover page of the J88 form — contents restricted.", at: "2026-09-21T09:30:00+02:00", place: "inanda", label: "J88 cover page — RESTRICTED" }],
    people: [{ person: "cele", role: "SUSPECT", at: "2026-09-22T09:00:00+02:00" }],
    arrests: [{ person: "cele", at: "2026-09-23T13:30:00+02:00", withWarrant: false, custody: "IN_CUSTODY", place: "inanda" }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2026-09-25T09:00:00+02:00", court: "Ntuzuma Magistrate's Court", roll: "NTZ 1402/2026", outcome: "POSTPONED", next: "2026-10-02T09:00:00+02:00" },
      { type: "BAIL_HEARING", at: "2026-10-02T09:00:00+02:00", court: "Ntuzuma Magistrate's Court", roll: "NTZ 1402/2026", outcome: "PROCEEDED", bail: { cls: "SCHEDULE_5", decision: "DENIED" }, next: "2026-11-12T09:00:00+02:00" },
      { type: "PRE_TRIAL", at: "2026-11-12T09:00:00+02:00", court: "Ntuzuma Magistrate's Court", roll: "NTZ 1402/2026", outcome: "PENDING" },
    ],
  },
  {
    key: "dv", number: "S360-2026-00008", type: "Domestic Violence", priority: "HIGH", status: "OPEN",
    title: "Domestic violence — attempted murder of partner, Delft",
    description: "Woman stabbed by her partner in breach of a protection order. Attempted murder rose 8.7% in Q1 2026/27.",
    assignee: null, creator: "donnell", created: "2026-10-12T23:30:00+02:00",
    incidents: [{ type: "ATTEMPTED_MURDER", severity: "HIGH", title: "Stabbing in breach of protection order", description: "Victim stabbed twice; neighbour called 10111.", at: "2026-10-12T22:50:00+02:00", place: "delft" }],
    notes: [{ type: "GENERAL", at: "2026-10-13T08:00:00+02:00", content: "Victim stable at Tygerberg Hospital. Suspect fled; partner's details on file." }],
    evidence: [],
  },
  {
    key: "zama", number: "S360-2026-00009", type: "Illegal Mining", priority: "HIGH", status: "UNDER_INVESTIGATION",
    title: "Illegal mining syndicate at disused shafts — Riverlea and Stilfontein",
    description: "Armed illegal miners operating at disused shafts; residents report gunfire and explosions at night. Part of Operation Vala Umgodi focus areas.",
    assignee: "donnell", creator: "donnell", created: "2026-07-08T09:00:00+02:00",
    incidents: [
      { type: "ILLEGAL_MINING", severity: "HIGH", title: "Shootout between rival mining groups", description: "Residents report sustained gunfire near shaft entrance.", at: "2026-07-07T01:30:00+02:00", place: "riverlea" },
      { type: "ILLEGAL_MINING", severity: "MEDIUM", title: "Explosives and gold-bearing material seized", description: "Joint operation recovered explosives and 40 bags of ore.", at: "2026-08-25T06:00:00+02:00", place: "stilfontein" },
    ],
    notes: [
      { type: "GENERAL", at: "2026-07-08T12:00:00+02:00", content: "Coordinating with Department of Mineral Resources and SANDF under Operation Vala Umgodi." },
      { type: "SURVEILLANCE", at: "2026-09-14T03:00:00+02:00", content: "Night drone flight observed supplies being lowered into the shaft around 02:00." },
    ],
    evidence: [
      { title: "Seized explosives", description: "Photographed before disposal by the bomb squad.", at: "2026-08-25T07:30:00+02:00", place: "stilfontein", label: "Exhibit D1 — commercial explosives, detonators" },
      { title: "Drone still — shaft entrance", description: "Thermal drone frame.", at: "2026-09-14T02:05:00+02:00", place: "riverlea", camera: "DRONE-SAPS-07", label: "Thermal: 6 persons at shaft entrance" },
    ],
    people: [{ person: "mokoena", role: "SUSPECT", at: "2026-08-26T09:00:00+02:00" }],
  },
  {
    key: "cable", number: "S360-2026-00010", type: "Infrastructure Theft", priority: "MEDIUM", status: "OPEN",
    title: "Copper cable theft disrupting Metrorail Northern Line — Kraaifontein",
    description: "Fourth cable theft on this section in a month, cancelling trains between Bellville and Kraaifontein. Classified as essential infrastructure crime under the Criminal Matters Amendment Act.",
    assignee: null, creator: "serati", created: "2026-10-09T07:00:00+02:00",
    incidents: [{ type: "INFRASTRUCTURE_THEFT", severity: "MEDIUM", title: "Signal cable cut and stolen", description: "Approx. 300 m of signalling cable removed overnight.", at: "2026-10-09T03:00:00+02:00", place: "kraaifontein" }],
    notes: [{ type: "GENERAL", at: "2026-10-09T09:00:00+02:00", content: "PRASA protection services to share patrol logs. Scrap dealers in Kraaifontein to be inspected." }],
    evidence: [{ title: "Cut cable photo", description: "Cable cut ends at the trench.", at: "2026-10-09T06:30:00+02:00", place: "kraaifontein", label: "Cut signalling cable — trench 2" }],
  },
  {
    key: "atm", number: "S360-2026-00011", type: "Robbery", priority: "HIGH", status: "UNDER_INVESTIGATION",
    title: "ATM bombing at shopping centre — Vanderbijlpark",
    description: "Three ATMs blown up with commercial explosives at 02:30. Shopfronts damaged; cash taken. Vanderbijlpark recorded one of the largest murder increases in Q4 2025/26, and explosives crews remain active in the Vaal.",
    assignee: "serati", creator: "donnell", created: "2026-09-02T06:00:00+02:00",
    incidents: [{ type: "ATM_BOMBING", severity: "HIGH", title: "Three ATMs bombed", description: "Explosions heard at 02:31; suspects fled in a white Audi.", at: "2026-09-02T02:31:00+02:00", place: "vanderbijlpark" }],
    notes: [{ type: "FOLLOW_UP", at: "2026-09-10T10:00:00+02:00", content: "Bank's forensic team confirms R1.4m taken. Facial comparison of a suspect without a balaclava has started." }],
    evidence: [
      { title: "Mall CCTV — suspect unmasked", description: "Suspect briefly without balaclava.", at: "2026-09-02T02:28:00+02:00", place: "vanderbijlpark", camera: "CAM-VAAL-MALL-14", label: "Suspect in reflective vest, face visible" },
      { title: "Blast damage", description: "Damage to ATM bank.", at: "2026-09-02T05:00:00+02:00", place: "vanderbijlpark", label: "Blast damage — ATMs 1–3" },
    ],
    people: [{ person: "radebe", role: "SUSPECT", at: "2026-09-12T09:00:00+02:00" }],
  },
  {
    key: "houserob", number: "S360-2026-00012", type: "Robbery", priority: "HIGH", status: "AWAITING_REVIEW",
    title: "Armed house robbery — family held at gunpoint, Durban North",
    description: "Four armed suspects entered through a kitchen door, tied up a family of four and stole jewellery, laptops and a vehicle. KwaZulu-Natal carries ~27% of national residential robberies.",
    assignee: "serati", creator: "serati", created: "2026-08-09T06:00:00+02:00", reviewAt: "2026-10-05T10:00:00+02:00",
    incidents: [{ type: "HOUSE_ROBBERY", severity: "HIGH", title: "Armed home invasion", description: "Family held for 40 minutes; suspects fled in a grey Polo Vivo.", at: "2026-08-09T01:20:00+02:00", place: "durbanNorth" }],
    notes: [{ type: "FOLLOW_UP", at: "2026-10-04T15:00:00+02:00", content: "Stolen laptop traced to a pawn shop; fingerprints from the kitchen door sent to LCRC. Ready for prosecutor review." }],
    evidence: [
      { title: "Estate gate CCTV — getaway car", description: "Gate camera frame.", at: "2026-08-09T02:01:00+02:00", place: "durbanNorth", camera: "CAM-PRIV-DBN-N-01", label: "Grey Polo Vivo ND 451-993 leaving" },
      { title: "Pawn shop receipt", description: "Receipt for the stolen laptop.", at: "2026-09-30T12:00:00+02:00", place: "durbanNorth", label: "Second-hand goods register — entry 4471" },
    ],
    people: [{ person: "polo", role: "PERSON_OF_INTEREST", at: "2026-08-09T09:00:00+02:00" }],
  },
  {
    key: "smash", number: "S360-2026-00013", type: "Robbery", priority: "HIGH", status: "CLOSED",
    title: "Smash-and-grab robbery at jewellery store — Sandton City",
    description: "Five suspects with hammers and a pistol smashed display cabinets and fled with watches valued at R3.2m. Mall security and Sandton SAPS responded within 4 minutes.",
    assignee: "serati", creator: "donnell", created: "2026-06-12T15:00:00+02:00", reviewAt: "2026-08-01T10:00:00+02:00",
    closed: "2026-09-04T16:00:00+02:00", resolution: "Three suspects arrested and goods worth R2.7m recovered. The accused accepted a plea and sentence agreement (s105A CPA). Docket closed.",
    incidents: [{ type: "BUSINESS_ROBBERY", severity: "HIGH", title: "Jewellery store robbery", description: "Display cabinets smashed; suspects fled to the parking level.", at: "2026-06-12T13:40:00+02:00", place: "sandton" }],
    notes: [{ type: "GENERAL", at: "2026-06-13T10:00:00+02:00", content: "Watches recovered at a Hillbrow flat during a follow-up operation." }],
    evidence: [{ title: "Store CCTV", description: "In-store camera frame.", at: "2026-06-12T13:40:00+02:00", place: "sandton", camera: "CAM-SDN-STORE-02", label: "Suspects at display cabinets with hammers" }],
    decisions: [{ decision: "PLEA_BARGAIN", prosecutor: "Adv. R. Naidoo (NPA, Randburg)", at: "2026-08-20T10:00:00+02:00", reason: "Accused agreed to a s105A plea and sentence agreement; the complainant was consulted." }],
    hearings: [{ type: "SENTENCING", at: "2026-09-03T10:00:00+02:00", court: "Randburg Regional Court", roll: "RAN 77/2026", outcome: "SENTENCED", notes: "12 years each, 3 suspended." }],
  },
  {
    key: "stock", number: "S360-2026-00014", type: "Stock Theft", priority: "MEDIUM", status: "UNDER_INVESTIGATION",
    title: "Cattle theft — 23 head taken from communal grazing near Tsolo",
    description: "23 Nguni cattle stolen overnight; tracks lead toward the R61. The Eastern Cape accounts for ~29% of national stock theft.",
    assignee: "donnell", creator: "donnell", created: "2026-09-25T10:00:00+02:00",
    incidents: [{ type: "STOCK_THEFT", severity: "MEDIUM", title: "Cattle driven off grazing land", description: "Herders found the kraal fence cut at dawn.", at: "2026-09-25T03:00:00+02:00", place: "tsolo" }],
    notes: [{ type: "FOLLOW_UP", at: "2026-10-01T10:00:00+02:00", content: "Stock Theft Unit checking auctions and abattoirs for brand marks registered to complainants." }],
    evidence: [{ title: "Cut fence photo", description: "Kraal fence cut with bolt cutters.", at: "2026-09-25T07:00:00+02:00", place: "tsolo", label: "Kraal fence cut — vehicle tracks visible" }],
  },
  {
    key: "druglab", number: "S360-2026-00015", type: "Drug-Related", priority: "HIGH", status: "AWAITING_REVIEW",
    title: "Clandestine methamphetamine (tik) lab dismantled — Bishop Lavis",
    description: "Lab in a backyard structure producing an estimated 5 kg of tik per week. The Western Cape accounts for ~45% of drug-related crime detected by police action.",
    assignee: "serati", creator: "serati", created: "2026-08-27T05:00:00+02:00", reviewAt: "2026-10-10T09:00:00+02:00",
    incidents: [{ type: "DRUG_MANUFACTURING", severity: "HIGH", title: "Drug lab raid", description: "Raid following a tip-off; chemicals and equipment seized.", at: "2026-08-27T04:30:00+02:00", place: "bishopLavis" }],
    notes: [{ type: "GENERAL", at: "2026-09-15T10:00:00+02:00", content: "Forensic Science Laboratory confirms methamphetamine in all 12 samples." }],
    evidence: [
      { title: "Lab equipment", description: "Glassware and precursors at the scene.", at: "2026-08-27T05:30:00+02:00", place: "bishopLavis", label: "Exhibit E1 — glassware, ephedrine precursors" },
      { title: "FSL report cover", description: "Forensic Science Laboratory analysis certificate (s212 CPA).", at: "2026-09-15T09:00:00+02:00", place: "bishopLavis", label: "s212 certificate — 12/12 samples positive" },
    ],
    people: [{ person: "jacobs", role: "SUSPECT", at: "2026-08-27T05:00:00+02:00" }],
    arrests: [{ person: "jacobs", at: "2026-08-27T04:45:00+02:00", withWarrant: true, warrant: "SW-BL-0322/2026", custody: "IN_CUSTODY", place: "bishopLavis" }],
    hearings: [
      { type: "FIRST_APPEARANCE", at: "2026-08-29T09:00:00+02:00", court: "Bellville Magistrate's Court", roll: "BLV 990/2026", outcome: "PROCEEDED" },
      { type: "BAIL_HEARING", at: "2026-09-05T09:00:00+02:00", court: "Bellville Magistrate's Court", roll: "BLV 990/2026", outcome: "PROCEEDED", bail: { cls: "SCHEDULE_5", decision: "DENIED" } },
    ],
  },
  {
    key: "simswap", number: "S360-2026-00016", type: "Fraud", priority: "MEDIUM", status: "UNDER_INVESTIGATION",
    title: "SIM-swap banking fraud — R340 000 drained from victims' accounts, Pretoria",
    description: "Six victims lost money after fraudulent SIM swaps let suspects intercept banking OTPs. Commercial crime rose 4% year-on-year in Q4 2025/26 (45% over five years).",
    assignee: "serati", creator: "donnell", created: "2026-09-09T11:00:00+02:00",
    incidents: [{ type: "FRAUD", severity: "MEDIUM", title: "Unauthorised SIM swaps", description: "Network provider confirms six SIM swaps were done at the same franchise store.", at: "2026-09-08T15:00:00+02:00", place: "hatfield" }],
    notes: [{ type: "FOLLOW_UP", at: "2026-09-20T10:00:00+02:00", content: "Section 205 subpoena served on network provider for store logs. Store employee Pillay identified as person of interest." }],
    evidence: [{ title: "Bank fraud report", description: "Summary of fraudulent transfers.", at: "2026-09-09T10:00:00+02:00", place: "hatfield", label: "Bank report — 14 transfers, R340 000" }],
    people: [{ person: "pillay", role: "PERSON_OF_INTEREST", at: "2026-09-20T11:00:00+02:00" }],
  },
  {
    key: "missing", number: "S360-2026-00017", type: "Missing Person", priority: "CRITICAL", status: "UNDER_INVESTIGATION",
    title: "Missing 7-year-old girl — Vosloorus",
    description: "Child last seen walking home from school. Kidnapping has nearly doubled since 2021/22; Vosloorus is among the top stations. Amber-style community alert issued.",
    assignee: "serati", creator: "donnell", created: "2026-10-07T17:00:00+02:00",
    incidents: [{ type: "MISSING_PERSON", severity: "CRITICAL", title: "Child did not return from school", description: "Last seen at 14:20 near Vosloorus Extension 14 primary school.", at: "2026-10-07T14:20:00+02:00", place: "vosloorus" }],
    notes: [
      { type: "GENERAL", at: "2026-10-07T18:00:00+02:00", content: "Search with K9 unit, community patrollers and Missing Children SA. Photo circulated." },
      { type: "FOLLOW_UP", at: "2026-10-12T12:00:00+02:00", content: "Two community sightings received via Sentinel360 — being checked." },
    ],
    evidence: [{ title: "School gate CCTV", description: "Last known image of the child leaving school.", at: "2026-10-07T14:19:00+02:00", place: "vosloorus", camera: "CAM-SCH-VOS-01", label: "Last sighting — school gate 14:19" }],
  },
  {
    key: "bekkersdal", number: "S360-2026-00018", type: "Murder", priority: "HIGH", status: "OPEN",
    title: "Tavern stabbing after argument — Bekkersdal",
    description: "Patron stabbed to death after an argument at a tavern. Most murders stem from arguments, often at or near liquor outlets. Bekkersdal had one of the largest murder increases in Q4 2025/26.",
    assignee: null, creator: "serati", created: "2026-10-12T02:00:00+02:00",
    incidents: [{ type: "MURDER", severity: "HIGH", title: "Fatal stabbing at tavern", description: "Victim stabbed in the chest during a fight; suspect fled.", at: "2026-10-12T00:40:00+02:00", place: "bekkersdal" }],
    notes: [{ type: "GENERAL", at: "2026-10-12T09:00:00+02:00", content: "Tavern trading past licensed hours. Witness list obtained from owner." }],
    evidence: [],
  },
  {
    key: "hostel", number: "S360-2026-00019", type: "Assault", priority: "MEDIUM", status: "OPEN",
    title: "Assault GBH at mine hostel — Rustenburg",
    description: "Mineworker assaulted with a panga during a dispute at the hostel. North West was the only province where murder increased (Q1 2026/27: +8.8%).",
    assignee: null, creator: "donnell", created: "2026-10-13T10:00:00+02:00",
    incidents: [{ type: "ASSAULT_GBH", severity: "MEDIUM", title: "Panga assault at hostel", description: "Victim hospitalised with head wounds.", at: "2026-10-13T01:30:00+02:00", place: "rustenburg" }],
    notes: [],
    evidence: [],
  },
  {
    key: "burglary", number: "S360-2026-00020", type: "Burglary", priority: "LOW", status: "CLOSED",
    title: "Burglary at business premises — Montague Gardens, Milnerton",
    description: "Warehouse broken into overnight; power tools stolen. No CCTV coverage of the entry point.",
    assignee: "serati", creator: "serati", created: "2026-05-04T08:00:00+02:00", reviewAt: "2026-06-20T10:00:00+02:00",
    closed: "2026-07-02T12:00:00+02:00", resolution: "Undetected — no suspects identified after all leads were exhausted. Complainant informed; the docket can be reopened if new evidence emerges.",
    incidents: [{ type: "BURGLARY", severity: "LOW", title: "Warehouse break-in", description: "Roller door forced; tools worth R65 000 stolen.", at: "2026-05-04T02:00:00+02:00", place: "milnerton" }],
    notes: [{ type: "FOLLOW_UP", at: "2026-06-18T10:00:00+02:00", content: "Pawn shop checks negative. No fingerprints lifted." }],
    evidence: [{ title: "Forced roller door", description: "Point of entry.", at: "2026-05-04T08:30:00+02:00", place: "milnerton", label: "Point of entry — roller door forced" }],
  },
];

// ------------------------------------------------- AI pipeline incidents --
export type AiSpec = {
  key: string;
  type: "WEAPON_DETECTED" | "ANOMALY_DETECTED" | "PANIC_BUTTON" | "ALTERCATION" | "WATCHLIST_MATCH" | "PLATE_MATCH";
  camera: string;
  place: PlaceKey;
  at: string;
  confidence: number;
  detections: number;
  title: string;
  message: string;
  decision: "PENDING" | "DOCKETED" | "DISMISSED";
  dismissReason?: string;
  weaponClass?: string;
  watchPerson?: string;
  plate?: string;
  docket?: { number: string; title: string; description: string };
};

export const AI_EVENTS: AiSpec[] = [
  { key: "ai1", type: "WEAPON_DETECTED", camera: "CAM-JHB-BREE-03", place: "breeRank", at: "2026-10-13T18:42:00+02:00", confidence: 0.91, detections: 4, weaponClass: "handgun", decision: "PENDING",
    title: "Handgun detected — Bree Street Taxi Rank", message: "Possible handgun visible in waistband of male near rank entrance B." },
  { key: "ai2", type: "WATCHLIST_MATCH", camera: "CAM-CPT-BELL-04", place: "bellville", at: "2026-10-13T16:05:00+02:00", confidence: 0.78, detections: 2, watchPerson: "mgqibisa", decision: "PENDING",
    title: "Watchlist match — Zola Mgqibisa", message: "Face match (0.78) with HIGH-priority watchlist subject at Bellville interchange." },
  { key: "ai3", type: "PLATE_MATCH", camera: "ANPR-N1-WN-02", place: "williamNicol", at: "2026-10-12T20:11:00+02:00", confidence: 0.97, detections: 1, plate: "JK 18 PX GP", decision: "PENDING",
    title: "Plate match — JK 18 PX GP", message: "ANPR hit on silver Fortuner linked to carjacking syndicate, N1 northbound." },
  { key: "ai4", type: "ALTERCATION", camera: "CAM-DBN-WARW-07", place: "warwick", at: "2026-10-12T07:48:00+02:00", confidence: 0.83, detections: 6, decision: "PENDING",
    title: "Physical altercation — Warwick Junction", message: "Group fight detected between 5+ persons near the taxi holding area." },
  { key: "ai5", type: "WEAPON_DETECTED", camera: "CAM-JHB-PARK-11", place: "parkStation", at: "2026-10-12T07:15:00+02:00", confidence: 0.88, detections: 3, weaponClass: "handgun", decision: "DISMISSED",
    dismissReason: "Uniformed PSIRA-registered security officer carrying an issued firearm on duty.",
    title: "Handgun detected — Park Station concourse", message: "Holstered firearm detected on person near platform 6 stairs." },
  { key: "ai6", type: "WEAPON_DETECTED", camera: "CAM-JHB-JEPPE-02", place: "jeppe", at: "2026-10-09T17:32:00+02:00", confidence: 0.94, detections: 5, weaponClass: "rifle", decision: "DOCKETED",
    title: "Rifle detected — Jeppe Station precinct", message: "Long gun partially concealed under a jacket; subject entered a white sedan.",
    docket: { number: "S360-2026-00021", title: "AI detection: rifle carried in public — Jeppe Station precinct", description: "Docket opened from Sentinel360 AI review. Camera CAM-JHB-JEPPE-02 detected a rifle (94% confidence) carried by a male who entered a white sedan heading east on Jules Street. Linked for intelligence to the Bree Street taxi-rank shooting investigation." } },
  { key: "ai7", type: "ANOMALY_DETECTED", camera: "CAM-JHB-RVL-01", place: "riverlea", at: "2026-10-11T02:14:00+02:00", confidence: 0.72, detections: 9, decision: "PENDING",
    title: "After-hours movement — Riverlea shaft", message: "Repeated movement of persons carrying bags near a sealed shaft between 02:00 and 03:00." },
  { key: "ai8", type: "PANIC_BUTTON", camera: "PANIC-SOW-MAP-02", place: "maponya", at: "2026-10-10T19:22:00+02:00", confidence: 1, detections: 1, decision: "DISMISSED",
    dismissReason: "False activation — store staff confirmed accidental press during cleaning.",
    title: "Panic button activated — Maponya Mall", message: "Panic button pressed at store 112; no further signals." },
  { key: "ai9", type: "ALTERCATION", camera: "CAM-CPT-GUG-03", place: "gugulethu", at: "2026-10-08T22:40:00+02:00", confidence: 0.69, detections: 2, decision: "DISMISSED",
    dismissReason: "Footage reviewed — informal soccer game, no assault.",
    title: "Possible altercation — Gugulethu NY1", message: "Rapid movement of a group detected near a tavern." },
  { key: "ai10", type: "WEAPON_DETECTED", camera: "CAM-DBN-UMZ-02", place: "umlaziMall", at: "2026-10-13T12:03:00+02:00", confidence: 0.76, detections: 2, weaponClass: "knife", decision: "PENDING",
    title: "Knife detected — Umlazi Mega City", message: "Knife visible in hand of male near ATM bank; subject walking toward parking." },
  { key: "ai11", type: "WATCHLIST_MATCH", camera: "CAM-JHB-PARK-11", place: "parkStation", at: "2026-10-02T17:51:00+02:00", confidence: 0.81, detections: 3, watchPerson: "dube", decision: "PENDING",
    title: "Watchlist match — Sizwe Dube", message: "Face match (0.81) with CRITICAL watchlist subject at Park Station." },
  { key: "ai12", type: "PLATE_MATCH", camera: "ANPR-N1-MAL-01", place: "malibongwe", at: "2026-09-27T19:58:00+02:00", confidence: 0.95, detections: 1, plate: "JK 18 PX GP", decision: "DISMISSED",
    dismissReason: "Already actioned — vehicle intercepted and driver arrested under case S360-2026-00001.",
    title: "Plate match — JK 18 PX GP", message: "ANPR hit on silver Fortuner near Malibongwe off-ramp." },
];

// ------------------------------------------------- community sightings --
export type SightingSpec = {
  reporter: UserKey;
  type: "WANTED_PERSON_SIGHTING" | "COMMUNITY_REPORT";
  title: string;
  description: string;
  place: PlaceKey;
  at: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  subject?: string;
  anonymous?: boolean;
  moderation: "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE";
  reason?: string;
  duplicateOf?: number; // index into SIGHTINGS
  photo?: string; // label for a generated photo
  docket?: { number: string; title: string; description: string };
};

export const SIGHTINGS: SightingSpec[] = [
  { reporter: "tashen", type: "WANTED_PERSON_SIGHTING", subject: "molefe", title: "Man matching wanted CIT suspect at taxi rank", description: "Man with lion tattoo on forearm boarding a taxi to Daveyton. Looked like the wanted poster.", place: "vosloorus", at: "2026-09-29T07:40:00+02:00", severity: "HIGH", moderation: "APPROVED", reason: "Credible — consistent with informer reports. Forwarded to investigating officer." },
  { reporter: "linda", type: "COMMUNITY_REPORT", title: "Suspicious silver Fortuner following cars from off-ramp", description: "Silver Fortuner with roof racks followed me from the N1 off-ramp and drove off when I went into the petrol station.", place: "williamNicol", at: "2026-09-18T20:15:00+02:00", severity: "HIGH", moderation: "APPROVED", reason: "Matches the follow-car modus operandi in the carjacking investigation.", photo: "Silver SUV in petrol station forecourt" },
  { reporter: "timothy", type: "COMMUNITY_REPORT", title: "Men demanding money from spaza owners", description: "Two men in a white Quantum going shop to shop on Friday afternoon collecting cash. Owners look scared.", place: "nyanga", at: "2026-09-26T17:10:00+02:00", severity: "HIGH", moderation: "APPROVED", reason: "Corroborates the ongoing extortion investigation.", photo: "White minibus parked outside spaza shop" },
  { reporter: "secure", type: "WANTED_PERSON_SIGHTING", subject: "adams", title: "Wanted gang suspect seen at shebeen", description: "Saw the man from the wanted list with prison tattoos on his neck at a shebeen in Tafelsig around 22:00.", place: "tafelsig", at: "2026-10-03T22:05:00+02:00", severity: "CRITICAL", anonymous: true, moderation: "APPROVED", reason: "Passed to the Anti-Gang Unit. Reporter identity protected." },
  { reporter: "devs", type: "COMMUNITY_REPORT", title: "Cable thieves on railway line", description: "Three men with a bakkie digging next to the train line near Kraaifontein at 1am.", place: "kraaifontein", at: "2026-10-08T01:05:00+02:00", severity: "MEDIUM", moderation: "APPROVED", reason: "Timing matches the reported cable theft. PRASA notified.", photo: "Figures next to railway at night" },
  { reporter: "tashen", type: "WANTED_PERSON_SIGHTING", subject: "dube", title: "Possible sighting of taxi-rank shooting suspect", description: "Tall man with sunglasses who looks like the suspect was at the Park Station food court.", place: "parkStation", at: "2026-10-02T18:10:00+02:00", severity: "HIGH", moderation: "APPROVED", reason: "Consistent with AI watchlist match at the same location.",
    docket: { number: "S360-2026-00022", title: "Community sighting: wanted suspect Sizwe Dube at Park Station", description: "Docket opened from approved community sighting. Reporter observed a man matching CRITICAL watchlist subject Sizwe Dube at the Park Station food court; corroborated by AI watchlist match on CAM-JHB-PARK-11 the same evening." } },
  { reporter: "linda", type: "COMMUNITY_REPORT", title: "Little girl crying with adult man near tavern", description: "Saw a small girl in school uniform crying and being pulled by a man near the tavern on Monday afternoon.", place: "vosloorus", at: "2026-10-08T15:30:00+02:00", severity: "CRITICAL", moderation: "APPROVED", reason: "Possible lead in missing-child investigation. Forwarded immediately." },
  { reporter: "timothy", type: "COMMUNITY_REPORT", title: "Gunshots and explosions at old mine", description: "Every night this week we hear explosions and shooting from the old shaft. People coming out with bags in the morning.", place: "riverlea", at: "2026-10-10T02:30:00+02:00", severity: "HIGH", moderation: "APPROVED", reason: "Supports the illegal mining investigation." },
  { reporter: "secure", type: "WANTED_PERSON_SIGHTING", subject: "shabangu", title: "Carjacking suspect at car wash", description: "Man with black Kangol cap and limp at a car wash, talking to people about selling Hilux parts.", place: "ivoryPark", at: "2026-10-06T11:20:00+02:00", severity: "HIGH", moderation: "APPROVED", reason: "Forwarded to the investigating officer for follow-up." },
  { reporter: "devs", type: "COMMUNITY_REPORT", title: "Cattle being loaded into truck at night", description: "Saw cattle being loaded into a truck with no lights on the R61 near Tsolo around 3am.", place: "tsolo", at: "2026-09-25T03:20:00+02:00", severity: "MEDIUM", moderation: "APPROVED", reason: "Same night as the reported stock theft." },
  { reporter: "tashen", type: "COMMUNITY_REPORT", title: "Men waiting near ATMs at closing time", description: "Two men sitting in a white Audi watching the ATMs for over an hour.", place: "vanderbijlpark", at: "2026-10-11T21:45:00+02:00", severity: "MEDIUM", moderation: "APPROVED", reason: "Possible reconnaissance. Patrol requested.", photo: "White sedan parked facing ATMs" },
  { reporter: "linda", type: "COMMUNITY_REPORT", title: "Mob gathering with tyres", description: "Crowd gathering with tyres and petrol saying they caught a thief.", place: "mfuleni", at: "2026-10-13T19:10:00+02:00", severity: "CRITICAL", moderation: "APPROVED", reason: "Urgent — patrol vehicles dispatched to prevent mob violence." },
  // pending
  { reporter: "timothy", type: "WANTED_PERSON_SIGHTING", subject: "mgqibisa", title: "Extortion suspect at Bellville interchange", description: "Man in red tracksuit top I recognise from the wanted list getting into a Quantum at Bellville.", place: "bellville", at: "2026-10-13T16:20:00+02:00", severity: "HIGH", moderation: "PENDING" },
  { reporter: "devs", type: "COMMUNITY_REPORT", title: "Gunshots near taxi rank", description: "Heard about 5 shots near the rank around 6pm. People running.", place: "breeRank", at: "2026-10-13T18:05:00+02:00", severity: "HIGH", moderation: "PENDING" },
  { reporter: "secure", type: "COMMUNITY_REPORT", title: "Suspicious drone over school", description: "Drone hovering over the primary school during break time for 10 minutes.", place: "vosloorus", at: "2026-10-13T10:30:00+02:00", severity: "LOW", moderation: "PENDING" },
  { reporter: "linda", type: "COMMUNITY_REPORT", title: "Fake police roadblock", description: "Car with blue lights but no markings stopping trucks on the N3 around 1am.", place: "n3Heidelberg", at: "2026-10-14T01:15:00+02:00", severity: "HIGH", moderation: "PENDING", photo: "Unmarked sedan with blue lights on hard shoulder" },
  { reporter: "tashen", type: "WANTED_PERSON_SIGHTING", subject: "radebe", title: "ATM bombing suspect at fuel station", description: "Man resembling the ATM bomber photo buying airtime at the garage.", place: "vanderbijlpark", at: "2026-10-12T09:40:00+02:00", severity: "HIGH", moderation: "PENDING" },
  { reporter: "timothy", type: "COMMUNITY_REPORT", title: "House being used as drug den", description: "Lots of people coming and going at all hours, smell of chemicals from backyard.", place: "bishopLavis", at: "2026-10-11T23:00:00+02:00", severity: "MEDIUM", moderation: "PENDING", anonymous: true },
  { reporter: "devs", type: "WANTED_PERSON_SIGHTING", subject: "mokoena", title: "Mining boss at tavern", description: "Man with burn scars on hands paying for drinks with gold-coloured nuggets? Very strange.", place: "stilfontein", at: "2026-10-09T21:30:00+02:00", severity: "MEDIUM", moderation: "PENDING" },
  { reporter: "secure", type: "COMMUNITY_REPORT", title: "Hijacked-looking Hilux without plates", description: "White Hilux double cab, no number plates, tow bar removed, driving fast on the N4 east.", place: "ivoryPark", at: "2026-10-13T06:50:00+02:00", severity: "HIGH", moderation: "PENDING" },
  // rejected
  { reporter: "linda", type: "COMMUNITY_REPORT", title: "Neighbour playing loud music", description: "Neighbour has been playing loud music every night.", place: "hatfield", at: "2026-09-20T23:30:00+02:00", severity: "LOW", moderation: "REJECTED", reason: "By-law noise complaint — please contact the Tshwane Metro Police Department." },
  { reporter: "devs", type: "WANTED_PERSON_SIGHTING", subject: "molefe", title: "Saw the CIT robber on TV", description: "I think the man on a soapie last night was the wanted CIT robber.", place: "maponya", at: "2026-10-01T21:00:00+02:00", severity: "LOW", moderation: "REJECTED", reason: "Not a physical sighting — television appearance of an actor." },
  { reporter: "timothy", type: "COMMUNITY_REPORT", title: "Pothole on main road", description: "Huge pothole causing accidents.", place: "orangeFarm", at: "2026-09-15T08:00:00+02:00", severity: "LOW", moderation: "REJECTED", reason: "Infrastructure issue — report to the City of Johannesburg's Joburg Connect line." },
  { reporter: "tashen", type: "COMMUNITY_REPORT", title: "Test report", description: "Testing the app, please ignore.", place: "sandton", at: "2026-09-10T12:00:00+02:00", moderation: "REJECTED", reason: "Test submission." },
  // duplicates
  { reporter: "secure", type: "COMMUNITY_REPORT", title: "Spaza owners being forced to pay", description: "White taxi going to all the spaza shops collecting money on Friday.", place: "nyanga", at: "2026-09-26T17:40:00+02:00", severity: "HIGH", moderation: "DUPLICATE", duplicateOf: 2, reason: "Same event as ST-2026-00003." },
  { reporter: "devs", type: "COMMUNITY_REPORT", title: "Crowd with tyres in Mfuleni", description: "People gathering with tyres and petrol, they say they caught a thief.", place: "mfuleni", at: "2026-10-13T19:20:00+02:00", severity: "CRITICAL", moderation: "DUPLICATE", duplicateOf: 11, reason: "Same event as ST-2026-00012 — already dispatched." },
  { reporter: "timothy", type: "WANTED_PERSON_SIGHTING", subject: "dube", title: "Dube at Park Station", description: "The wanted taxi guy was at Park Station tonight.", place: "parkStation", at: "2026-10-02T18:30:00+02:00", severity: "HIGH", moderation: "DUPLICATE", duplicateOf: 5, reason: "Same sighting as ST-2026-00006." },
];

// ------------------------------------------------- community broadcasts --
export const BROADCASTS: { type: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; title: string; message: string; place: PlaceKey; at: string }[] = [
  { type: "THREAT_ALERT", severity: "HIGH", title: "Carjacking hotspot: N1 off-ramps in Fourways and Randburg", message: "Follow-home hijackings reported after drivers leave the N1 at William Nicol and Malibongwe between 19:00 and 22:00. If followed, do not drive home — go to the nearest police station or busy fuel station.", place: "williamNicol", at: "2026-09-19T08:00:00+02:00" },
  { type: "THREAT_ALERT", severity: "HIGH", title: "Fake police roadblocks on the N3", message: "Criminals in unmarked cars with blue lights are stopping trucks near Heidelberg at night. Legitimate SAPS vehicles are marked; you may drive to the nearest police station before stopping and call 10111 to verify.", place: "n3Heidelberg", at: "2026-10-11T12:00:00+02:00" },
  { type: "WANTED_PERSON_SIGHTING", severity: "CRITICAL", title: "MISSING CHILD: 7-year-old girl, Vosloorus", message: "Last seen 7 Oct at 14:20 near Vosloorus Extension 14 primary school, wearing a grey school uniform and red jersey. Any information: call 10111 or the investigating officer via Sentinel360.", place: "vosloorus", at: "2026-10-07T18:30:00+02:00" },
  { type: "SUSPICIOUS_BEHAVIOR", severity: "MEDIUM", title: "Spaza-shop extortion: report \"protection fee\" demands", message: "Shop owners in Nyanga, Gugulethu and Philippi East: you do not have to pay. Report demands anonymously to Crime Stop on 08600 10111 or through this app.", place: "nyanga", at: "2026-09-27T09:00:00+02:00" },
  { type: "SYSTEM", severity: "LOW", title: "Kidnapping-for-ransom safety tip", message: "Before entering an e-hailing vehicle, check that the number plate, driver photo and car model match the app. Share your trip with a trusted contact.", place: "kemptonPark", at: "2026-10-01T09:00:00+02:00" },
];
