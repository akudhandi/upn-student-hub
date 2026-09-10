// Compatibility re-export: the app sidebar links to `/lost-found`
// (matching SYSTEM_ANALYSIS.md), while the canonical page lives at
// `/lost-and-found`. Keep both routes rendering the same UI.
export { default } from "../lost-and-found/page";
