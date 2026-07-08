const DEFAULT_ASSET_ORIGIN = "https://questcampus.space";

type LovableAsset = {
  url: string;
};

export function assetUrl(asset: LovableAsset | string): string {
  const raw = typeof asset === "string" ? asset : asset.url;
  if (!raw || /^(?:https?:|data:|blob:)/.test(raw)) return raw;

  if (raw.startsWith("/__l5e/")) {
    const configured = import.meta.env.VITE_ASSET_ORIGIN as string | undefined;
    const origin = (configured || DEFAULT_ASSET_ORIGIN).replace(/\/+$/, "");
    return `${origin}${raw}`;
  }

  return raw;
}
