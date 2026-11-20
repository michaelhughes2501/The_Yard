import { Resource } from "./types";

export const UA_CHECK_INS: Resource[] = [
  {
    id: "rmoms-1",
    title: "RMOMS Denver Metro Check-In",
    category: "ua",
    description: "Rocky Mountain Offender Management Systems (RMOMS) daily random UA check-in line for Denver, Aurora, and Lakewood.",
    phone: "303-555-0123"
  },
  {
    id: "rmoms-2",
    title: "RMOMS Colorado Springs & Pueblo",
    category: "ua",
    description: "Daily color/ID code verification line for Southern District RMOMS urine analysis testing sites.",
    phone: "719-555-0188"
  },
  {
    id: "ua-general",
    title: "National Federal Probation UA Hotline",
    category: "ua",
    description: "Automated daily code verification line for federal supervised release and probation check-ins.",
    phone: "800-555-9999"
  }
];

export const PAROLE_RESOURCES: Resource[] = [
  {
    id: "parole-ca",
    title: "California CDCR Division of Adult Parole",
    category: "parole",
    description: "Parole unit directory, regional office phone numbers, and BPH hearing schedules.",
    url: "https://www.cdcr.ca.gov/parole/"
  },
  {
    id: "parole-ny",
    title: "New York DOCCS Community Supervision",
    category: "parole",
    description: "Area bureau office phone lookup, parole officer directory, and travel permit guidance.",
    url: "https://doccs.ny.gov/community-supervision"
  },
  {
    id: "parole-tx",
    title: "Texas TDCJ Parole Division",
    category: "parole",
    description: "Regional parole office locator, district parole officer contact lookup, and reporting rules.",
    url: "https://www.tdcj.texas.gov/divisions/pd/index.html"
  },
  {
    id: "parole-co",
    title: "Colorado DOC Adult Parole",
    category: "parole",
    description: "Find your assigned Community Parole Officer (CPO), RMOMS testing locations, and regional offices.",
    url: "https://cdoc.colorado.gov/about/divisions/division-of-adult-parole"
  },
  {
    id: "parole-fl",
    title: "Florida Commission on Offender Review",
    category: "parole",
    description: "Conditional release supervision contacts, field office phone numbers, and compliance guides.",
    url: "https://www.fcor.state.fl.us/"
  },
  {
    id: "parole-il",
    title: "Illinois Prisoner Review Board & Parole",
    category: "parole",
    description: "Mandatory Supervised Release (MSR) agent lookup, reporting instructions, and conditions.",
    url: "https://prb.illinois.gov/"
  }
];

export const MENTAL_HEALTH_RESOURCES: Resource[] = [
  {
    id: "mh-988",
    title: "988 Suicide & Crisis Lifeline",
    category: "mental_health",
    description: "Free, confidential 24/7 crisis support by phone or text for anyone experiencing emotional distress.",
    phone: "988"
  },
  {
    id: "mh-1",
    title: "Crisis Text Line",
    category: "mental_health",
    description: "Text HOME to 741741 to connect with a trauma-informed Crisis Counselor 24/7.",
    phone: "741741"
  },
  {
    id: "mh-2",
    title: "SAMHSA National Helpline",
    category: "mental_health",
    description: "24/7 treatment referral and information service for mental health and substance use recovery.",
    phone: "1-800-662-4357"
  },
  {
    id: "mh-3",
    title: "The Fortune Society — Mental Health Clinic",
    category: "mental_health",
    description: "Licensed outpatient mental health treatment and peer counseling tailored for justice-involved individuals.",
    url: "https://fortunesociety.org/"
  },
  {
    id: "mh-4",
    title: "NAMI Re-entry & Justice Library",
    category: "mental_health",
    description: "National Alliance on Mental Illness guide to navigating post-incarceration anxiety, PTSD, and Medicaid.",
    url: "https://www.nami.org/Advocacy/Policy-Priorities/Stopping-the-Unfair-Criminalization-of-People-with-Mental-Illness"
  },
  {
    id: "mh-5",
    title: "Prison Fellowship Re-entry Support",
    category: "mental_health",
    description: "Support groups, family reunification counseling, and trauma healing circles nationwide.",
    url: "https://www.prisonfellowship.org/"
  }
];

export interface SelfHelpMaterial {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  steps: string[];
}

export const SELF_HELP_MATERIALS: SelfHelpMaterial[] = [
  {
    id: "sh-1",
    title: "De-escalating Post-Incarceration Hypervigilance & Sensory Overload",
    category: "Trauma & Grounding",
    readTime: "8 min workbook",
    summary: "Inside, staying on high alert kept you safe. Outside, crowded grocery stores, sirens, or sudden movements can trigger fight-or-flight. Use this 5-4-3-2-1 grounding protocol.",
    steps: [
      "Name 5 things you can see in the room right now (focus on neutral colors and textures).",
      "Place both feet flat on the floor and notice 4 physical sensations (your boots on the ground, air on your hands).",
      "Identify 3 distinct sounds around you without judging them as threats.",
      "Inhale for 4 seconds through the nose, hold for 4 seconds, and exhale for 6 seconds to reset vagal nerve tone.",
      "Remind yourself: 'I am home. I have space to step outside and take a breath whenever I choose.'"
    ]
  },
  {
    id: "sh-2",
    title: "Answering the Conviction Question in Job Interviews with Confidence",
    category: "Career & Stigma",
    readTime: "10 min guide",
    summary: "The 'Accountability + Growth + Value' framework turns a background check conversation into proof of resilience and reliability.",
    steps: [
      "Keep the past brief and non-defensive: 'Several years ago, I made choices that led to a conviction.'",
      "Pivot immediately to verified rehabilitation: 'During my time and since release, I completed vocational training and maintained 100% compliance.'",
      "Connect to the employer's needs: 'I bring strong discipline, punctuality, and problem-solving to your team.'",
      "Know your rights: In Ban-the-Box states, employers cannot ask about records until after a conditional job offer."
    ]
  },
  {
    id: "sh-3",
    title: "Rebuilding Trust with Family & Children Step-by-Step",
    category: "Family & Relationships",
    readTime: "12 min guide",
    summary: "Returning home changes family dynamics. Consistency over months matters far more than grand promises on day one.",
    steps: [
      "Acknowledge the time apart and validate your loved ones' feelings without demanding instant forgiveness.",
      "Set small, predictable commitments you can keep 100% of the time (e.g., calling every Tuesday at 6 PM).",
      "Respect existing household routines that your partner or family established while you were away.",
      "Celebrate small shared moments—cooking a meal or helping with homework—without pressure."
    ]
  },
  {
    id: "sh-4",
    title: "Urge Surfing & Relapse Prevention Plan for High-Stress Days",
    category: "Sobriety & Parole Compliance",
    readTime: "7 min protocol",
    summary: "Most cravings and anger spikes peak within 15–20 minutes. Here is how to ride the wave without risking a parole violation.",
    steps: [
      "HALT Check: Ask yourself if you are Hungry, Angry, Lonely, or Tired right now.",
      "Change your physical environment immediately—walk outside or call a mentor on The Yard.",
      "Play the tape forward 24 hours: visualize walking into your RMOMS UA check-in clean and proud tomorrow morning.",
      "Keep your Parole Officer's approved support group schedule in your wallet."
    ]
  }
];

export interface StateDocketEntry {
  state: string;
  abbr: string;
  courtPortalName: string;
  docketUrl: string;
  inmateLocatorUrl: string;
  paroleOfficePhone: string;
  notes: string;
}

export const STATE_COURT_DOCKETS: StateDocketEntry[] = [
  {
    state: "California",
    abbr: "CA",
    courtPortalName: "California Courts Case Information & Appellate Dockets",
    docketUrl: "https://www.courts.ca.gov/find-my-court.htm",
    inmateLocatorUrl: "https://inmatelocator.cdcr.ca.gov/",
    paroleOfficePhone: "(916) 445-6713",
    notes: "Superior Court dockets are indexed by county; CDCR CIRIS locator searches by CDCR# or full name."
  },
  {
    state: "New York",
    abbr: "NY",
    courtPortalName: "NY Unified Court System WebCrims & eCourts",
    docketUrl: "https://iapps.courts.state.ny.us/webcrim_attorney/AttorneyWelcome",
    inmateLocatorUrl: "https://nysdoccslookup.doccs.ny.gov/",
    paroleOfficePhone: "(518) 457-8126",
    notes: "WebCrims provides future appearance dates and dockets across NYC and major county criminal courts."
  },
  {
    state: "Texas",
    abbr: "TX",
    courtPortalName: "re:SearchTX & Texas Judicial Branch Case Search",
    docketUrl: "https://research.txcourts.gov/",
    inmateLocatorUrl: "https://inmate.tdcj.texas.gov/InmateSearch/start.action",
    paroleOfficePhone: "(512) 406-5200",
    notes: "Lookup by SID#, TDCJ#, or Cause Number across Texas district and county courts."
  },
  {
    state: "Florida",
    abbr: "FL",
    courtPortalName: "Florida Courts Civitek & County Clerk Dockets",
    docketUrl: "https://www.myflcourtaccess.com/",
    inmateLocatorUrl: "https://pubapps.fdc.myflorida.com/OffenderSearch/",
    paroleOfficePhone: "(850) 488-1653",
    notes: "FDC Offender Search includes current supervision status, release dates, and detainers."
  },
  {
    state: "Colorado",
    abbr: "CO",
    courtPortalName: "Colorado Judicial Branch Docket Search",
    docketUrl: "https://www.courts.state.co.us/dockets/",
    inmateLocatorUrl: "https://www.doc.state.co.us/oss/",
    paroleOfficePhone: "(303) 763-2420",
    notes: "Search live court dockets by county, party name, or case number; RMOMS handles daily UA testing."
  },
  {
    state: "Illinois",
    abbr: "IL",
    courtPortalName: "Judici & Illinois Circuit Court Clerks Portal",
    docketUrl: "https://www.illinoiscourts.gov/public/find-a-court/",
    inmateLocatorUrl: "https://idoc.illinois.gov/offender/inmatesearch.html",
    paroleOfficePhone: "(800) 666-6744",
    notes: "Cook County and 70+ Illinois circuit courts provide online docket history and hearing dates."
  },
  {
    state: "Pennsylvania",
    abbr: "PA",
    courtPortalName: "Unified Judicial System of Pennsylvania (UJS Portal)",
    docketUrl: "https://ujsportal.pacourts.us/CaseSearch",
    inmateLocatorUrl: "https://inmatelocator.cor.pa.gov/",
    paroleOfficePhone: "(717) 787-5699",
    notes: "Full Common Pleas and Magisterial District Court criminal docket sheets available free."
  },
  {
    state: "Ohio",
    abbr: "OH",
    courtPortalName: "Ohio Supreme Court & County Clerk Docket Directory",
    docketUrl: "https://www.supremecourt.ohio.gov/courts/judicial-system/ohio-trial-courts/",
    inmateLocatorUrl: "https://appgateway.drc.ohio.gov/OffenderSearch",
    paroleOfficePhone: "(614) 752-1200",
    notes: "ODRC Offender Search displays Adult Parole Authority (APA) supervision region and expiration."
  },
  {
    state: "Georgia",
    abbr: "GA",
    courtPortalName: "Georgia Superior Court Clerks Judicial Portal",
    docketUrl: "https://georgiacourts.gov/find-a-court/",
    inmateLocatorUrl: "https://services.gdc.ga.gov/GDC/OffenderQuery/jsp/OffQryForm.jsp",
    paroleOfficePhone: "(404) 656-4661",
    notes: "State Board of Pardons and Paroles and DCS supervision contacts indexed by circuit."
  },
  {
    state: "Michigan",
    abbr: "MI",
    courtPortalName: "MiCOURT Case Search Portal",
    docketUrl: "https://micourt.courts.michigan.gov/case-search/",
    inmateLocatorUrl: "https://mdocweb.state.mi.us/OTIS2/otis2.aspx",
    paroleOfficePhone: "(517) 335-1426",
    notes: "OTIS (Offender Tracking Information System) lists active parolees, MDOC numbers, and supervising agents."
  },
  {
    state: "Washington",
    abbr: "WA",
    courtPortalName: "Washington Courts Odyssey Portal & Case Search",
    docketUrl: "https://dw.courts.wa.gov/",
    inmateLocatorUrl: "https://www.doc.wa.gov/information/inmate-search/",
    paroleOfficePhone: "(360) 725-8213",
    notes: "Search Superior and District court dockets statewide by name or case number."
  },
  {
    state: "Federal (U.S. Courts)",
    abbr: "FED",
    courtPortalName: "PACER — Federal Court Dockets & BOP Inmate Locator",
    docketUrl: "https://pacer.uscourts.gov/",
    inmateLocatorUrl: "https://www.bop.gov/inmateloc/",
    paroleOfficePhone: "(202) 514-6653",
    notes: "Covers all U.S. District Courts, Federal Public Defender dockets, and Bureau of Prisons (BOP) register numbers."
  }
];

export interface StatutoryOffenseRule {
  id: string;
  label: string;
  category: "Non-Violent / Property" | "Drug / Controlled Substance" | "Financial / White Collar" | "Violent / Weapons" | "Supervision / Technical";
  baseMinMonths: number;
  baseMaxMonths: number;
  paroleEligibilityPct: number; // e.g., 50% or 85%
  typicalGoodTimeCreditPct: number; // e.g., 15% to 50%
  probationEligible: boolean;
  statutoryNotes: string;
}

export const STATUTORY_SENTENCE_MATRIX: StatutoryOffenseRule[] = [
  {
    id: "prop-felony-low",
    label: "Class 4/5 Felony Theft, Burglary (Unoccupied), or Criminal Trespass",
    category: "Non-Violent / Property",
    baseMinMonths: 12,
    baseMaxMonths: 48,
    paroleEligibilityPct: 40,
    typicalGoodTimeCreditPct: 50,
    probationEligible: true,
    statutoryNotes: "Frequently eligible for deferred judgment, restitution-based probation, or 50% day-for-day earned time credits."
  },
  {
    id: "drug-possession-dist",
    label: "Possession with Intent to Distribute (Schedule I/II Non-Violent)",
    category: "Drug / Controlled Substance",
    baseMinMonths: 24,
    baseMaxMonths: 96,
    paroleEligibilityPct: 50,
    typicalGoodTimeCreditPct: 35,
    probationEligible: true,
    statutoryNotes: "Many states offer Drug Court diversion or RDAP / treatment sentence reductions of 6–12 months upon completion."
  },
  {
    id: "fraud-forgery",
    label: "Forgery, Identity Theft, or Wire/Financial Fraud",
    category: "Financial / White Collar",
    baseMinMonths: 18,
    baseMaxMonths: 60,
    paroleEligibilityPct: 45,
    typicalGoodTimeCreditPct: 50,
    probationEligible: true,
    statutoryNotes: "Sentencing heavily weighted by loss amount threshold; early work-release or community corrections is common."
  },
  {
    id: "weapons-felon-poss",
    label: "Unlawful Possession of a Firearm / Prohibited Person",
    category: "Violent / Weapons",
    baseMinMonths: 24,
    baseMaxMonths: 84,
    paroleEligibilityPct: 75,
    typicalGoodTimeCreditPct: 15,
    probationEligible: false,
    statutoryNotes: "Often carries mandatory minimum custody thresholds; federal 18 U.S.C. § 922(g) applies 85% truth-in-sentencing."
  },
  {
    id: "assault-robbery",
    label: "Aggravated Assault or 2nd Degree Robbery",
    category: "Violent / Weapons",
    baseMinMonths: 48,
    baseMaxMonths: 144,
    paroleEligibilityPct: 75,
    typicalGoodTimeCreditPct: 15,
    probationEligible: false,
    statutoryNotes: "Subject to Violent Offender Truth-in-Sentencing (75%–85% required before initial Parole Board appearance)."
  },
  {
    id: "parole-tech-violation",
    label: "Technical Parole Violation (Missed Check-in / Positive UA)",
    category: "Supervision / Technical",
    baseMinMonths: 1,
    baseMaxMonths: 6,
    paroleEligibilityPct: 50,
    typicalGoodTimeCreditPct: 50,
    probationEligible: true,
    statutoryNotes: "Under modern state parole reform acts (e.g., Less Is More / SB 19-143), technical violations prioritize intermediate sanctions or 30–90 day residential treatment over full revocation."
  }
];
