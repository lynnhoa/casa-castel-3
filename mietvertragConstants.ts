/**
 * ─────────────────────────────────────────────────────────────
 *  CASA CASTEL — MIETVERTRAG PDF LAYOUT CONSTANTS
 *  src/constants/mietvertragConstants.ts
 *
 *  Layout only. No content, no strings, no data.
 *  Connect to a PDF generator when the "Save PDF" button
 *  is implemented. Content will live in a separate template.
 * ─────────────────────────────────────────────────────────────
 */


// ── PAGE GEOMETRY (A4 at 72dpi, values in points) ─────────────
export const PAGE = {
  WIDTH:         595.28,
  HEIGHT:        841.89,
  MARGIN_LEFT:    51.02,  // 18mm
  MARGIN_RIGHT:   51.02,  // 18mm
  MARGIN_TOP:     39.69,  // 14mm
  MARGIN_BOTTOM:  39.69,  // 14mm
  get TEXT_WIDTH() {
    return this.WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; // 493.24 pt
  },
} as const;


// ── SAFE ZONE & PAGE BREAK GUARD ──────────────────────────────
// Before rendering any block, check: if currentY < SAFE_ZONE.BODY_MIN_Y → new page.
// Page break rules:
//   - Never break inside a clause (title + body stay together)
//   - Never leave an orphan heading at the bottom (always carry at least one line with it)
//   - Signature block always stays on same page as last clause
export const SAFE_ZONE = {
  HEADER_HEIGHT:   62.36,  // 22mm — gold header strip
  FOOTER_HEIGHT:   19.84,  // 7mm  — footer rule + text
  PADDING_TOP:    107.72,  // 38mm — y start position on every page (below header)
  PADDING_BOTTOM:  56.69,  // 20mm — breathing room above footer (increased)
  /** Lowest y a content block may START. Anything below → push to next page. */
  get BODY_MIN_Y() {
    return PAGE.MARGIN_BOTTOM + this.FOOTER_HEIGHT + this.PADDING_BOTTOM;
  },
} as const;


// ── HEADER ────────────────────────────────────────────────────
export const HEADER = {
  HEIGHT:          62.36,  // 22mm
  WORDMARK_X:      51.02,  // = PAGE.MARGIN_LEFT
  WORDMARK_Y:      36.85,  // from top of page (H - 13mm)
  WORDMARK_SIZE:   18,
  ROOM_LABEL_Y:    25.51,  // "ZIMMER" label  (H - 9mm)
  ROOM_NAME_Y:     14.17,  // "Oslo" name     (H - 15mm)
  ROOM_LABEL_SIZE:  6.5,
  ROOM_NAME_SIZE:  11,
} as const;


// ── FOOTER ────────────────────────────────────────────────────
export const FOOTER = {
  RULE_Y_OFFSET:   19.84,  // above bottom margin (7mm)
  TEXT_Y_OFFSET:    9.92,  // above bottom margin (3.5mm)
} as const;


// ── COLOURS (RGB 0–1, matches casa-castel.css tokens) ─────────
export const COLOUR = {
  BG:          [0.980, 0.976, 0.969] as [number, number, number],  // #faf9f7
  BLACK:       [0.102, 0.102, 0.102] as [number, number, number],  // #1a1a1a
  GOLD:        [0.776, 0.659, 0.424] as [number, number, number],  // #c6a86c  header
  GOLD_RULE:   [0.910, 0.859, 0.773] as [number, number, number],  // #e8dbc5  rules/footer
  GOLD_FILL:   [0.941, 0.910, 0.847] as [number, number, number],  // #f0e8d8  soft gold total box
  TOTAL_TEXT:  [0.541, 0.396, 0.208] as [number, number, number],  // #8a6535  warm brown — readable on gold fill
  MUTED:       [0.533, 0.529, 0.502] as [number, number, number],  // #888780
  WHITE:       [1.000, 1.000, 1.000] as [number, number, number],
  WHITE_SOFT:  [1.000, 1.000, 0.878] as [number, number, number],  // label on gold
} as const;


// ── TYPOGRAPHY ────────────────────────────────────────────────
export const FONT = {
  SERIF:      'PlayfairDisplay',  // wordmark, doc title, room name
  SANS:       'Lato',             // body, labels, footer
  SANS_BOLD:  'LatoBold',         // section headers, clause titles, totals
} as const;

export const FONT_SIZE = {
  WORDMARK:       18,
  ROOM_LABEL:      6.5,
  ROOM_NAME:      11,
  DOC_TITLE:      22,
  DOC_SUBTITLE:    8.5,
  SECTION_LABEL:   7,
  KV:              8.5,
  CLAUSE_TITLE:    8.5,
  BODY:            8.5,
  TOTAL:           9,
  SIG_LABEL:       8,
  SIG_NAME:        7.5,
  FOOTER:          7,
} as const;


// ── SPACING (points) ──────────────────────────────────────────
export const SPACING = {
  // Vertical rhythm
  SECTION_GAP:       9.00,   // space before a regular section title
  SECTION_GAP_LG:   26.00,   // space before a large section title (Zahlungsplan, Nutzungsrechte)
  SECTION_LABEL_SIZE:    7,  // regular section header font size (pt)
  SECTION_LABEL_SIZE_LG: 9,  // large section header font size — 2px bigger
  SECTION_HEADING_MB:    3,  // margin-bottom regular section heading
  SECTION_HEADING_MB_LG: 6,  // margin-bottom large section heading (more breathing room)
  KV_ROW_HEIGHT:     5.50,   // vertical step per key-value row (more breathing)
  KV_LABEL_WIDTH:  110.00,   // wide enough for longest label without any wrapping
  KV_VALUE_OFFSET: 114.00,   // value column starts here — guaranteed no overlap
  KV_GROUP_GAP:      8.00,   // gap between kv groups (e.g. before bank details)
  CLAUSE_PRE_GAP:    8.00,   // space before § heading (increased)
  CLAUSE_TITLE_GAP:  3.00,   // space between § title and body text
  BODY_LEAD:         6.00,   // gap after a body_text block (increased)
  DOC_SUBTITLE_MB:   28.00,  // gap between subtitle and Vermieter section
  SECTION_FIRST_GAP: 14.00,  // margin-top for very first section after title block
  USAGE_HEADING_MB:   6.00,  // gap between Nutzungsrechte heading and its body text
  USAGE_TEXT_GAP:    16.00,  // gap between Nutzungsrechte body and first clause
  CLAUSE_FIRST_PRE:  16.00,  // margin-top for § 1 specifically

  // Total box
  TOTAL_BOX_HEIGHT:  9.00,
  TOTAL_BOX_RADIUS:  2.00,
  TOTAL_BOX_PAD_X:   6.00,
  TOTAL_BOX_MT:     10.00,   // margin-top above total box
  TOTAL_BOX_GAP:    28.00,   // space below total box — pushes Zahlungsplan down

  // Signature block
  SIG_BLOCK_PRE:    48.00,   // space above Datum/Ort line
  SIG_LINE_WIDTH:  220.00,   // signature / date line width
  SIG_COL_OFFSET:    8.00,   // gap between the two columns
  SIG_DATE_TO_SIG:  44.00,   // generous space for writing/signing
  SIG_LABEL_GAP:     5.00,   // gap: sig line → "Vermieter" label
  SIG_NAME_GAP:      4.00,   // gap: label → printed name

  // Conditional rows (partial months)
  PARTIAL_MONTH_ROW_HEIGHT: 5.50,  // same as KV_ROW_HEIGHT — shown only when partial month applies
  CONDITIONAL_BLOCK_GAP:    0.00,  // no extra gap when conditional row is hidden

  // Rules
  FOOTER_PAGE_FORMAT: 'number_only',  // just "1", "2" — no "Seite X von Y"
  NOTE_MT:            10.00,          // margin-top above fine print / payment note text

  RULE_DEFAULT:      0.50,
  RULE_HEAVY:        0.80,

  // Line height
  BODY_LINE_HEIGHT:  1.55,   // multiplier × FONT_SIZE.BODY
} as const;


// ── LINE HEIGHT ────────────────────────────────────────────────
export const LINE_HEIGHT = {
  BODY:   FONT_SIZE.BODY * SPACING.BODY_LINE_HEIGHT,   // ~13.2 pt
  CLAUSE: FONT_SIZE.BODY * SPACING.BODY_LINE_HEIGHT,
} as const;
