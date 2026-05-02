import type { Branch, ComplianceControl, InventoryBatch, Medication, OwnerKpi, PublicService, QueueTicket } from "./types";

export const branches: Branch[] = [
  {
    id: "puncak-alam",
    name: "UsrahMedic Puncak Alam",
    area: "Puncak Alam",
    hours: "24 hours",
    hotline: "011-35664998",
    services: ["GP", "Antenatal", "Ultrasound", "Paediatric", "Dengue test"],
    queueLoad: 18
  },
  {
    id: "bukit-jelutong",
    name: "UsrahMedic Bukit Jelutong",
    area: "Bukit Jelutong",
    hours: "8:00 AM - 12:00 AM",
    hotline: "012-4454998",
    services: ["GP", "Women's health", "Health screening", "ECG", "Panel care"],
    queueLoad: 9
  },
  {
    id: "seremban-2",
    name: "UsrahMedic Seremban 2",
    area: "Seremban 2",
    hours: "24 hours",
    hotline: "011-11304998",
    services: ["GP", "Urgent care", "Paediatric", "Wound care", "Ultrasound"],
    queueLoad: 14
  }
];

export const publicServices: PublicService[] = [
  {
    id: "antenatal",
    title: "Antenatal and Buku Pink",
    summary: "Pregnancy confirmation, monthly follow-up, blood and urine checks, ultrasound, postnatal wound review, breastfeeding support, and baby jaundice monitoring.",
    journey: "womenChildren",
    appointment: "either"
  },
  {
    id: "ultrasound",
    title: "2D to 5D Ultrasound",
    summary: "Growth scan, presentation scan, detailed anomaly scan, gynae scan, and patient-ready reports with branch-specific booking rules.",
    journey: "womenChildren",
    appointment: "appointment"
  },
  {
    id: "haji-umrah",
    title: "Haji and Umrah Screening",
    summary: "Health screening, vaccination workflow, MyVAS-ready documentation, and campaign tracking for seasonal packages.",
    journey: "campaign",
    appointment: "either"
  },
  {
    id: "family-gp",
    title: "Family GP and Urgent Care",
    summary: "Adult and child care, fever, cough, minor injuries, chronic follow-up, wound dressing, nebuliser, and referral letters.",
    journey: "family",
    appointment: "walkIn"
  },
  {
    id: "chronic",
    title: "Chronic Disease Follow-Up",
    summary: "Diabetes, hypertension, asthma, repeat labs, refill planning, recall reminders, and owner-level population health insight.",
    journey: "chronic",
    appointment: "either"
  }
];

export const queueTickets: QueueTicket[] = [
  {
    id: "Q102",
    patientName: "Nur Aina",
    branchId: "puncak-alam",
    state: "triaged",
    service: "Antenatal follow-up",
    triage: "priority",
    assignedTo: "Dr. Izzati",
    waitingMinutes: 11
  },
  {
    id: "Q103",
    patientName: "Muhammad Rayyan",
    branchId: "puncak-alam",
    state: "ordersPending",
    service: "Dengue test",
    triage: "urgent",
    assignedTo: "Dr. Hana",
    waitingMinutes: 24
  },
  {
    id: "Q208",
    patientName: "Siti Hajar",
    branchId: "bukit-jelutong",
    state: "inConsult",
    service: "Ultrasound",
    triage: "routine",
    assignedTo: "Dr. Mariam",
    waitingMinutes: 4
  },
  {
    id: "Q309",
    patientName: "Ahmad Faiz",
    branchId: "seremban-2",
    state: "dispenseBill",
    service: "Wound care",
    triage: "routine",
    assignedTo: "Dispenser",
    waitingMinutes: 7
  }
];

export const medications: Medication[] = [
  {
    id: "med-paracetamol",
    genericName: "Paracetamol",
    brandName: "Usrah Para",
    activeIngredients: ["Paracetamol"],
    strength: "500 mg",
    dosageForm: "Tablet",
    route: "Oral",
    malNumber: "MAL00000001X",
    poisonGroup: "none",
    psychotropic: false,
    dangerousDrug: false,
    controlledFlags: [],
    coldChain: false,
    highAlert: false,
    lasa: false,
    recallStatus: "clear"
  },
  {
    id: "med-tramadol",
    genericName: "Tramadol",
    brandName: "Tramadol Cap",
    activeIngredients: ["Tramadol hydrochloride"],
    strength: "50 mg",
    dosageForm: "Capsule",
    route: "Oral",
    malNumber: "MAL00000002A",
    poisonGroup: "B",
    psychotropic: false,
    dangerousDrug: false,
    controlledFlags: ["tramadol", "controlled"],
    coldChain: false,
    highAlert: true,
    lasa: false,
    recallStatus: "watch"
  },
  {
    id: "med-vaccine",
    genericName: "Influenza vaccine",
    brandName: "Seasonal Flu Vaccine",
    activeIngredients: ["Inactivated influenza virus"],
    strength: "0.5 ml",
    dosageForm: "Injection",
    route: "Intramuscular",
    malNumber: "MAL00000003A",
    poisonGroup: "B",
    psychotropic: false,
    dangerousDrug: false,
    controlledFlags: ["cold-chain"],
    coldChain: true,
    highAlert: false,
    lasa: false,
    recallStatus: "clear"
  }
];

export const inventoryBatches: InventoryBatch[] = [
  {
    id: "batch-para-pa-01",
    medicationId: "med-paracetamol",
    branchId: "puncak-alam",
    batchNo: "PA-2401",
    expiry: "2027-02-28",
    quantity: 820,
    status: "available"
  },
  {
    id: "batch-tram-pa-01",
    medicationId: "med-tramadol",
    branchId: "puncak-alam",
    batchNo: "TR-2409",
    expiry: "2026-08-31",
    quantity: 46,
    status: "available"
  },
  {
    id: "batch-vax-bj-01",
    medicationId: "med-vaccine",
    branchId: "bukit-jelutong",
    batchNo: "VX-2412",
    expiry: "2026-06-30",
    quantity: 18,
    status: "available"
  }
];

export const ownerKpis: OwnerKpi[] = [
  {
    label: "Today revenue",
    value: "RM 18,420",
    trend: "+12% vs last Friday",
    risk: "low"
  },
  {
    label: "Queue SLA",
    value: "84%",
    trend: "Target 90%",
    risk: "medium"
  },
  {
    label: "Panel AR aging",
    value: "RM 42,900",
    trend: "RM 8,100 over 45 days",
    risk: "high"
  },
  {
    label: "Medicine expiry risk",
    value: "23 batches",
    trend: "7 batches under 60 days",
    risk: "medium"
  }
];

export const complianceControls: ComplianceControl[] = [
  {
    id: "pdpa-dpo",
    area: "PDPA",
    title: "DPO and breach readiness",
    implementation: "Assess thresholds, track DPO registration, maintain breach evidence, and run 72-hour DBN workflow.",
    status: "foundation"
  },
  {
    id: "ckaps-branch",
    area: "CKAPS",
    title: "Branch governance evidence",
    implementation: "Store registration, OYB, SOPs, incidents, complaints, APC, indemnity, and locum assignment records.",
    status: "needsLegalReview"
  },
  {
    id: "mab-cms",
    area: "MAB",
    title: "Marketing approval gate",
    implementation: "Block publish until approval, KKLIU, expiry, and evidence are attached for applicable health-service content.",
    status: "foundation"
  },
  {
    id: "medicine-registers",
    area: "Medicine",
    title: "Legal medicine registers",
    implementation: "Keep prescription book, psychotropic register, stock ledger, correction ledger, and inspection export separate from audit logs.",
    status: "needsLegalReview"
  },
  {
    id: "security-audit",
    area: "Security",
    title: "PHI-safe audit and analytics",
    implementation: "Log record access and block PHI from product analytics, logs, push notifications, and marketing exports.",
    status: "foundation"
  }
];
