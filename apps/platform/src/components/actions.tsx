"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Download, LoaderCircle, LockKeyhole, PackagePlus, QrCode, ShieldCheck, UserPlus, WalletCards, WifiOff } from "lucide-react";

type PanelKind = "admin" | "medicine" | "insight" | "patient" | "staff";
type ActionTone = "idle" | "loading" | "success" | "fallback" | "error";

interface ActionState {
  title: string;
  detail: string;
  tone: ActionTone;
}

interface ApiSuccess {
  kind: "success";
  requestId?: string;
}

interface ApiFallback {
  kind: "fallback";
  reason: string;
}

interface ApiFailure {
  kind: "error";
  message: string;
}

type ApiResult = ApiSuccess | ApiFallback | ApiFailure;
type ActionPayload = Record<string, unknown>;

const endpointLabels: Record<PanelKind, string> = {
  admin: "/api/appointments",
  medicine: "/api/stock/receive",
  insight: "/api/owner/export",
  patient: "/api/appointments",
  staff: "/api/stock/scan"
};

const loadingState: Record<PanelKind, ActionState> = {
  admin: {
    title: "Registering patient",
    detail: `Posting to ${endpointLabels.admin}...`,
    tone: "loading"
  },
  medicine: {
    title: "Receiving stock",
    detail: `Posting to ${endpointLabels.medicine}...`,
    tone: "loading"
  },
  insight: {
    title: "Requesting export",
    detail: `Posting to ${endpointLabels.insight}...`,
    tone: "loading"
  },
  patient: {
    title: "Menghantar tempahan",
    detail: "Kami sedang menyimpan butiran pesakit, slot pilihan, dan deposit RM10.",
    tone: "loading"
  },
  staff: {
    title: "Checking stock scan",
    detail: `Posting to ${endpointLabels.staff}...`,
    tone: "loading"
  }
};

const fallbackReasons = {
  missingEndpoint: "Klinik perlu mengesahkan permintaan ini secara manual.",
  offline: "Sambungan tidak stabil; klinik perlu mengesahkan permintaan ini secara manual."
};

const initialState: Record<PanelKind, ActionState> = {
  admin: {
    title: "No patient registered in this session",
    detail: `Ready to call ${endpointLabels.admin}; local fallback remains available.`,
    tone: "idle"
  },
  medicine: {
    title: "No stock received in this session",
    detail: `Ready to call ${endpointLabels.medicine}; local fallback remains available.`,
    tone: "idle"
  },
  insight: {
    title: "No export generated",
    detail: `Ready to call ${endpointLabels.insight}; local fallback can generate a safe JSON file.`,
    tone: "idle"
  },
  patient: {
    title: "Sedia untuk tempahan",
    detail: "Semak butiran pesakit, pilih slot, kemudian sahkan deposit RM10.",
    tone: "idle"
  },
  staff: {
    title: "No stock item scanned",
    detail: `Ready to call ${endpointLabels.staff}; local fallback remains available.`,
    tone: "idle"
  }
};

export function AdminRegistrationAction() {
  const [name, setName] = useState("");
  const [service, setService] = useState("GP consultation");
  const [state, setState] = useState(initialState.admin);

  return (
    <ActionPanel
      icon="admin"
      onLoading={() => setState(loadingState.admin)}
      state={state}
      title="Register patient"
      onSubmit={async () => {
        const patient = name.trim() || "Walk-in patient";
        const result = await postCloudflareAction(endpointLabels.admin, {
          branchId: "puncak-alam",
          patient: {
            fullName: patient,
            preferredName: patient,
            consentPdpaAt: new Date().toISOString(),
            privacyNoticeVersion: "2026-05-01"
          },
          appointment: {
            serviceCode: toServiceCode(service),
            serviceLabel: service,
            scheduledStart: nextAppointmentSlot().toISOString(),
            source: "counter"
          }
        }, {
          actorId: "platform-admin-preview",
          role: "admin"
        });

        setState({
          title: result.kind === "error" ? "Registration was not accepted" : `${patient} registered`,
          detail:
            result.kind === "success"
              ? `${service} added through Cloudflare API. Next station: triage.${formatRequestId(result.requestId)}`
              : result.kind === "fallback"
                ? `${service} added to the local queue preview. ${result.reason}`
                : `${result.message}. Please retry when the API is healthy.`,
          tone: result.kind === "success" ? "success" : result.kind === "fallback" ? "fallback" : "error"
        });
        if (result.kind !== "error") {
          setName("");
        }
      }}
    >
      <label className="field">
        <span>Patient name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nur Aina" />
      </label>
      <label className="field">
        <span>Service</span>
        <select value={service} onChange={(event) => setService(event.target.value)}>
          <option>GP consultation</option>
          <option>Antenatal follow-up</option>
          <option>Ultrasound appointment</option>
          <option>Dengue blood test</option>
          <option>Wound care</option>
        </select>
      </label>
    </ActionPanel>
  );
}

export function MedicineReceiveStockAction() {
  const [batch, setBatch] = useState("");
  const [quantity, setQuantity] = useState("24");
  const [state, setState] = useState(initialState.medicine);

  return (
    <ActionPanel
      icon="medicine"
      onLoading={() => setState(loadingState.medicine)}
      state={state}
      title="Receive stock"
      onSubmit={async () => {
        const batchNo = batch.trim() || "NEW-BATCH";
        const units = Number.parseInt(quantity, 10);
        const result = await postCloudflareAction(endpointLabels.medicine, {
          branchId: "puncak-alam",
          item: {
            sku: `MED-${batchNo}`,
            name: "Preview stock item",
            category: "medicine",
            unit: "unit",
            requiresBatchTracking: true
          },
          lot: {
            lotNumber: batchNo,
            expiresOn: "2028-12-31",
            quantity: Number.isFinite(units) ? units : 0,
            supplierName: "Preview licensed supplier"
          },
          quantity: Number.isFinite(units) ? units : 0,
          referenceType: "preview_receipt",
          reasonCode: "stock_received"
        }, {
          actorId: "platform-medicine-preview",
          role: "staff"
        });

        setState({
          title: result.kind === "error" ? "Stock receipt was not accepted" : `Batch ${batchNo} received`,
          detail:
            result.kind === "success"
              ? `${quantity || "0"} units posted to Cloudflare API for quarantine review.${formatRequestId(result.requestId)}`
              : result.kind === "fallback"
                ? `${quantity || "0"} units placed into local quarantine preview. ${result.reason}`
                : `${result.message}. Please retry when the API is healthy.`,
          tone: result.kind === "success" ? "success" : result.kind === "fallback" ? "fallback" : "error"
        });
        if (result.kind !== "error") {
          setBatch("");
        }
      }}
    >
      <label className="field">
        <span>Batch number</span>
        <input value={batch} onChange={(event) => setBatch(event.target.value)} placeholder="VX-2501" />
      </label>
      <label className="field">
        <span>Quantity</span>
        <input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" />
      </label>
    </ActionPanel>
  );
}

export function InsightExportAction() {
  const [state, setState] = useState(initialState.insight);

  return (
    <ActionPanel
      icon="insight"
      onLoading={() => setState(loadingState.insight)}
      state={state}
      title="Generate export"
      onSubmit={async () => {
        const payload = buildInsightExportPayload();
        const result = await getCloudflareAction(`${endpointLabels.insight}?includePhi=false`, {
          actorId: "platform-owner-preview",
          role: "owner"
        });

        if (result.kind !== "error") {
          downloadJson(payload, "usrahmedic-owner-summary.json");
        }

        setState({
          title: result.kind === "error" ? "Export request was not accepted" : "PHI-safe export generated",
          detail:
            result.kind === "success"
              ? `Cloudflare API accepted the export request and a safe local copy was downloaded.${formatRequestId(result.requestId)}`
              : result.kind === "fallback"
                ? `Downloaded owner summary JSON with clinical fields excluded. ${result.reason}`
                : `${result.message}. Please retry when the API is healthy.`,
          tone: result.kind === "success" ? "success" : result.kind === "fallback" ? "fallback" : "error"
        });
      }}
    >
      <p className="muted">Posts an export request first; local JSON is retained only as a Cloudflare/offline fallback.</p>
    </ActionPanel>
  );
}

export function PatientBookingAction() {
  const [branch, setBranch] = useState("Puncak Alam");
  const [service, setService] = useState("Antenatal follow-up");
  const [appointmentDate, setAppointmentDate] = useState(defaultAppointmentDate());
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [fullName, setFullName] = useState(savedPatientProfile.fullName);
  const [phone, setPhone] = useState(savedPatientProfile.phoneE164);
  const [email, setEmail] = useState(savedPatientProfile.email);
  const [nationalIdLast4, setNationalIdLast4] = useState(savedPatientProfile.nationalIdLast4);
  const [dateOfBirth, setDateOfBirth] = useState(savedPatientProfile.dateOfBirth);
  const [sex, setSex] = useState(savedPatientProfile.sex);
  const [visitReason, setVisitReason] = useState("Antenatal follow-up and routine check.");
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("fpx");
  const [hasConsent, setHasConsent] = useState(true);
  const [state, setState] = useState(initialState.patient);
  const branchInfo = patientBranches.find((item) => item.name === branch) ?? patientBranches[0];
  const selectedDepositMethod = depositLabel(depositMethod);

  return (
    <div className="booking-card" id="book">
      <div className="booking-card-header">
        <span className="pill brand-pill">
          <CalendarCheck size={15} aria-hidden="true" />
          Borang tempahan
        </span>
        <h2>Maklumat janji temu</h2>
        <p>Butiran ini digunakan oleh cawangan untuk mengesahkan slot dan menghubungi pesakit.</p>
      </div>

      <div className={`action-status status-${state.tone}`} aria-live="polite">
        <CheckCircle2 size={18} aria-hidden="true" />
        <div>
          <strong>{state.title}</strong>
          <p>{state.detail}</p>
        </div>
      </div>

      <div className="booking-progress" aria-label="Booking progress">
        <span className="active">Butiran</span>
        <span>Slot</span>
        <span>Deposit</span>
      </div>

      <div className="profile-strip">
        <div>
          <span className="pill brand-pill">
            <LockKeyhole size={14} aria-hidden="true" />
            {isLoggedIn ? "Pesakit log masuk" : "Pesakit baharu"}
          </span>
          <strong>{isLoggedIn ? "Maklumat profil telah diisi automatik" : "Isi butiran pesakit untuk tempahan ini"}</strong>
          <p>{isLoggedIn ? "Pesakit masih boleh ubah nombor telefon, emel, atau butiran lawatan sebelum bayaran." : "Maklumat akan digunakan untuk pengesahan janji temu dan resit deposit."}</p>
        </div>
        <button
          className="secondary-action"
          type="button"
          onClick={() => {
            const nextValue = !isLoggedIn;
            setIsLoggedIn(nextValue);
            if (nextValue) {
              setFullName(savedPatientProfile.fullName);
              setPhone(savedPatientProfile.phoneE164);
              setEmail(savedPatientProfile.email);
              setNationalIdLast4(savedPatientProfile.nationalIdLast4);
              setDateOfBirth(savedPatientProfile.dateOfBirth);
              setSex(savedPatientProfile.sex);
            } else {
              setFullName("");
              setPhone("");
              setEmail("");
              setNationalIdLast4("");
              setDateOfBirth("");
              setSex("unknown");
            }
          }}
        >
          {isLoggedIn ? "Tempah untuk pesakit lain" : "Guna profil log masuk"}
        </button>
      </div>

      <form
        className="patient-booking-form"
        onSubmit={async (event) => {
          event.preventDefault();

          if (!fullName.trim() || !phone.trim() || !appointmentDate || !appointmentTime || !hasConsent) {
            setState({
              title: "Booking details incomplete",
              detail: "Name, phone, visit date, time, and PDPA consent are required before collecting the RM10 deposit.",
              tone: "error"
            });
            return;
          }

          setState(loadingState.patient);
          const result = await postCloudflareAction(endpointLabels.patient, {
            branchId: branchNameToId(branch),
            patient: {
              fullName,
              preferredName: fullName.split(" ")[0] || fullName,
              nationalIdLast4,
              dateOfBirth,
              sex,
              phoneE164: phone,
              email,
              consentPdpaAt: new Date().toISOString(),
              privacyNoticeVersion: "2026-05-01"
            },
            appointment: {
              serviceCode: toServiceCode(service),
              serviceLabel: service,
              scheduledStart: combineAppointmentDateTime(appointmentDate, appointmentTime).toISOString(),
              source: "web",
              note: visitReason
            },
            deposit: {
              required: true,
              amountCents: 1000,
              currency: "MYR",
              method: depositMethod
            }
          });

          setState({
            title: result.kind === "error" ? "Booking request was not accepted" : "Appointment request received",
            detail:
              result.kind === "success"
                ? `${service} di ${branch} direkodkan dengan deposit RM10 melalui ${selectedDepositMethod}.${formatRequestId(result.requestId)}`
                : result.kind === "fallback"
                  ? `${service} di ${branch} sedia untuk pengesahan klinik dengan kutipan deposit RM10. ${result.reason}`
                  : `${result.message}. Please retry when the API is healthy.`,
            tone: result.kind === "success" ? "success" : result.kind === "fallback" ? "fallback" : "error"
          });
        }}
      >
        <div className="booking-layout">
          <div className="booking-main">
            <section className="booking-section">
              <div className="booking-section-heading">
                <span>1</span>
                <div>
                  <h3>Butiran pesakit</h3>
                  <p>Untuk pengesahan identiti, notifikasi, dan resit deposit.</p>
                </div>
              </div>
              <div className="booking-grid">
                <label className="field">
                  <span>Nama penuh</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nur Aina Binti Abdullah" required />
                </label>
                <label className="field">
                  <span>No. telefon</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+60123456789" required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="aina@example.com" />
                </label>
                <label className="field">
                  <span>4 digit akhir IC/passport</span>
                  <input value={nationalIdLast4} onChange={(event) => setNationalIdLast4(event.target.value.slice(0, 4))} inputMode="numeric" placeholder="1234" />
                </label>
                <label className="field">
                  <span>Tarikh lahir</span>
                  <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
                </label>
                <label className="field">
                  <span>Jantina</span>
                  <select value={sex} onChange={(event) => setSex(event.target.value)}>
                    <option value="female">Perempuan</option>
                    <option value="male">Lelaki</option>
                    <option value="unknown">Tidak dinyatakan</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="booking-section">
              <div className="booking-section-heading">
                <span>2</span>
                <div>
                  <h3>Slot dan perkhidmatan</h3>
                  <p>Klinik akan hubungi jika slot pilihan perlu dilaraskan.</p>
                </div>
              </div>
              <div className="booking-grid">
                <label className="field">
                  <span>Cawangan</span>
                  <select value={branch} onChange={(event) => setBranch(event.target.value)}>
                    {patientBranches.map((item) => (
                      <option key={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Perkhidmatan</span>
                  <select value={service} onChange={(event) => setService(event.target.value)}>
                    <option>Antenatal follow-up</option>
                    <option>2D/3D/4D/5D Ultrasound</option>
                    <option>GP consultation</option>
                    <option>Haji and Umrah screening</option>
                    <option>Saringan kesihatan</option>
                    <option>Rawatan keluarga dan kanak-kanak</option>
                  </select>
                </label>
                <label className="field">
                  <span>Tarikh janji temu</span>
                  <input type="date" min={todayDateInputValue()} value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} required />
                </label>
                <label className="field">
                  <span>Masa pilihan</span>
                  <select value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)}>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="20:00">8:00 PM</option>
                  </select>
                </label>
                <label className="field field-wide">
                  <span>Tujuan lawatan</span>
                  <textarea value={visitReason} onChange={(event) => setVisitReason(event.target.value)} placeholder="Contoh: Follow-up antenatal, scan, demam anak, saringan haji/umrah" rows={3} />
                </label>
              </div>
            </section>

            <section className="booking-section">
              <div className="booking-section-heading">
                <span>3</span>
                <div>
                  <h3>Deposit RM10</h3>
                  <p>Pilih kaedah bayaran deposit. Resit dan pengesahan akan dihantar selepas klinik menerima tempahan.</p>
                </div>
              </div>
              <div className="deposit-options" aria-label="Payment method">
                {depositMethods.map((method) => (
                  <button
                    className={depositMethod === method.value ? "deposit-option active" : "deposit-option"}
                    key={method.value}
                    type="button"
                    onClick={() => setDepositMethod(method.value)}
                  >
                    <WalletCards size={18} aria-hidden="true" />
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="booking-summary" aria-label="Booking summary">
            <div className="summary-total">
              <span>Deposit</span>
              <strong>RM10.00</strong>
            </div>
            <dl>
              <div>
                <dt>Cawangan</dt>
                <dd>{branch}</dd>
              </div>
              <div>
                <dt>Hotline</dt>
                <dd>{branchInfo.hotline}</dd>
              </div>
              <div>
                <dt>Perkhidmatan</dt>
                <dd>{service}</dd>
              </div>
              <div>
                <dt>Slot pilihan</dt>
                <dd>{appointmentDate} / {appointmentTime}</dd>
              </div>
              <div>
                <dt>Kaedah deposit</dt>
                <dd>{selectedDepositMethod}</dd>
              </div>
            </dl>
            <label className="checkbox-field">
              <input checked={hasConsent} onChange={(event) => setHasConsent(event.target.checked)} type="checkbox" />
              <span>Saya bersetuju Usrah Medic menggunakan butiran ini untuk tempahan, pengendalian deposit, dan notifikasi pesakit.</span>
            </label>
            <button className="primary-action patient-submit" type="submit">
              <ShieldCheck size={18} aria-hidden="true" />
              Bayar RM10 & hantar tempahan
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}

export function StaffScanAction() {
  const [code, setCode] = useState("");
  const [state, setState] = useState(initialState.staff);

  return (
    <ActionPanel
      icon="staff"
      onLoading={() => setState(loadingState.staff)}
      state={state}
      title="Scan stock"
      onSubmit={async () => {
        const scanCode = code.trim() || "Batch";
        const result = await postCloudflareAction(endpointLabels.staff, {
          branchId: "puncak-alam",
          scannedCode: scanCode,
          lotNumber: scanCode,
          scanPurpose: "verify",
          source: "platform-staff-foundation"
        }, {
          actorId: "platform-staff-preview",
          role: "staff"
        });

        setState({
          title: result.kind === "error" ? "Stock scan was not accepted" : `${scanCode} scanned`,
          detail:
            result.kind === "success"
              ? `Cloudflare API accepted the stock check. Expiry and recall checks remain required before dispense.${formatRequestId(result.requestId)}`
              : result.kind === "fallback"
                ? `Local scan result: available stock, expiry and recall checks required before dispense. ${result.reason}`
                : `${result.message}. Please retry when the API is healthy.`,
          tone: result.kind === "success" ? "success" : result.kind === "fallback" ? "fallback" : "error"
        });
        if (result.kind !== "error") {
          setCode("");
        }
      }}
    >
      <label className="field">
        <span>Barcode or batch</span>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="PA-2401" />
      </label>
    </ActionPanel>
  );
}

function ActionPanel({
  children,
  icon,
  onLoading,
  onSubmit,
  state,
  title
}: {
  children: ReactNode;
  icon: PanelKind;
  onLoading: () => void;
  onSubmit: () => Promise<void>;
  state: ActionState;
  title: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const Icon = {
    admin: UserPlus,
    medicine: PackagePlus,
    insight: Download,
    patient: CalendarCheck,
    staff: QrCode
  }[icon];
  const StatusIcon = {
    idle: CheckCircle2,
    loading: LoaderCircle,
    success: CheckCircle2,
    fallback: WifiOff,
    error: AlertCircle
  }[state.tone];

  return (
    <div className="action-panel">
      <div className={`action-status status-${state.tone}`} aria-live="polite">
        <StatusIcon className={state.tone === "loading" ? "spin" : undefined} size={18} aria-hidden="true" />
        <div>
          <strong>{state.title}</strong>
          <p>{state.detail}</p>
        </div>
      </div>
      <form
        className="action-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (isSubmittingRef.current) {
            return;
          }

          isSubmittingRef.current = true;
          setIsSubmitting(true);
          onLoading();
          try {
            await onSubmit();
          } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        }}
      >
        <fieldset className="action-fields" disabled={isSubmitting}>
          {children}
        </fieldset>
        <button className="primary-action" disabled={isSubmitting} type="submit">
          <Icon size={18} aria-hidden="true" />
          {isSubmitting ? "Working..." : title}
        </button>
      </form>
    </div>
  );
}

async function postCloudflareAction(endpoint: string, payload: ActionPayload, auth?: ApiAuth): Promise<ApiResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: apiHeaders(auth),
      body: JSON.stringify(payload)
    });

    return responseToApiResult(response);
  } catch {
    return { kind: "fallback", reason: fallbackReasons.offline };
  }
}

async function getCloudflareAction(endpoint: string, auth?: ApiAuth): Promise<ApiResult> {
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: apiHeaders(auth, false)
    });

    return responseToApiResult(response);
  } catch {
    return { kind: "fallback", reason: fallbackReasons.offline };
  }
}

async function responseToApiResult(response: Response): Promise<ApiResult> {
  if (response.ok) {
    return {
      kind: "success",
      requestId: response.headers.get("cf-ray") ?? response.headers.get("x-request-id") ?? undefined
    };
  }

  if (response.status === 404 || response.status === 405 || response.status === 501 || response.status === 503) {
    return { kind: "fallback", reason: fallbackReasons.missingEndpoint };
  }

  return {
    kind: "error",
    message: `Cloudflare API returned ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`
  };
}

interface ApiAuth {
  actorId: string;
  role: "owner" | "admin" | "staff";
}

function apiHeaders(auth: ApiAuth | undefined, includeJson = true): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    headers["X-UsrahMedic-Actor-Id"] = auth.actorId;
    headers["X-UsrahMedic-Role"] = auth.role;
  }

  return headers;
}

function buildInsightExportPayload(): ActionPayload {
  return {
    generatedAt: new Date().toISOString(),
    scope: "PHI-safe owner summary",
    metrics: ["daily revenue", "queue SLA", "panel AR", "medicine expiry risk"],
    excluded: ["clinical notes", "raw IC/passport", "prescription detail", "WhatsApp message content"],
    source: "platform-insight-foundation"
  };
}

function branchNameToId(branch: string) {
  return {
    "Puncak Alam": "puncak-alam",
    "Bukit Jelutong": "bukit-jelutong",
    "Seremban 2": "seremban-2"
  }[branch] ?? "puncak-alam";
}

function toServiceCode(service: string) {
  return service.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "general-consultation";
}

function nextAppointmentSlot() {
  const slot = new Date();
  slot.setUTCDate(slot.getUTCDate() + 1);
  slot.setUTCHours(2, 0, 0, 0);
  return slot;
}

type DepositMethod = "fpx" | "ewallet" | "card" | "counter";

const patientBranches = [
  { id: "puncak-alam", name: "Puncak Alam", hotline: "011-3566 4998" },
  { id: "bukit-jelutong", name: "Bukit Jelutong", hotline: "012-445 4998" },
  { id: "seremban-2", name: "Seremban 2", hotline: "011-1130 4998" }
];

const savedPatientProfile = {
  fullName: "Nur Aina Binti Abdullah",
  phoneE164: "+60123456789",
  email: "aina@example.com",
  nationalIdLast4: "4321",
  dateOfBirth: "1992-05-18",
  sex: "female"
};

const depositMethods: Array<{ label: string; value: DepositMethod }> = [
  { label: "FPX online banking", value: "fpx" },
  { label: "eWallet / DuitNow", value: "ewallet" },
  { label: "Card", value: "card" },
  { label: "Pay at counter", value: "counter" }
];

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultAppointmentDate() {
  return nextAppointmentSlot().toISOString().slice(0, 10);
}

function combineAppointmentDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`);
}

function depositLabel(method: DepositMethod) {
  return depositMethods.find((item) => item.value === method)?.label ?? "payment";
}

function downloadJson(payload: ActionPayload, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRequestId(requestId?: string) {
  return requestId ? ` Request: ${requestId}.` : "";
}
