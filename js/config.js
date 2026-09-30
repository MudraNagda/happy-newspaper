// ---- Site configuration -------------------------------------------------
// Everything editorial comes from the Google Sheet; this is the fixed part.
window.PAPER_CONFIG = {
  // Google Sheet URL (Share → Anyone with the link → Viewer). Leave "" to use the sample issue.
  // Example: "https://docs.google.com/spreadsheets/d/1AbC.../edit#gid=0"
  sheetUrl: "",

  // Optional: sheet tab name (gid or name). Leave "" for the first tab.
  sheetTab: "",

  masthead: "The Happy Newspaper",
  price: "free · every week",
  earLeft: "Good news only",
  earRight: "Weather: see p.3",

  // Cache sheet responses for this long (ms). Falls back to the last good issue on error.
  cacheMs: 10 * 60 * 1000,

  // Apply the newsprint effect (grayscale + contrast + sepia + halftone) to feed images.
  newsprintImages: true,

  // Fold choreography (seconds) — see ANIMATION-SPEC.md. openSpeed drives every timing; tiltAmount is degrees.
  openSpeed: 0.95,
  tiltAmount: 12,

  // Object shown when a week has no "Object URL". Set to null for nothing to fall out.
  defaultObject: null, // e.g. { url: "2026-09-01.glb", caption: "the usual mug", scale: 1 }

  // Origami gallery (optional). Run createOrigamiGalleryForm in setup/create-form.gs and paste the two URLs it logs.
  // Left empty, the gallery shows sample pieces plus the visitor's own (saved in their browser only).
  galleryPrefillUrl: "",
  gallerySheetUrl: "",

  // Base directory for relative object URLs written in the sheet (e.g. "2026-09-01.glb").
  objectsDir: "objects/",
};
