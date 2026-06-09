"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/I18nProvider";

type EnrichField<T> = (T & {
  evidence: string | null;
  sourceUrl: string | null;
}) | null;

type EnrichResult = {
  found: boolean;
  cached: boolean;
  fees: EnrichField<{
    amount: number | null;
    currency: string | null;
    basis: string | null;
    locale: string | null;
  }>;
  english: EnrichField<{
    ieltsOverall: number | null;
    ieltsMinComponent: number | null;
    toeflIbt: number | null;
  }>;
  entry: EnrichField<{
    ibPointsMin: number | null;
    aLevel: string | null;
    ucasTariffMin: number | null;
    gpaNote: string | null;
  }>;
  deadlines: Array<{
    intake: string | null;
    dateText: string;
    isoDate?: string;
    evidence: string;
    sourceUrl: string;
    category?: "admission" | "other";
  }>;
  insights?: Array<{
    category: "academic" | "campus" | "requirements";
    text: string;
    sourceUrl: string;
  }>;
  website?: string;
};

export function EnrichmentDetails({
  schoolId,
  externalId,
  website,
}: {
  schoolId?: string;
  externalId: string;
  website?: string;
}) {
  const { t } = useI18n();
  const enrichOnOpen = useAction(api.enrich.onOpen.enrichOnOpen);
  const [data, setData] = useState<EnrichResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const args = schoolId ? { id: schoolId } : { externalId };
        const res = (await enrichOnOpen(args)) as EnrichResult;
        setData(res);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, [enrichOnOpen, schoolId, externalId]);

  const siteHref = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : undefined;

  if (status === "loading") {
    return (
      <div className="mt-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/60 p-4 text-body-sm text-on-surface-variant">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-primary/60 align-middle" />
        <span className="ml-2">{t("enrich.loading")}</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="mt-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/60 p-4 text-body-sm text-on-surface-variant">
        {t("enrich.error")}
        {siteHref && (
          <>
            {" "}
            <a
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {t("enrich.checkSite")}
            </a>
          </>
        )}
      </div>
    );
  }
  if (!data) return null;

  const fallback = (
    <span className="text-on-surface-variant">
      {t("enrich.notListed")}
      {siteHref && (
        <>
          {" — "}
          <a
            href={siteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {t("enrich.checkSite")}
          </a>
        </>
      )}
    </span>
  );

  if (!data.found && data.deadlines.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/60 p-4 text-body-sm">
        {fallback}
      </div>
    );
  }

  const feeText = data.fees?.amount != null
    ? `${data.fees.currency ?? ""} ${data.fees.amount.toLocaleString()}${data.fees.basis ? ` · ${data.fees.basis}` : ""}${data.fees.locale ? ` · ${data.fees.locale}` : ""}`.trim()
    : null;

  const englishParts: string[] = [];
  if (data.english?.ieltsOverall != null)
    englishParts.push(
      `IELTS ${data.english.ieltsOverall}${data.english.ieltsMinComponent != null ? ` (min ${data.english.ieltsMinComponent})` : ""}`,
    );
  if (data.english?.toeflIbt != null) englishParts.push(`TOEFL iBT ${data.english.toeflIbt}`);
  const englishText = englishParts.length ? englishParts.join(" · ") : null;

  const entryParts: string[] = [];
  if (data.entry?.ibPointsMin != null) entryParts.push(`IB ${data.entry.ibPointsMin}`);
  if (data.entry?.aLevel) entryParts.push(`A-Level ${data.entry.aLevel}`);
  if (data.entry?.ucasTariffMin != null) entryParts.push(`UCAS ${data.entry.ucasTariffMin}`);
  if (data.entry?.gpaNote) entryParts.push(data.entry.gpaNote);
  const entryText = entryParts.length ? entryParts.join(" · ") : null;

  return (
    <div className="mt-5 space-y-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest/60 p-4">
      <Row
        label={t("enrich.fees")}
        value={feeText}
        evidence={data.fees?.evidence}
        sourceUrl={data.fees?.sourceUrl}
        fallback={fallback}
      />
      <Row
        label={t("enrich.english")}
        value={englishText}
        evidence={data.english?.evidence}
        sourceUrl={data.english?.sourceUrl}
        fallback={fallback}
      />
      <Row
        label={t("enrich.entry")}
        value={entryText}
        evidence={data.entry?.evidence}
        sourceUrl={data.entry?.sourceUrl}
        fallback={fallback}
      />
      <div>
        <div className="text-label-sm text-on-surface-variant">{t("enrich.deadlines")}</div>
        {data.deadlines.length === 0 ? (
          <div className="mt-1 text-body-sm">{fallback}</div>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {data.deadlines.map((d, i) => (
              <li key={i} className="text-body-sm text-on-surface">
                <span className="font-medium">{d.dateText}</span>
                {d.intake && (
                  <span className="text-on-surface-variant"> — {d.intake}</span>
                )}{" "}
                <a
                  href={d.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={d.evidence}
                  className="text-label-sm text-primary underline underline-offset-2"
                >
                  {t("enrich.source")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.insights && data.insights.length > 0 && (
        <div>
          <div className="text-label-sm text-on-surface-variant">More from the official site</div>
          <ul className="mt-1 space-y-1.5">
            {data.insights.map((it, i) => (
              <li key={i} className="text-body-sm text-on-surface">
                <span className="mr-1.5 inline-flex items-center rounded-full bg-secondary-container/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
                  {it.category}
                </span>
                {it.text}{" "}
                <a
                  href={it.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-sm text-primary underline underline-offset-2"
                >
                  {t("enrich.source")}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  evidence,
  sourceUrl,
  fallback,
}: {
  label: string;
  value: string | null;
  evidence: string | null | undefined;
  sourceUrl: string | null | undefined;
  fallback: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="text-label-sm text-on-surface-variant">{label}</div>
      <div className="mt-0.5 text-body-sm text-on-surface">
        {value ? (
          <>
            <span title={evidence ?? undefined}>{value}</span>
            {sourceUrl && (
              <>
                {" "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-sm text-primary underline underline-offset-2"
                >
                  {t("enrich.source")}
                </a>
              </>
            )}
          </>
        ) : (
          fallback
        )}
      </div>
    </div>
  );
}
