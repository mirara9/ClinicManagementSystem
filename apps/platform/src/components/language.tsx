"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Globe2, Home, Phone } from "lucide-react";

export type LanguageCode = "en" | "ms" | "zh" | "ta";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}

interface PublicNavProps {
  active: "home" | "booking";
}

const languageStorageKey = "usrahmedic-language";

const languageOptions: Array<{ code: LanguageCode; label: string; nativeLabel: string; htmlLang: string }> = [
  { code: "en", label: "English", nativeLabel: "English", htmlLang: "en" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu", htmlLang: "ms" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", htmlLang: "zh-Hans" },
  { code: "ta", label: "Indian", nativeLabel: "தமிழ்", htmlLang: "ta" }
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("ms");

  useEffect(() => {
    const urlLanguage = new URLSearchParams(window.location.search).get("lang");
    if (isLanguageCode(urlLanguage)) {
      setLanguageState(urlLanguage);
      return;
    }

    const savedLanguage = window.localStorage.getItem(languageStorageKey);
    if (isLanguageCode(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    const option = languageOptions.find((item) => item.code === language);
    document.documentElement.lang = option?.htmlLang ?? language;
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const copy = sharedCopy[language];

  return (
    <label className="language-picker">
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">{copy.languageLabel}</span>
      <select
        aria-label={copy.languageLabel}
        value={language}
        onChange={(event) => setLanguage(event.target.value as LanguageCode)}
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label} / {option.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LocalizedPublicNav({ active }: PublicNavProps) {
  const { language } = useLanguage();
  const copy = sharedCopy[language];

  return (
    <nav className="surface-nav" aria-label={copy.navAria}>
      <Link className={active === "home" ? "active" : ""} href="/">
        <Home size={16} aria-hidden="true" />
        {copy.home}
      </Link>
      <Link className={active === "booking" ? "active" : ""} href="/patient">
        <CalendarCheck size={16} aria-hidden="true" />
        {copy.bookAppointment}
      </Link>
      <LanguageSelector />
      <a className="nav-contact" href="tel:+601135664998">
        <Phone size={16} aria-hidden="true" />
        011-3566 4998
      </a>
    </nav>
  );
}

export function usePublicHomeCopy() {
  return publicHomeCopy[useLanguage().language];
}

export function usePatientPageCopy() {
  return patientPageCopy[useLanguage().language];
}

export function usePatientBookingCopy() {
  return patientBookingCopy[useLanguage().language];
}

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "ms" || value === "zh" || value === "ta";
}

const sharedCopy = {
  en: {
    navAria: "Public navigation",
    home: "Home",
    bookAppointment: "Book appointment",
    languageLabel: "Select language"
  },
  ms: {
    navAria: "Navigasi awam",
    home: "Laman utama",
    bookAppointment: "Tempah janji temu",
    languageLabel: "Pilih bahasa"
  },
  zh: {
    navAria: "公共导航",
    home: "主页",
    bookAppointment: "预约",
    languageLabel: "选择语言"
  },
  ta: {
    navAria: "பொது வழிசெலுத்தல்",
    home: "முகப்பு",
    bookAppointment: "நேரம் பதிவு",
    languageLabel: "மொழியைத் தேர்வு செய்க"
  }
} as const;

const publicHomeCopy = {
  en: {
    notice: "Foundation preview",
    heroTitle: "UsrahMedic family clinic platform",
    heroText:
      "A fast public website and connected clinic system for branch discovery, booking, antenatal care, ultrasound, panels, chronic follow-up, and patient communication.",
    bookVisit: "Book visit",
    branchesTitle: "Branches",
    branchesText: "Official branch data becomes structured content shared across public, admin, mobile, and insight surfaces.",
    journeysTitle: "Patient journeys",
    journeysText: "The public site stays patient-friendly while feeding clean service, campaign, and booking data into operations.",
    branchAvailability: "Branch availability",
    whatsappFallback: "WhatsApp fallback",
    separateTitle: "Separate patient and clinic systems",
    separateText: "Patients use the public site and patient app. Staff, clinic operations, medicine, and owner insight remain separate authenticated workspaces."
  },
  ms: {
    notice: "Pratonton asas",
    heroTitle: "Platform klinik keluarga UsrahMedic",
    heroText:
      "Laman awam yang pantas dan sistem klinik bersambung untuk carian cawangan, tempahan, antenatal, ultrasound, panel, susulan kronik, dan komunikasi pesakit.",
    bookVisit: "Tempah lawatan",
    branchesTitle: "Cawangan",
    branchesText: "Data cawangan rasmi menjadi kandungan berstruktur yang dikongsi merentas laman awam, admin, mudah alih, dan insight.",
    journeysTitle: "Perjalanan pesakit",
    journeysText: "Laman awam kekal mesra pesakit sambil menghantar data servis, kempen, dan tempahan yang bersih kepada operasi.",
    branchAvailability: "Ketersediaan cawangan",
    whatsappFallback: "Sokongan WhatsApp",
    separateTitle: "Sistem pesakit dan klinik yang berasingan",
    separateText: "Pesakit menggunakan laman awam dan aplikasi pesakit. Staf, operasi klinik, ubat, dan insight pemilik kekal sebagai ruang kerja berautentikasi yang berasingan."
  },
  zh: {
    notice: "基础预览",
    heroTitle: "UsrahMedic 家庭诊所平台",
    heroText:
      "快速的公共网站和互联诊所系统，支持分院查询、预约、产前护理、超声波、Panel、慢病复诊和患者通知。",
    bookVisit: "预约就诊",
    branchesTitle: "分院",
    branchesText: "正式分院资料会成为结构化内容，并在公共网站、后台、移动端和业主报表中共享。",
    journeysTitle: "患者流程",
    journeysText: "公共网站保持易用，同时把服务、活动和预约数据干净地交给诊所运营。",
    branchAvailability: "分院服务",
    whatsappFallback: "WhatsApp 支援",
    separateTitle: "患者系统与诊所系统分开",
    separateText: "患者使用公共网站和患者应用。员工、诊所运营、药房和业主报表保留在独立的认证工作区。"
  },
  ta: {
    notice: "அடிப்படை முன்னோட்டம்",
    heroTitle: "UsrahMedic குடும்ப கிளினிக் தளம்",
    heroText:
      "கிளை தேடல், முன்பதிவு, கர்ப்ப பராமரிப்பு, அல்ட்ராசவுண்ட், Panel, நீண்டநாள் நோய் பின்தொடர்வு, மற்றும் நோயாளர் தொடர்புக்கு வேகமான பொதுத் தளம் மற்றும் இணைந்த கிளினிக் அமைப்பு.",
    bookVisit: "வருகை பதிவு",
    branchesTitle: "கிளைகள்",
    branchesText: "அதிகாரப்பூர்வ கிளை தகவல் பொதுத் தளம், நிர்வாகம், மொபைல், மற்றும் insight பகுதிகளுக்கு பகிரப்படும் கட்டமைக்கப்பட்ட உள்ளடக்கமாக இருக்கும்.",
    journeysTitle: "நோயாளர் பயணம்",
    journeysText: "பொதுத் தளம் நோயாளருக்கு எளிதாக இருந்து, சேவை, பிரச்சாரம், மற்றும் முன்பதிவு தரவை செயல்பாடுகளுக்கு அனுப்பும்.",
    branchAvailability: "கிளை கிடைக்கும் நிலை",
    whatsappFallback: "WhatsApp ஆதரவு",
    separateTitle: "நோயாளர் மற்றும் கிளினிக் அமைப்புகள் தனித்தனி",
    separateText: "நோயாளர்கள் பொதுத் தளம் மற்றும் நோயாளர் செயலியைப் பயன்படுத்துவர். பணியாளர், கிளினிக் செயல்பாடு, மருந்தகம், மற்றும் உரிமையாளர் insight தனி அங்கீகரிக்கப்பட்ட பணிப்பகுதிகளாக இருக்கும்."
  }
} as const;

const patientPageCopy = {
  en: {
    badge: "Usrah Medic online booking",
    heroTitle: "Book a clinic slot, confirm your details, pay the RM10 deposit.",
    heroText:
      "This booking experience follows the official Usrah Medic style: clear, patient-friendly, and action-focused. Logged-in patients will see their details filled automatically before payment.",
    open24: "24-hour branch",
    deposit: "RM10 deposit",
    branchCount: "branches",
    heroPhotoLabel: "Usrah Medic family clinic booking",
    processAria: "Booking process",
    processBadge: "How booking works",
    processTitle: "Simple for patients, complete for the clinic",
    processText: "The RM10 deposit helps reduce no-shows. The clinic still confirms the final slot before the visit.",
    servicesBadge: "Popular services",
    servicesTitle: "Frequently booked services",
    servicesText: "Focused on what patients actually look for: mother and child care, ultrasound, screening, vaccination, and family treatment.",
    branchAria: "UsrahMedic branches",
    services: [
      {
        title: "Antenatal & Buku Pink",
        detail: "Pregnancy check-ups, scheduled follow-up, urine/blood checks, and care advice."
      },
      {
        title: "2D to 5D Ultrasound",
        detail: "Scan bookings, reports, and slot confirmation by doctor and branch."
      },
      {
        title: "Hajj & Umrah",
        detail: "Health screening, vaccination, and documentation prepared for travel."
      }
    ],
    bookingSteps: [
      "Choose branch and service",
      "Check patient details",
      "Pay RM10 deposit",
      "Wait for clinic confirmation"
    ]
  },
  ms: {
    badge: "Tempahan online Usrah Medic",
    heroTitle: "Tempah slot klinik, sahkan butiran, bayar deposit RM10.",
    heroText:
      "Pengalaman tempahan ini direka seperti laman rasmi Usrah Medic: jelas, mesra pesakit, dan terus kepada tindakan. Pesakit yang log masuk akan melihat maklumat mereka diisi secara automatik sebelum bayaran.",
    open24: "Cawangan 24 jam",
    deposit: "Deposit RM10",
    branchCount: "cawangan",
    heroPhotoLabel: "Tempahan klinik keluarga Usrah Medic",
    processAria: "Proses tempahan",
    processBadge: "Cara tempahan",
    processTitle: "Ringkas untuk pesakit, lengkap untuk klinik",
    processText: "Deposit RM10 membantu mengurangkan no-show. Klinik masih perlu mengesahkan slot sebenar sebelum lawatan.",
    servicesBadge: "Perkhidmatan popular",
    servicesTitle: "Perkhidmatan yang selalu ditempah",
    servicesText: "Fokus kepada servis yang pesakit benar-benar cari: ibu dan anak, ultrasound, saringan, vaksinasi, dan rawatan keluarga.",
    branchAria: "Cawangan UsrahMedic",
    services: [
      {
        title: "Antenatal & Buku Pink",
        detail: "Pemeriksaan ibu mengandung, follow-up berkala, urine/blood check, dan nasihat penjagaan."
      },
      {
        title: "2D hingga 5D Ultrasound",
        detail: "Tempahan scan, laporan, dan pengesahan slot mengikut doktor serta cawangan."
      },
      {
        title: "Haji & Umrah",
        detail: "Saringan kesihatan, vaksinasi, dan dokumentasi yang disusun untuk perjalanan."
      }
    ],
    bookingSteps: [
      "Pilih cawangan dan perkhidmatan",
      "Semak butiran pesakit",
      "Bayar deposit RM10",
      "Tunggu pengesahan klinik"
    ]
  },
  zh: {
    badge: "Usrah Medic 在线预约",
    heroTitle: "预约诊所时段，确认资料，支付 RM10 订金。",
    heroText:
      "预约流程延续 Usrah Medic 官方网站风格：清楚、亲切、直接。已登录患者会在付款前自动带入个人资料。",
    open24: "24 小时分院",
    deposit: "RM10 订金",
    branchCount: "间分院",
    heroPhotoLabel: "Usrah Medic 家庭诊所预约",
    processAria: "预约流程",
    processBadge: "预约步骤",
    processTitle: "患者操作简单，诊所资料完整",
    processText: "RM10 订金有助减少爽约。诊所仍会在就诊前确认最终时段。",
    servicesBadge: "热门服务",
    servicesTitle: "常被预约的服务",
    servicesText: "聚焦患者真正需要的服务：母婴护理、超声波、筛查、疫苗和家庭医疗。",
    branchAria: "UsrahMedic 分院",
    services: [
      {
        title: "产前护理与 Buku Pink",
        detail: "孕期检查、定期复诊、尿液/血液检查和护理建议。"
      },
      {
        title: "2D 至 5D 超声波",
        detail: "扫描预约、报告，并按医生和分院确认时段。"
      },
      {
        title: "朝觐与副朝",
        detail: "健康筛查、疫苗接种和旅行所需文件安排。"
      }
    ],
    bookingSteps: [
      "选择分院和服务",
      "检查患者资料",
      "支付 RM10 订金",
      "等待诊所确认"
    ]
  },
  ta: {
    badge: "Usrah Medic ஆன்லைன் முன்பதிவு",
    heroTitle: "கிளினிக் நேரம் பதிவு செய்து, விவரங்களை உறுதி செய்து, RM10 முன்பணம் செலுத்துங்கள்.",
    heroText:
      "இந்த முன்பதிவு அனுபவம் Usrah Medic அதிகாரப்பூர்வ தளத்தின் பாணியைப் பின்பற்றுகிறது: தெளிவு, நோயாளருக்கு எளிமை, மற்றும் நேரடி செயல். உள்நுழைந்த நோயாளர்களின் விவரங்கள் கட்டணத்திற்கு முன் தானாக நிரப்பப்படும்.",
    open24: "24 மணி கிளை",
    deposit: "RM10 முன்பணம்",
    branchCount: "கிளைகள்",
    heroPhotoLabel: "Usrah Medic குடும்ப கிளினிக் முன்பதிவு",
    processAria: "முன்பதிவு நடைமுறை",
    processBadge: "முன்பதிவு முறை",
    processTitle: "நோயாளருக்கு எளிமை, கிளினிக்கிற்கு முழுமை",
    processText: "RM10 முன்பணம் no-show குறைக்க உதவும். வருகைக்கு முன் இறுதி நேரத்தை கிளினிக் உறுதி செய்யும்.",
    servicesBadge: "பிரபல சேவைகள்",
    servicesTitle: "அதிகம் முன்பதிவு செய்யப்படும் சேவைகள்",
    servicesText: "நோயாளர்கள் தேடும் தாய்-குழந்தை பராமரிப்பு, அல்ட்ராசவுண்ட், screening, தடுப்பூசி, குடும்ப சிகிச்சை ஆகியவற்றில் கவனம்.",
    branchAria: "UsrahMedic கிளைகள்",
    services: [
      {
        title: "கர்ப்ப பராமரிப்பு & Buku Pink",
        detail: "கர்ப்ப பரிசோதனை, தொடர்ச்சியான follow-up, urine/blood check, மற்றும் பராமரிப்பு ஆலோசனை."
      },
      {
        title: "2D முதல் 5D அல்ட்ராசவுண்ட்",
        detail: "Scan முன்பதிவு, அறிக்கை, மற்றும் மருத்துவர்/கிளை அடிப்படையில் நேர உறுதி."
      },
      {
        title: "ஹஜ் & உம்ரா",
        detail: "ஆரோக்கிய screening, தடுப்பூசி, மற்றும் பயணத்திற்கான ஆவணங்கள்."
      }
    ],
    bookingSteps: [
      "கிளை மற்றும் சேவையைத் தேர்வு செய்க",
      "நோயாளர் விவரங்களை சரிபார்",
      "RM10 முன்பணம் செலுத்து",
      "கிளினிக் உறுதிப்படுத்தலை காத்திரு"
    ]
  }
} as const;

const patientBookingCopy = {
  en: {
    loading: {
      title: "Sending booking",
      detail: "We are saving patient details, preferred slot, and RM10 deposit."
    },
    initial: {
      title: "Ready for booking",
      detail: "Check patient details, choose a slot, then confirm the RM10 deposit."
    },
    fallbackOffline: "Connection is unstable; the clinic needs to confirm this request manually.",
    fallbackEndpoint: "The clinic needs to confirm this request manually.",
    cardBadge: "Booking form",
    cardTitle: "Appointment details",
    cardText: "These details help the branch confirm the slot and contact the patient.",
    progress: ["Details", "Slot", "Deposit"],
    loggedIn: "Logged-in patient",
    newPatient: "New patient",
    profileFilled: "Profile details are filled automatically",
    profileEmpty: "Enter patient details for this booking",
    profileFilledText: "Patients can still update phone, email, or visit details before payment.",
    profileEmptyText: "Details will be used for appointment confirmation and deposit receipt.",
    bookOther: "Book for another patient",
    useProfile: "Use logged-in profile",
    incompleteTitle: "Booking details incomplete",
    incompleteDetail: "Name, phone, visit date, time, and PDPA consent are required before collecting the RM10 deposit.",
    acceptedTitle: "Appointment request received",
    rejectedTitle: "Booking request was not accepted",
    successDetail: (service: string, branch: string, method: string) => `${service} at ${branch} was recorded with RM10 deposit via ${method}.`,
    fallbackDetail: (service: string, branch: string, reason: string) => `${service} at ${branch} is ready for clinic confirmation with RM10 deposit collection. ${reason}`,
    retrySuffix: "Please retry when the API is healthy.",
    patientSectionTitle: "Patient details",
    patientSectionText: "For identity confirmation, notifications, and deposit receipt.",
    fields: {
      fullName: "Full name",
      phone: "Phone number",
      email: "Email",
      idLast4: "Last 4 digits of IC/passport",
      dob: "Date of birth",
      sex: "Sex",
      visitReason: "Visit reason"
    },
    sex: {
      female: "Female",
      male: "Male",
      unknown: "Prefer not to say"
    },
    slotTitle: "Slot and service",
    slotText: "The clinic will contact you if the selected slot needs adjustment.",
    branch: "Branch",
    service: "Service",
    appointmentDate: "Appointment date",
    preferredTime: "Preferred time",
    visitPlaceholder: "Example: antenatal follow-up, scan, child fever, hajj/umrah screening",
    depositTitle: "RM10 deposit",
    depositText: "Choose the deposit payment method. Receipt and confirmation are sent after the clinic receives the booking.",
    paymentAria: "Payment method",
    summaryAria: "Booking summary",
    depositLabel: "Deposit",
    hotline: "Hotline",
    selectedSlot: "Preferred slot",
    depositMethod: "Deposit method",
    consent: "I agree that Usrah Medic may use these details for booking, deposit handling, and patient notifications.",
    submit: "Pay RM10 & submit booking",
    defaultReason: "Antenatal follow-up and routine check.",
    services: ["Antenatal follow-up", "2D/3D/4D/5D Ultrasound", "GP consultation", "Hajj and Umrah screening", "Health screening", "Family and child treatment"],
    depositMethods: {
      fpx: "FPX online banking",
      ewallet: "eWallet / DuitNow",
      card: "Card",
      counter: "Pay at counter"
    }
  },
  ms: {
    loading: {
      title: "Menghantar tempahan",
      detail: "Kami sedang menyimpan butiran pesakit, slot pilihan, dan deposit RM10."
    },
    initial: {
      title: "Sedia untuk tempahan",
      detail: "Semak butiran pesakit, pilih slot, kemudian sahkan deposit RM10."
    },
    fallbackOffline: "Sambungan tidak stabil; klinik perlu mengesahkan permintaan ini secara manual.",
    fallbackEndpoint: "Klinik perlu mengesahkan permintaan ini secara manual.",
    cardBadge: "Borang tempahan",
    cardTitle: "Maklumat janji temu",
    cardText: "Butiran ini digunakan oleh cawangan untuk mengesahkan slot dan menghubungi pesakit.",
    progress: ["Butiran", "Slot", "Deposit"],
    loggedIn: "Pesakit log masuk",
    newPatient: "Pesakit baharu",
    profileFilled: "Maklumat profil telah diisi automatik",
    profileEmpty: "Isi butiran pesakit untuk tempahan ini",
    profileFilledText: "Pesakit masih boleh ubah nombor telefon, emel, atau butiran lawatan sebelum bayaran.",
    profileEmptyText: "Maklumat akan digunakan untuk pengesahan janji temu dan resit deposit.",
    bookOther: "Tempah untuk pesakit lain",
    useProfile: "Guna profil log masuk",
    incompleteTitle: "Butiran tempahan tidak lengkap",
    incompleteDetail: "Nama, telefon, tarikh, masa, dan persetujuan PDPA diperlukan sebelum kutipan deposit RM10.",
    acceptedTitle: "Permintaan janji temu diterima",
    rejectedTitle: "Permintaan tempahan tidak diterima",
    successDetail: (service: string, branch: string, method: string) => `${service} di ${branch} direkodkan dengan deposit RM10 melalui ${method}.`,
    fallbackDetail: (service: string, branch: string, reason: string) => `${service} di ${branch} sedia untuk pengesahan klinik dengan kutipan deposit RM10. ${reason}`,
    retrySuffix: "Sila cuba semula apabila API sihat.",
    patientSectionTitle: "Butiran pesakit",
    patientSectionText: "Untuk pengesahan identiti, notifikasi, dan resit deposit.",
    fields: {
      fullName: "Nama penuh",
      phone: "No. telefon",
      email: "Email",
      idLast4: "4 digit akhir IC/passport",
      dob: "Tarikh lahir",
      sex: "Jantina",
      visitReason: "Tujuan lawatan"
    },
    sex: {
      female: "Perempuan",
      male: "Lelaki",
      unknown: "Tidak dinyatakan"
    },
    slotTitle: "Slot dan perkhidmatan",
    slotText: "Klinik akan hubungi jika slot pilihan perlu dilaraskan.",
    branch: "Cawangan",
    service: "Perkhidmatan",
    appointmentDate: "Tarikh janji temu",
    preferredTime: "Masa pilihan",
    visitPlaceholder: "Contoh: Follow-up antenatal, scan, demam anak, saringan haji/umrah",
    depositTitle: "Deposit RM10",
    depositText: "Pilih kaedah bayaran deposit. Resit dan pengesahan akan dihantar selepas klinik menerima tempahan.",
    paymentAria: "Kaedah bayaran",
    summaryAria: "Ringkasan tempahan",
    depositLabel: "Deposit",
    hotline: "Hotline",
    selectedSlot: "Slot pilihan",
    depositMethod: "Kaedah deposit",
    consent: "Saya bersetuju Usrah Medic menggunakan butiran ini untuk tempahan, pengendalian deposit, dan notifikasi pesakit.",
    submit: "Bayar RM10 & hantar tempahan",
    defaultReason: "Antenatal follow-up and routine check.",
    services: ["Antenatal follow-up", "2D/3D/4D/5D Ultrasound", "GP consultation", "Haji and Umrah screening", "Saringan kesihatan", "Rawatan keluarga dan kanak-kanak"],
    depositMethods: {
      fpx: "FPX online banking",
      ewallet: "eWallet / DuitNow",
      card: "Kad",
      counter: "Bayar di kaunter"
    }
  },
  zh: {
    loading: {
      title: "正在提交预约",
      detail: "我们正在保存患者资料、首选时段和 RM10 订金。"
    },
    initial: {
      title: "可以开始预约",
      detail: "检查患者资料，选择时段，然后确认 RM10 订金。"
    },
    fallbackOffline: "网络不稳定；诊所需要手动确认此请求。",
    fallbackEndpoint: "诊所需要手动确认此请求。",
    cardBadge: "预约表格",
    cardTitle: "预约资料",
    cardText: "这些资料会帮助分院确认时段并联系患者。",
    progress: ["资料", "时段", "订金"],
    loggedIn: "已登录患者",
    newPatient: "新患者",
    profileFilled: "个人资料已自动填写",
    profileEmpty: "请填写本次预约的患者资料",
    profileFilledText: "付款前仍可修改电话、电邮或就诊资料。",
    profileEmptyText: "资料将用于预约确认和订金收据。",
    bookOther: "为其他患者预约",
    useProfile: "使用登录资料",
    incompleteTitle: "预约资料不完整",
    incompleteDetail: "收取 RM10 订金前，需要姓名、电话、日期、时间和 PDPA 同意。",
    acceptedTitle: "预约请求已收到",
    rejectedTitle: "预约请求未被接受",
    successDetail: (service: string, branch: string, method: string) => `${service} 在 ${branch} 已记录，并通过 ${method} 支付 RM10 订金。`,
    fallbackDetail: (service: string, branch: string, reason: string) => `${service} 在 ${branch} 可交由诊所确认并收取 RM10 订金。${reason}`,
    retrySuffix: "请在 API 恢复后重试。",
    patientSectionTitle: "患者资料",
    patientSectionText: "用于身份确认、通知和订金收据。",
    fields: {
      fullName: "全名",
      phone: "电话号码",
      email: "电邮",
      idLast4: "IC/护照最后 4 位",
      dob: "出生日期",
      sex: "性别",
      visitReason: "就诊原因"
    },
    sex: {
      female: "女",
      male: "男",
      unknown: "不说明"
    },
    slotTitle: "时段和服务",
    slotText: "如果所选时段需要调整，诊所会联系您。",
    branch: "分院",
    service: "服务",
    appointmentDate: "预约日期",
    preferredTime: "首选时间",
    visitPlaceholder: "例如：产前复诊、扫描、小孩发烧、朝觐/副朝筛查",
    depositTitle: "RM10 订金",
    depositText: "请选择订金付款方式。诊所收到预约后会发送收据和确认。",
    paymentAria: "付款方式",
    summaryAria: "预约摘要",
    depositLabel: "订金",
    hotline: "热线",
    selectedSlot: "首选时段",
    depositMethod: "订金方式",
    consent: "我同意 Usrah Medic 使用这些资料处理预约、订金和患者通知。",
    submit: "支付 RM10 并提交预约",
    defaultReason: "产前复诊和常规检查。",
    services: ["产前复诊", "2D/3D/4D/5D 超声波", "普通门诊", "朝觐与副朝筛查", "健康筛查", "家庭和儿童治疗"],
    depositMethods: {
      fpx: "FPX 网上银行",
      ewallet: "电子钱包 / DuitNow",
      card: "银行卡",
      counter: "柜台付款"
    }
  },
  ta: {
    loading: {
      title: "முன்பதிவு அனுப்பப்படுகிறது",
      detail: "நோயாளர் விவரம், விருப்ப நேரம், மற்றும் RM10 முன்பணம் சேமிக்கப்படுகிறது."
    },
    initial: {
      title: "முன்பதிவுக்கு தயாராக உள்ளது",
      detail: "நோயாளர் விவரங்களை சரிபார்த்து, நேரம் தேர்வு செய்து, RM10 முன்பணத்தை உறுதி செய்க."
    },
    fallbackOffline: "இணைப்பு நிலையாக இல்லை; கிளினிக் இந்த கோரிக்கையை கைமுறையாக உறுதி செய்ய வேண்டும்.",
    fallbackEndpoint: "கிளினிக் இந்த கோரிக்கையை கைமுறையாக உறுதி செய்ய வேண்டும்.",
    cardBadge: "முன்பதிவு படிவம்",
    cardTitle: "நேர விவரங்கள்",
    cardText: "இந்த விவரங்கள் கிளைக்கு நேரத்தை உறுதி செய்து நோயாளரை தொடர்பு கொள்ள உதவும்.",
    progress: ["விவரம்", "நேரம்", "முன்பணம்"],
    loggedIn: "உள்நுழைந்த நோயாளர்",
    newPatient: "புதிய நோயாளர்",
    profileFilled: "சுயவிவர விவரங்கள் தானாக நிரப்பப்பட்டுள்ளன",
    profileEmpty: "இந்த முன்பதிவுக்கான நோயாளர் விவரங்களை நிரப்பவும்",
    profileFilledText: "கட்டணத்திற்கு முன் தொலைபேசி, மின்னஞ்சல், அல்லது வருகை விவரங்களை மாற்றலாம்.",
    profileEmptyText: "விவரங்கள் நேர உறுதி மற்றும் முன்பண ரசீதில் பயன்படுத்தப்படும்.",
    bookOther: "மற்ற நோயாளருக்கு பதிவு",
    useProfile: "உள்நுழைந்த சுயவிவரம் பயன்படுத்து",
    incompleteTitle: "முன்பதிவு விவரங்கள் முழுமையில்லை",
    incompleteDetail: "RM10 முன்பணம் பெறும் முன் பெயர், தொலைபேசி, தேதி, நேரம், மற்றும் PDPA ஒப்புதல் தேவை.",
    acceptedTitle: "நேர கோரிக்கை பெறப்பட்டது",
    rejectedTitle: "முன்பதிவு கோரிக்கை ஏற்கப்படவில்லை",
    successDetail: (service: string, branch: string, method: string) => `${service} ${branch} கிளையில் ${method} மூலம் RM10 முன்பணத்துடன் பதிவு செய்யப்பட்டது.`,
    fallbackDetail: (service: string, branch: string, reason: string) => `${service} ${branch} கிளையில் RM10 முன்பணத்துடன் கிளினிக் உறுதிப்படுத்தத் தயாராக உள்ளது. ${reason}`,
    retrySuffix: "API சரியாக இயங்கும் போது மீண்டும் முயற்சிக்கவும்.",
    patientSectionTitle: "நோயாளர் விவரங்கள்",
    patientSectionText: "அடையாள உறுதி, அறிவிப்பு, மற்றும் முன்பண ரசீதிற்காக.",
    fields: {
      fullName: "முழு பெயர்",
      phone: "தொலைபேசி எண்",
      email: "மின்னஞ்சல்",
      idLast4: "IC/passport கடைசி 4 இலக்கம்",
      dob: "பிறந்த தேதி",
      sex: "பாலினம்",
      visitReason: "வருகை காரணம்"
    },
    sex: {
      female: "பெண்",
      male: "ஆண்",
      unknown: "குறிப்பிட விருப்பமில்லை"
    },
    slotTitle: "நேரம் மற்றும் சேவை",
    slotText: "தேர்ந்தெடுத்த நேரம் மாற்றப்பட வேண்டுமானால் கிளினிக் தொடர்பு கொள்ளும்.",
    branch: "கிளை",
    service: "சேவை",
    appointmentDate: "நேர தேதி",
    preferredTime: "விருப்ப நேரம்",
    visitPlaceholder: "உதா: கர்ப்ப follow-up, scan, குழந்தை காய்ச்சல், ஹஜ்/உம்ரா screening",
    depositTitle: "RM10 முன்பணம்",
    depositText: "முன்பண கட்டண முறையைத் தேர்வு செய்க. கிளினிக் முன்பதிவைப் பெற்ற பிறகு ரசீதும் உறுதிப்படுத்தலும் அனுப்பப்படும்.",
    paymentAria: "கட்டண முறை",
    summaryAria: "முன்பதிவு சுருக்கம்",
    depositLabel: "முன்பணம்",
    hotline: "Hotline",
    selectedSlot: "விருப்ப நேரம்",
    depositMethod: "முன்பண முறை",
    consent: "இந்த விவரங்களை முன்பதிவு, முன்பணம், மற்றும் நோயாளர் அறிவிப்புகளுக்கு Usrah Medic பயன்படுத்த ஒப்புக்கொள்கிறேன்.",
    submit: "RM10 செலுத்தி முன்பதிவு அனுப்பு",
    defaultReason: "கர்ப்ப follow-up மற்றும் வழக்கமான பரிசோதனை.",
    services: ["கர்ப்ப follow-up", "2D/3D/4D/5D அல்ட்ராசவுண்ட்", "GP consultation", "ஹஜ் மற்றும் உம்ரா screening", "ஆரோக்கிய screening", "குடும்பம் மற்றும் குழந்தை சிகிச்சை"],
    depositMethods: {
      fpx: "FPX online banking",
      ewallet: "eWallet / DuitNow",
      card: "அட்டை",
      counter: "கவுண்டரில் செலுத்து"
    }
  }
} as const;
