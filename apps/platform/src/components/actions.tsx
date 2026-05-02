"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Download, LoaderCircle, LockKeyhole, PackagePlus, QrCode, ShieldCheck, UserPlus, WalletCards, WifiOff } from "lucide-react";
import { usePatientBookingCopy } from "./language";

type PanelKind = "admin" | "medicine" | "insight" | "patient" | "staff" | "claims";
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
  staff: "/api/stock/scan",
  claims: "/api/claims/eligibility"
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
  },
  claims: {
    title: "Checking payer eligibility",
    detail: "Running eligibility, GL, claim submission, and remittance through the production claims API contracts...",
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
  },
  claims: {
    title: "No payer claim processed",
    detail: "Ready to run a production-equivalent mock payer flow for AIA, PMCare, Takaful, or a generic TPA.",
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

export function InsuranceClaimAction() {
  const [payer, setPayer] = useState("payer-pmcare");
  const [claimMode, setClaimMode] = useState("guarantee_letter");
  const [scenario, setScenario] = useState("approve");
  const [amount, setAmount] = useState("180");
  const [state, setState] = useState(initialState.claims);

  return (
    <ActionPanel
      icon="claims"
      onLoading={() => setState(loadingState.claims)}
      state={state}
      title="Run claim"
      onSubmit={async () => {
        const amountCents = Math.max(100, Math.round(Number.parseFloat(amount || "0") * 100));
        const claimId = `claim-demo-${Date.now()}`;
        const eligibilityId = `eligibility-demo-${Date.now()}`;
        const preauthId = `preauth-demo-${Date.now()}`;
        const auth = {
          actorId: "platform-billing-preview",
          role: "admin" as const
        };
        const eligibility = await postCloudflareAction("/api/claims/eligibility", {
          id: eligibilityId,
          branchId: "puncak-alam",
          patientId: "patient-demo-claim",
          payerProviderId: payer,
          patientPayerMembershipId: "membership-demo-claim",
          requestedClaimMode: claimMode,
          invoiceId: "invoice-demo-claim",
          invoiceTotalCents: amountCents,
          outpatientCashlessEnabled: payer !== "payer-aia"
        }, auth);

        if (eligibility.kind === "error") {
          setState({
            title: "Eligibility check failed",
            detail: eligibility.message,
            tone: "error"
          });
          return;
        }

        if (claimMode === "guarantee_letter") {
          const preauth = await postCloudflareAction("/api/claims/preauth", {
            id: preauthId,
            branchId: "puncak-alam",
            eligibilityCheckId: eligibilityId,
            patientId: "patient-demo-claim",
            payerProviderId: payer,
            invoiceId: "invoice-demo-claim",
            requestedAmountCents: amountCents,
            diagnosisCode: "Z00.0",
            attachments: [{ attachmentType: "referral", storageUri: "mock://claim/referral.pdf" }]
          }, auth);

          if (preauth.kind === "error") {
            setState({
              title: "Guarantee letter request failed",
              detail: preauth.message,
              tone: "error"
            });
            return;
          }
        }

        const submission = await postCloudflareAction("/api/claims/submissions", {
          id: claimId,
          branchId: "puncak-alam",
          payerProviderId: payer,
          patientId: "patient-demo-claim",
          invoiceId: "invoice-demo-claim",
          eligibilityCheckId: eligibilityId,
          preauthRequestId: claimMode === "guarantee_letter" ? preauthId : undefined,
          claimMode,
          requestedAmountCents: amountCents,
          invoiceTotalCents: amountCents,
          scenario,
          lines: [
            {
              localCode: "general-consultation",
              payerCode: "OP-CONSULT",
              description: "Demo outpatient consultation",
              quantity: 1,
              requestedAmountCents: amountCents
            }
          ],
          attachments: [{ attachmentType: "invoice", storageUri: "mock://claim/invoice.pdf" }]
        }, auth);

        if (submission.kind === "error") {
          setState({
            title: "Claim submission failed",
            detail: submission.message,
            tone: "error"
          });
          return;
        }

        if (scenario === "pay" || scenario === "reconcile") {
          const remittance = await postCloudflareAction("/api/claims/remittances", {
            branchId: "puncak-alam",
            payerProviderId: payer,
            claimSubmissionId: claimId,
            amountCents,
            status: scenario === "reconcile" ? "reconciled" : "matched",
            externalReference: `MOCK-REMIT-${Date.now()}`
          }, auth);

          if (remittance.kind === "error") {
            setState({
              title: "Remittance failed",
              detail: remittance.message,
              tone: "error"
            });
            return;
          }
        }

        const payerName = payerOptions.find((option) => option.value === payer)?.label ?? "payer";
        setState({
          title: submission.kind === "fallback" ? "Claim queued for payer portal" : `${payerName} claim workflow recorded`,
          detail:
            submission.kind === "success"
              ? `${claimModeLabel(claimMode)} flow completed with ${scenarioLabel(scenario)} state through production-equivalent API contracts.${formatRequestId(submission.requestId)}`
              : `The claim data is ready for manual portal handling. ${submission.reason}`,
          tone: submission.kind === "success" ? "success" : "fallback"
        });
      }}
    >
      <label className="field">
        <span>Payer / TPA</span>
        <select value={payer} onChange={(event) => setPayer(event.target.value)}>
          {payerOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Claim mode</span>
        <select value={claimMode} onChange={(event) => setClaimMode(event.target.value)}>
          <option value="cashless_panel">Cashless panel</option>
          <option value="guarantee_letter">Guarantee letter / preauth</option>
          <option value="reimbursement">Patient reimbursement</option>
        </select>
      </label>
      <label className="field">
        <span>Mock payer outcome</span>
        <select value={scenario} onChange={(event) => setScenario(event.target.value)}>
          <option value="approve">Approved</option>
          <option value="query">Queried</option>
          <option value="partial">Partially approved</option>
          <option value="reject">Rejected</option>
          <option value="pay">Paid</option>
          <option value="reconcile">Reconciled</option>
        </select>
      </label>
      <label className="field">
        <span>Claim amount (RM)</span>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
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
  const copy = usePatientBookingCopy();
  const [branch, setBranch] = useState("Puncak Alam");
  const [serviceIndex, setServiceIndex] = useState(0);
  const [appointmentDate, setAppointmentDate] = useState(defaultAppointmentDate());
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [fullName, setFullName] = useState(savedPatientProfile.fullName);
  const [phone, setPhone] = useState(savedPatientProfile.phoneE164);
  const [email, setEmail] = useState(savedPatientProfile.email);
  const [nationalIdLast4, setNationalIdLast4] = useState(savedPatientProfile.nationalIdLast4);
  const [dateOfBirth, setDateOfBirth] = useState(savedPatientProfile.dateOfBirth);
  const [sex, setSex] = useState(savedPatientProfile.sex);
  const [visitReason, setVisitReason] = useState<string>(copy.defaultReason);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("fpx");
  const [hasConsent, setHasConsent] = useState(true);
  const [state, setState] = useState<ActionState>({ ...copy.initial, tone: "idle" });
  const branchInfo = patientBranches.find((item) => item.name === branch) ?? patientBranches[0];
  const service = copy.services[serviceIndex] ?? copy.services[0];
  const selectedDepositMethod = copy.depositMethods[depositMethod];

  useEffect(() => {
    setState((current) => (current.tone === "idle" ? { ...copy.initial, tone: "idle" } : current));
    setVisitReason((current) => (allDefaultVisitReasons.has(current) ? copy.defaultReason : current));
  }, [copy]);

  return (
    <div className="booking-card" id="book">
      <div className="booking-card-header">
        <span className="pill brand-pill">
          <CalendarCheck size={15} aria-hidden="true" />
          {copy.cardBadge}
        </span>
        <h2>{copy.cardTitle}</h2>
        <p>{copy.cardText}</p>
      </div>

      <div className={`action-status status-${state.tone}`} aria-live="polite">
        <CheckCircle2 size={18} aria-hidden="true" />
        <div>
          <strong>{state.title}</strong>
          <p>{state.detail}</p>
        </div>
      </div>

      <div className="booking-progress" aria-label="Booking progress">
        <span className="active">{copy.progress[0]}</span>
        <span>{copy.progress[1]}</span>
        <span>{copy.progress[2]}</span>
      </div>

      <div className="profile-strip">
        <div>
          <span className="pill brand-pill">
            <LockKeyhole size={14} aria-hidden="true" />
            {isLoggedIn ? copy.loggedIn : copy.newPatient}
          </span>
          <strong>{isLoggedIn ? copy.profileFilled : copy.profileEmpty}</strong>
          <p>{isLoggedIn ? copy.profileFilledText : copy.profileEmptyText}</p>
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
          {isLoggedIn ? copy.bookOther : copy.useProfile}
        </button>
      </div>

      <form
        className="patient-booking-form"
        onSubmit={async (event) => {
          event.preventDefault();

          if (!fullName.trim() || !phone.trim() || !appointmentDate || !appointmentTime || !hasConsent) {
            setState({
              title: copy.incompleteTitle,
              detail: copy.incompleteDetail,
              tone: "error"
            });
            return;
          }

          setState({ ...copy.loading, tone: "loading" });
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
            title: result.kind === "error" ? copy.rejectedTitle : copy.acceptedTitle,
            detail:
              result.kind === "success"
                ? `${copy.successDetail(service, branch, selectedDepositMethod)}${formatRequestId(result.requestId)}`
                : result.kind === "fallback"
                  ? copy.fallbackDetail(service, branch, localizedPatientFallbackReason(result.reason, copy))
                  : `${result.message}. ${copy.retrySuffix}`,
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
                  <h3>{copy.patientSectionTitle}</h3>
                  <p>{copy.patientSectionText}</p>
                </div>
              </div>
              <div className="booking-grid">
                <label className="field">
                  <span>{copy.fields.fullName}</span>
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nur Aina Binti Abdullah" required />
                </label>
                <label className="field">
                  <span>{copy.fields.phone}</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+60123456789" required />
                </label>
                <label className="field">
                  <span>{copy.fields.email}</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="aina@example.com" />
                </label>
                <label className="field">
                  <span>{copy.fields.idLast4}</span>
                  <input value={nationalIdLast4} onChange={(event) => setNationalIdLast4(event.target.value.slice(0, 4))} inputMode="numeric" placeholder="1234" />
                </label>
                <label className="field">
                  <span>{copy.fields.dob}</span>
                  <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
                </label>
                <label className="field">
                  <span>{copy.fields.sex}</span>
                  <select value={sex} onChange={(event) => setSex(event.target.value)}>
                    <option value="female">{copy.sex.female}</option>
                    <option value="male">{copy.sex.male}</option>
                    <option value="unknown">{copy.sex.unknown}</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="booking-section">
              <div className="booking-section-heading">
                <span>2</span>
                <div>
                  <h3>{copy.slotTitle}</h3>
                  <p>{copy.slotText}</p>
                </div>
              </div>
              <div className="booking-grid">
                <label className="field">
                  <span>{copy.branch}</span>
                  <select value={branch} onChange={(event) => setBranch(event.target.value)}>
                    {patientBranches.map((item) => (
                      <option key={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{copy.service}</span>
                  <select value={serviceIndex} onChange={(event) => setServiceIndex(Number.parseInt(event.target.value, 10))}>
                    {copy.services.map((serviceOption, index) => (
                      <option key={serviceOption} value={index}>{serviceOption}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{copy.appointmentDate}</span>
                  <input type="date" min={todayDateInputValue()} value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} required />
                </label>
                <label className="field">
                  <span>{copy.preferredTime}</span>
                  <select value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)}>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="14:30">2:30 PM</option>
                    <option value="20:00">8:00 PM</option>
                  </select>
                </label>
                <label className="field field-wide">
                  <span>{copy.fields.visitReason}</span>
                  <textarea value={visitReason} onChange={(event) => setVisitReason(event.target.value)} placeholder={copy.visitPlaceholder} rows={3} />
                </label>
              </div>
            </section>

            <section className="booking-section">
              <div className="booking-section-heading">
                <span>3</span>
                <div>
                  <h3>{copy.depositTitle}</h3>
                  <p>{copy.depositText}</p>
                </div>
              </div>
              <div className="deposit-options" aria-label={copy.paymentAria}>
                {depositMethods.map((method) => (
                  <button
                    className={depositMethod === method.value ? "deposit-option active" : "deposit-option"}
                    key={method.value}
                    type="button"
                    onClick={() => setDepositMethod(method.value)}
                  >
                    <WalletCards size={18} aria-hidden="true" />
                    <span>{copy.depositMethods[method.value]}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="booking-summary" aria-label={copy.summaryAria}>
            <div className="summary-total">
              <span>{copy.depositLabel}</span>
              <strong>RM10.00</strong>
            </div>
            <dl>
              <div>
                <dt>{copy.branch}</dt>
                <dd>{branch}</dd>
              </div>
              <div>
                <dt>{copy.hotline}</dt>
                <dd>{branchInfo.hotline}</dd>
              </div>
              <div>
                <dt>{copy.service}</dt>
                <dd>{service}</dd>
              </div>
              <div>
                <dt>{copy.selectedSlot}</dt>
                <dd>{appointmentDate} / {appointmentTime}</dd>
              </div>
              <div>
                <dt>{copy.depositMethod}</dt>
                <dd>{selectedDepositMethod}</dd>
              </div>
            </dl>
            <label className="checkbox-field">
              <input checked={hasConsent} onChange={(event) => setHasConsent(event.target.checked)} type="checkbox" />
              <span>{copy.consent}</span>
            </label>
            <button className="primary-action patient-submit" type="submit">
              <ShieldCheck size={18} aria-hidden="true" />
              {copy.submit}
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
    staff: QrCode,
    claims: WalletCards
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

const allDefaultVisitReasons = new Set([
  "Antenatal follow-up and routine check.",
  "产前复诊和常规检查。",
  "கர்ப்ப follow-up மற்றும் வழக்கமான பரிசோதனை."
]);

const depositMethods: Array<{ label: string; value: DepositMethod }> = [
  { label: "FPX online banking", value: "fpx" },
  { label: "eWallet / DuitNow", value: "ewallet" },
  { label: "Card", value: "card" },
  { label: "Pay at counter", value: "counter" }
];

const payerOptions = [
  { label: "AIA Malaysia", value: "payer-aia" },
  { label: "AIA PUBLIC Takaful", value: "payer-aia-takaful" },
  { label: "PMCare", value: "payer-pmcare" },
  { label: "MiCare", value: "payer-micare" },
  { label: "HealthMetrics", value: "payer-healthmetrics" },
  { label: "CompuMed", value: "payer-compumed" }
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

function localizedPatientFallbackReason(reason: string, copy: ReturnType<typeof usePatientBookingCopy>) {
  return reason === fallbackReasons.offline ? copy.fallbackOffline : copy.fallbackEndpoint;
}

function claimModeLabel(mode: string) {
  return {
    cashless_panel: "cashless panel",
    guarantee_letter: "guarantee letter",
    reimbursement: "reimbursement"
  }[mode] ?? "claim";
}

function scenarioLabel(scenario: string) {
  return {
    approve: "approved",
    query: "queried",
    partial: "partially approved",
    reject: "rejected",
    pay: "paid",
    reconcile: "reconciled"
  }[scenario] ?? scenario;
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
