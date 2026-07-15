// Deterministic per-user color used by on-call timelines and segments, so the
// same person always shows in the same color. Palette uses GitHub-ish hues that
// read well against white text in both light and dark mode.
const PALETTE: { bg: string; fg: string }[] = [
  { bg: "#0969da", fg: "#ffffff" }, // blue
  { bg: "#1a7f37", fg: "#ffffff" }, // green
  { bg: "#8250df", fg: "#ffffff" }, // purple
  { bg: "#bf3989", fg: "#ffffff" }, // pink
  { bg: "#9a6700", fg: "#ffffff" }, // ochre
  { bg: "#cf222e", fg: "#ffffff" }, // red
  { bg: "#bc4c00", fg: "#ffffff" }, // orange
  { bg: "#137e6d", fg: "#ffffff" }, // teal
];

export function userColor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
