import { forwardRef } from "react";

/**
 * PortalReplica — renders ONE simulated university portal in React, per its
 * `style`. These deliberately do NOT use the QuestCampus design system: they use
 * inline styles / plain classes so they read as three distinct external
 * university application portals at a squint. The look mirrors the worker's HTML
 * templates (worker/src/demo/templates.ts): commonapp = navy institutional SaaS
 * with a left section rail of green ticks; direct = cream serif portal with a
 * crest + accent bar + fieldsets; intl = dense blue-gray portal with numbered
 * ALL-CAPS sections + a mono reference number.
 *
 * All fields render read-only. The animation loop drives them via props:
 * - `displayValueByFieldKey` — progressively-typed value for each field
 * - `filledFieldKeys`        — fields whose typing has completed
 * - `fillingFieldKey`        — the field currently being typed (highlighted)
 *
 * Nothing here submits; buttons are decorative.
 */

export type PortalReplicaStepKind =
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "email"
  | "tel";

export interface PortalReplicaStep {
  stepId: string;
  fieldKey: string;
  conceptKey: string;
  label: string;
  kind: PortalReplicaStepKind;
  value: string;
  source: "yours" | "example";
  options?: string[];
}

export interface PortalReplicaSpec {
  key: string;
  name: string;
  university: string;
  style: "commonapp" | "direct" | "intl";
  accent?: string;
  steps: PortalReplicaStep[];
}

export interface PortalReplicaProps {
  portal: PortalReplicaSpec;
  fillingFieldKey?: string;
  displayValueByFieldKey: Record<string, string>;
  filledFieldKeys: Set<string>;
}

type FieldState = {
  step: PortalReplicaStep;
  shown: string;
  isFilling: boolean;
  isFilled: boolean;
};

function fieldStateFor(
  step: PortalReplicaStep,
  props: PortalReplicaProps,
): FieldState {
  const isFilling = props.fillingFieldKey === step.fieldKey;
  const isFilled = props.filledFieldKeys.has(step.fieldKey);
  const shown = props.displayValueByFieldKey[step.fieldKey] ?? "";
  return { step, shown, isFilling, isFilled };
}

/** First 6 steps are the shared identity block; the rest are app-specific. */
function splitSections(steps: PortalReplicaStep[]): {
  identity: PortalReplicaStep[];
  rest: PortalReplicaStep[];
} {
  return { identity: steps.slice(0, 6), rest: steps.slice(6) };
}

const CARET_KEYFRAMES =
  "@keyframes qcDemoCaret{0%,100%{opacity:1}50%{opacity:0}}";

const ACCENT_FALLBACK = "#8a1538";
function safeAccent(accent?: string): string {
  return accent && /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : ACCENT_FALLBACK;
}

export const PortalReplica = forwardRef<HTMLDivElement, PortalReplicaProps>(
  function PortalReplica(props, ref) {
    const { portal } = props;
    return (
      <div ref={ref} className="w-full min-w-0">
        <style>{CARET_KEYFRAMES}</style>
        {portal.style === "commonapp" ? (
          <CommonAppReplica {...props} />
        ) : portal.style === "direct" ? (
          <DirectReplica {...props} />
        ) : (
          <IntlReplica {...props} />
        )}
      </div>
    );
  },
);

/* ── shared read-only control ───────────────────────────────────────────── */

function ReplicaControl({
  fs,
  inputStyle,
  focusColor,
  textareaMinHeight = 100,
}: {
  fs: FieldState;
  inputStyle: React.CSSProperties;
  focusColor: string;
  textareaMinHeight?: number;
}) {
  const { step, shown, isFilling } = fs;
  const base: React.CSSProperties = {
    ...inputStyle,
    ...(isFilling
      ? { borderColor: focusColor, boxShadow: `0 0 0 3px ${focusColor}30` }
      : null),
  };

  if (step.kind === "textarea") {
    return (
      <div
        style={{
          ...base,
          minHeight: textareaMinHeight,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {shown}
        {isFilling ? <Caret color={focusColor} /> : null}
      </div>
    );
  }

  if (step.kind === "select") {
    return (
      <div
        style={{
          ...base,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          color: shown ? undefined : "#9aa4ad",
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shown || "— select —"}
          {isFilling ? <Caret color={focusColor} /> : null}
        </span>
        <span aria-hidden style={{ opacity: 0.5, flex: "0 0 auto" }}>▾</span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...base,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {shown}
      {isFilling ? <Caret color={focusColor} /> : null}
    </div>
  );
}

function Caret({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 1.5,
        height: "1em",
        marginLeft: 1,
        verticalAlign: "text-bottom",
        background: color,
        animation: "qcDemoCaret 1s ease-in-out infinite",
      }}
    />
  );
}

/* ── commonapp: institutional navy SaaS ─────────────────────────────────── */

function CommonAppReplica(props: PortalReplicaProps) {
  const { portal } = props;
  const { identity, rest } = splitSections(portal.steps);
  const focusColor = "#1f4e79";

  const sectionState = (steps: PortalReplicaStep[]) => {
    const total = steps.length;
    const filled = steps.filter((s) => props.filledFieldKeys.has(s.fieldKey)).length;
    return { total, filled, done: total > 0 && filled === total, active: filled > 0 && filled < total };
  };
  const profileState = sectionState(identity);
  const appState = sectionState(rest);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid #d0d7de",
    borderRadius: 6,
    background: "#fff",
    font: "inherit",
    fontSize: 14,
    color: "#1b232c",
    minHeight: 38,
  };

  const railItem = (label: string, st: { done: boolean; active: boolean }) => (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 8px",
        borderRadius: 6,
        fontSize: 13.5,
        color: st.active ? "#1f4e79" : "#24292f",
        fontWeight: st.active ? 600 : 400,
        background: st.active ? "#eaf2fb" : "transparent",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          flex: "0 0 auto",
          position: "relative",
          border: st.done ? "2px solid #1a7f37" : "2px solid #c3ccd6",
          background: st.done ? "#1a7f37" : "transparent",
          transition: "0.2s",
        }}
      >
        {st.done ? (
          <span
            style={{
              position: "absolute",
              left: 4,
              top: 1,
              width: 5,
              height: 9,
              border: "solid #fff",
              borderWidth: "0 2px 2px 0",
              transform: "rotate(45deg)",
            }}
          />
        ) : null}
      </span>
      <span>{label}</span>
    </li>
  );

  const field = (step: PortalReplicaStep, wide = false) => {
    const fs = fieldStateFor(step, props);
    return (
      <div
        key={step.stepId}
        data-field-key={step.fieldKey}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          minWidth: 0,
          gridColumn: wide ? "1 / -1" : undefined,
        }}
      >
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "#3a4551" }}>
          {step.label}
        </label>
        <ReplicaControl fs={fs} inputStyle={inputStyle} focusColor={focusColor} />
      </div>
    );
  };

  return (
    <div
      style={{
        font: '15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
        background: "#f4f6f8",
        color: "#1b232c",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #d0d7de",
      }}
    >
      <div
        style={{
          background: "#1f4e79",
          color: "#fff",
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.2 }}>
          Common Application for Undergraduate Admission
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#cdd9e6" }} className="hidden sm:inline">
          Dashboard · My Colleges · Sign out
        </span>
      </div>
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #d0d7de",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ color: "#57606a", fontSize: 13 }}>My Colleges ›</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{portal.university}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[220px_1fr] sm:p-5">
        <aside
          style={{
            background: "#fff",
            border: "1px solid #d0d7de",
            borderRadius: 8,
            padding: 10,
            alignSelf: "start",
          }}
        >
          <h2
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: "#57606a",
              margin: "6px 8px 10px",
            }}
          >
            Application
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {railItem("Profile", profileState)}
            {railItem(`${portal.university} Questions`, appState)}
          </ul>
        </aside>
        <main
          style={{
            background: "#fff",
            border: "1px solid #d0d7de",
            borderRadius: 8,
            padding: "22px 20px",
            minWidth: 0,
          }}
        >
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, margin: "0 0 4px", color: "#1f4e79" }}>Profile</h3>
            <p style={{ margin: "0 0 16px", color: "#57606a", fontSize: 13 }}>
              Your details carry across every college on your list.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {identity.map((s) => field(s))}
            </div>
          </section>
          {rest.length > 0 && (
            <section>
              <h3 style={{ fontSize: 15, margin: "0 0 4px", color: "#1f4e79" }}>
                {portal.university} Questions
              </h3>
              <p style={{ margin: "0 0 16px", color: "#57606a", fontSize: 13 }}>
                Specific to this college&apos;s application.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {rest.map((s) => field(s, s.kind === "textarea"))}
              </div>
            </section>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 18,
              paddingTop: 18,
              borderTop: "1px solid #eaedf0",
            }}
          >
            <span style={{ ...btn("#1f4e79", true) }}>Save</span>
            <span style={{ ...btn("#1f4e79", false) }}>Continue</span>
          </div>
        </main>
      </div>
    </div>
  );
}

function btn(color: string, ghost: boolean): React.CSSProperties {
  return {
    border: `1px solid ${color}`,
    background: ghost ? "#fff" : color,
    color: ghost ? color : "#fff",
    borderRadius: 6,
    padding: "9px 18px",
    fontSize: 13,
    fontWeight: 600,
  };
}

/* ── direct: charmingly dated cream serif portal ────────────────────────── */

function DirectReplica(props: PortalReplicaProps) {
  const { portal } = props;
  const accent = safeAccent(portal.accent);
  const { identity, rest } = splitSections(portal.steps);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 9px",
    border: "1px solid #c9bfad",
    borderRadius: 3,
    background: "#fff",
    font: "15px/1.4 Georgia, serif",
    color: "#2c2620",
    minHeight: 34,
  };

  const rows = (steps: PortalReplicaStep[]) =>
    steps.map((step) => {
      const fs = fieldStateFor(step, props);
      return (
        <div
          key={step.stepId}
          data-field-key={step.fieldKey}
          className="grid grid-cols-1 gap-1.5 py-2 sm:grid-cols-[38%_1fr] sm:items-start sm:gap-3"
          style={{ borderBottom: "1px solid #efe7d7" }}
        >
          <label style={{ color: "#4a4236", fontSize: 14, fontWeight: "bold", paddingTop: 6 }}>
            {step.label}
          </label>
          <div style={{ minWidth: 0 }}>
            <ReplicaControl fs={fs} inputStyle={inputStyle} focusColor={accent} />
          </div>
        </div>
      );
    });

  const fieldset = (legend: string, steps: PortalReplicaStep[]) => (
    <fieldset
      style={{
        border: "1px solid #ddd3c1",
        borderRadius: 4,
        background: "#fffdf9",
        margin: "0 0 22px",
        padding: "6px 18px 14px",
        minWidth: 0,
      }}
    >
      <legend
        style={{
          fontSize: 15,
          fontWeight: "bold",
          color: accent,
          padding: "0 8px",
          fontVariant: "small-caps",
          letterSpacing: 0.6,
        }}
      >
        {legend}
      </legend>
      {rows(steps)}
    </fieldset>
  );

  return (
    <div
      style={{
        font: '15px/1.6 Georgia,"Times New Roman",Times,serif',
        background: "#faf7f2",
        color: "#2c2620",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e4ddcf",
      }}
    >
      <div style={{ height: 6, background: accent }} />
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e4ddcf",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <svg width={40} height={46} viewBox="0 0 46 52" aria-hidden style={{ flex: "0 0 auto" }}>
          <path
            d="M2 2 H44 V30 Q44 46 23 50 Q2 46 2 30 Z"
            fill="#fffdf9"
            stroke={accent}
            strokeWidth={2.5}
          />
          <path d="M23 6 L23 46" stroke={accent} strokeWidth={1.5} opacity={0.5} />
          <path d="M6 26 L40 26" stroke={accent} strokeWidth={1.5} opacity={0.5} />
          <circle cx={23} cy={18} r={6} fill="none" stroke={accent} strokeWidth={2} />
        </svg>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: accent, letterSpacing: 0.3 }}>
            {portal.university}
          </h1>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "#6b6152",
              fontVariant: "small-caps",
              letterSpacing: 1,
            }}
          >
            Office of Undergraduate Admissions
          </p>
        </div>
      </header>
      <nav style={{ background: accent, padding: "0 20px" }}>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {["Home", "Application", "Financial Aid", "Status", "Contact"].map((l, i) => (
            <li
              key={l}
              style={{
                color: "#fff",
                fontSize: 13,
                padding: "10px 12px",
                fontFamily: '-apple-system,"Segoe UI",Arial,sans-serif',
                background: i === 1 ? "rgba(255,255,255,.16)" : "transparent",
              }}
            >
              {l}
            </li>
          ))}
        </ul>
      </nav>
      <div style={{ padding: "22px 20px 28px", minWidth: 0 }} className="max-w-[760px]">
        <p
          style={{
            fontSize: 14,
            color: "#5c5346",
            background: "#fffdf9",
            border: "1px solid #ece3d2",
            borderLeft: `3px solid ${accent}`,
            padding: "12px 16px",
            marginBottom: 22,
          }}
        >
          Please review your application below. Fields with your saved information have been carried
          over; complete any remaining items, then save your progress.
        </p>
        {fieldset("Applicant Information", identity)}
        {rest.length > 0 && fieldset("Application Details", rest)}
        <div style={{ marginTop: 4 }}>
          <span
            style={{
              background: "#e9e2d3",
              border: "1px solid #cabfa8",
              color: "#4a4236",
              borderRadius: 3,
              padding: "9px 20px",
              fontSize: 14,
              fontFamily: '-apple-system,"Segoe UI",Arial,sans-serif',
              fontWeight: 600,
            }}
          >
            Save &amp; Continue
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── intl: dense utilitarian blue-gray portal ───────────────────────────── */

function IntlReplica(props: PortalReplicaProps) {
  const { portal } = props;
  const { identity, rest } = splitSections(portal.steps);
  const focusColor = "#2b4560";
  const ref =
    "UA-" +
    String(
      (Math.abs(
        [...(portal.university + portal.key)].reduce(
          (h, c) => (h * 31 + c.charCodeAt(0)) | 0,
          7,
        ),
      ) %
        9000000) +
        1000000,
    );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "5px 8px",
    border: "1px solid #b9c3ce",
    borderRadius: 2,
    background: "#fdfefe",
    font: "13px Arial, sans-serif",
    color: "#26313d",
    minHeight: 28,
  };

  const rows = (steps: PortalReplicaStep[]) =>
    steps.map((step, idx) => {
      const fs = fieldStateFor(step, props);
      return (
        <div
          key={step.stepId}
          data-field-key={step.fieldKey}
          className="grid grid-cols-[26px_1fr] items-center gap-2 py-1.5 sm:grid-cols-[26px_180px_1fr] sm:gap-2.5"
          style={{ borderBottom: "1px solid #f0f3f6" }}
        >
          <div style={{ font: "11px monospace", color: "#9aa7b4", textAlign: "right" }}>
            {String(idx + 1).padStart(2, "0")}
          </div>
          <label style={{ fontSize: 12, color: "#3d4a57" }} className="sm:col-auto">
            {step.label}
          </label>
          <div style={{ minWidth: 0 }} className="col-span-2 sm:col-span-1">
            <ReplicaControl fs={fs} inputStyle={inputStyle} focusColor={focusColor} textareaMinHeight={80} />
          </div>
        </div>
      );
    });

  const section = (n: number, title: string, steps: PortalReplicaStep[]) => (
    <section style={{ borderBottom: "1px solid #e2e7ec", padding: "14px 16px 16px" }}>
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          color: "#2b4560",
          margin: "0 0 12px",
          paddingBottom: 6,
          borderBottom: "2px solid #2b4560",
          display: "inline-block",
        }}
      >
        <span style={{ color: "#7d8b9c" }}>{n}.</span> {title}
      </h2>
      <div>{rows(steps)}</div>
    </section>
  );

  return (
    <div
      style={{
        font: '13px/1.45 Arial,"Helvetica Neue",Helvetica,sans-serif',
        background: "#eef1f4",
        color: "#26313d",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #ccd4dd",
      }}
    >
      <header
        style={{
          background: "#2b4560",
          color: "#fff",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Undergraduate Admissions Service
          </div>
          <div style={{ fontSize: 11, color: "#b7c4d4", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {portal.university}
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            font: '12px/1 "SFMono-Regular",Consolas,Menlo,monospace',
            color: "#cdd8e4",
            textAlign: "right",
          }}
        >
          Reference
          <b style={{ display: "block", color: "#fff", fontSize: 13, letterSpacing: 0.5, marginTop: 2 }}>
            {ref}
          </b>
        </div>
      </header>
      <div
        style={{
          background: "#dfe5ec",
          borderBottom: "1px solid #c4cdd7",
          padding: "6px 16px",
          fontSize: 11,
          color: "#54626f",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        Application Form — Section A of C · Autosaved
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[190px_1fr]">
        <aside style={{ fontSize: 12 }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, border: "1px solid #ccd4dd", background: "#fff" }}>
            {["Personal Details", "Programme Choice", "Qualifications", "Documents", "Declaration"].map(
              (l, i) => (
                <li
                  key={l}
                  style={{
                    padding: "8px 12px",
                    borderBottom: i < 4 ? "1px solid #e5e9ee" : "none",
                    color: i === 0 ? "#fff" : "#3a4855",
                    background: i === 0 ? "#2b4560" : "transparent",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    fontSize: 11,
                  }}
                >
                  {l}
                </li>
              ),
            )}
          </ul>
        </aside>
        <div style={{ background: "#fff", border: "1px solid #ccd4dd", minWidth: 0 }}>
          {section(1, "Personal Details", identity)}
          {rest.length > 0 && section(2, "Programme & Qualifications", rest)}
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              background: "#f6f8fa",
            }}
          >
            <span style={{ ...intlBtn(false) }}>Save Draft</span>
            <span style={{ ...intlBtn(true) }}>Next Section</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function intlBtn(primary: boolean): React.CSSProperties {
  return {
    border: "1px solid #2b4560",
    borderRadius: 2,
    padding: "7px 16px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: primary ? "#2b4560" : "#fff",
    color: primary ? "#fff" : "#2b4560",
  };
}
