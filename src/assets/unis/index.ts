const COLORS: Record<string, string> = {
  Harvard: "#b3272c",
  Stanford: "#8c1515",
  MIT: "#2e4a7a",
  Oxford: "#002147",
  Cambridge: "#a3c1ad",
  Yale: "#0f4d92",
  Princeton: "#e77500",
  NYU: "#57068c",
  Columbia: "#9bcbeb",
  Imperial: "#003e74",
  "UC Berkeley": "#003262",
  "ETH Zurich": "#1f407a",
  McGill: "#ed1b2f",
  Edinburgh: "#041e42",
  Trinity: "#0c2340",
  NUS: "#003d7c",
  Tokyo: "#22409a",
  "Sciences Po": "#cc0033",
};

function initials(name: string): string {
  if (name === "UC Berkeley") return "UC";
  if (name === "ETH Zurich") return "ETH";
  if (name === "Sciences Po") return "SP";
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function logoUrl(name: string): string {
  const bg = COLORS[name] ?? "#2e4a7a";
  const fg = bg === "#a3c1ad" || bg === "#9bcbeb" ? "#14213d" : "#ffffff";
  const mark = initials(name);
  const fontSize = mark.length > 2 ? 34 : 44;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${name}"><rect width="160" height="160" rx="34" fill="${bg}"/><circle cx="80" cy="80" r="56" fill="none" stroke="${fg}" stroke-width="8" opacity=".35"/><text x="80" y="84" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="${fg}">${mark}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const UNI_LOGOS: Record<string, string> = {
  Harvard: logoUrl("Harvard"),
  Stanford: logoUrl("Stanford"),
  MIT: logoUrl("MIT"),
  Oxford: logoUrl("Oxford"),
  Cambridge: logoUrl("Cambridge"),
  Yale: logoUrl("Yale"),
  Princeton: logoUrl("Princeton"),
  NYU: logoUrl("NYU"),
  Columbia: logoUrl("Columbia"),
  Imperial: logoUrl("Imperial"),
  "UC Berkeley": logoUrl("UC Berkeley"),
  "ETH Zurich": logoUrl("ETH Zurich"),
  McGill: logoUrl("McGill"),
  Edinburgh: logoUrl("Edinburgh"),
  Trinity: logoUrl("Trinity"),
  NUS: logoUrl("NUS"),
  Tokyo: logoUrl("Tokyo"),
  "Sciences Po": logoUrl("Sciences Po"),
};
