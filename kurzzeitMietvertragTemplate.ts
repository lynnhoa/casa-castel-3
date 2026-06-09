/**
 * ─────────────────────────────────────────────────────────────
 *  CASA CASTEL — KURZZEIT MIETVERTRAG TEMPLATE
 *  src/templates/kurzzeitMietvertragTemplate.ts
 *
 *  Defines document structure, fixed text, placeholder fields,
 *  and pre-filled defaults for short-term room rental.
 *
 *  No layout values here — those live in mietvertragConstants.ts
 *  No Supabase data here — that flows in via MietvertragData type
 * ─────────────────────────────────────────────────────────────
 */


// ── DATA TYPES ────────────────────────────────────────────────
// Shape of data coming from Supabase / app inputs

export type MietvertragData = {
  // Mieter (app input, required)
  mieterName:         string
  mieterAdresse:      string
  mieterGeburtsdatum: string   // TT.MM.JJJJ

  // Mietobjekt (app input)
  zimmerName:         string   // from dropdown
  zimmerFlaeche:      number   // m²
  gemeinschaftsraeume: string  // e.g. "Küche, Bad, Garten"

  // Mietzeit (app input — logic derived from these two dates)
  mietbeginn:         string   // ISO date
  mietende:           string   // ISO date

  // Computed by app from mietbeginn/mietende
  ersterMonatAnteilig:  boolean
  letzterMonatAnteilig: boolean
  ersterMonatTage:      number | null
  ersterMonatTagespreis: number | null
  ersterMonatBetrag:    number | null
  letzterMonatTage:     number | null
  letzterMonatTagespreis: number | null
  letzterMonatBetrag:   number | null
  monatlMiete:          number
  gesamtmiete:          number
  weitereZahlungen:     boolean  // true if > 2 full months

  // Zahlungsplan (computed by app)
  zahlung1Betrag:       number
  zahlung1Beschreibung: string   // e.g. "Anteil Juni + Juli" or "Juli"
  zahlung1Faellig:      string   // TT.MM.JJJJ
  weitereZahlungenBetrag: number | null
  letzteZahlungBetrag:  number
  letzteZahlungBeschreibung: string
  letzteZahlungFaellig: string   // TT.MM.JJJJ

  // Kaution (app input)
  kaution:              number

  // Schlüssel (app input, defaults pre-filled)
  hausstuerschluessel:  number   // default: 1
  zimmerschluessel:     number   // default: 1

  // Inventar (per-room config, editable in app)
  inventar: Array<{
    gegenstand: string
    anzahl:     number
  }>

  // Signing date (filled when contract is signed)
  unterzeichnungsDatum?: string  // TT.MM.JJJJ — optional until signed
}


// ── PRE-FILLED DEFAULTS ───────────────────────────────────────
// Values pre-loaded in app, editable before generating PDF

export const DEFAULTS = {
  // Vermieter — always fixed, editable in app settings
  vermieterName:    'Tony Hoa Truong und My Linh Hoa',
  vermieterAdresse: 'Rheinallee 52a, 55118 Mainz',
  vermieterSig:     'Tony Hoa Truong / My Linh Hoa',

  // Objekt
  objektAdresse:    'Alsenstr. 60, 55252 Mainz-Kastel',
  objektPLZOrt:     '55252 Mainz-Kastel',

  // Bank — editable in app
  kontoinhaber:     'Tony Hoa Truong und My Linh Hoa',
  iban:             'DE71 1203 0000 1071 1022',
  bic:              'BYLADEM1001',

  // Schlüssel
  hausstuerschluessel: 1,
  zimmerschluessel:    1,

  // Gerichtsstand
  gerichtsstand:    'Wiesbaden',
  unterschriftOrt:  'Wiesbaden',

  // Footer
  footerAdresse:    'Alsenstr. 60 · 55252 Mainz-Kastel',
} as const


// ── DOCUMENT STRUCTURE ────────────────────────────────────────
// Three pages, each with ordered blocks.
// type: 'fixed' = always rendered, text never changes
// type: 'field' = filled from MietvertragData
// type: 'prefilled' = has default value, overridable
// type: 'conditional' = rendered only when condition is true

export type BlockType = 'fixed' | 'field' | 'prefilled' | 'conditional'

export interface Block {
  id:        string
  type:      BlockType
  condition?: (data: MietvertragData) => boolean  // for conditional blocks
}

export interface KVBlock extends Block {
  kind:    'kv'
  label:   string
  value:   string | ((data: MietvertragData) => string)
  size?:   'regular' | 'large'   // large = section header size
}

export interface TextBlock extends Block {
  kind:    'text'
  text:    string | ((data: MietvertragData) => string)
}

export interface SectionBlock extends Block {
  kind:    'section'
  title:   string
  size?:   'regular' | 'large'
}

export interface ClauseBlock extends Block {
  kind:    'clause'
  num:     string
  title:   string
  body:    string | ((data: MietvertragData) => string)
}

export interface TotalBoxBlock extends Block {
  kind:    'totalBox'
  label:   string
  value:   (data: MietvertragData) => string
}

export interface TableBlock extends Block {
  kind:    'table'
  headers: string[]
  rows:    (data: MietvertragData) => Array<string[]>
}

export interface SignatureBlock extends Block {
  kind:       'signature'
  leftRole:   string
  leftName:   string
  rightRole:  string
  rightName:  string | ((data: MietvertragData) => string)
  ort:        string
}

export interface CommentLinesBlock extends Block {
  kind:  'commentLines'
  label: string
  count: number
}

export type AnyBlock =
  | KVBlock | TextBlock | SectionBlock | ClauseBlock
  | TotalBoxBlock | TableBlock | SignatureBlock | CommentLinesBlock


// ── PAGE 1 ────────────────────────────────────────────────────

export const PAGE_1: AnyBlock[] = [

  // Doc title rendered by PDF generator from constants — not a block

  { id: 's-vermieter', kind: 'section', type: 'fixed', title: 'Vermieter' },
  { id: 'kv-v-name',  kind: 'kv', type: 'fixed', label: 'Name',    value: DEFAULTS.vermieterName },
  { id: 'kv-v-adr',   kind: 'kv', type: 'fixed', label: 'Adresse', value: DEFAULTS.vermieterAdresse },

  { id: 's-mieter',   kind: 'section', type: 'fixed', title: 'Mieter' },
  { id: 'kv-m-name',  kind: 'kv', type: 'field', label: 'Name',         value: d => d.mieterName },
  { id: 'kv-m-adr',   kind: 'kv', type: 'field', label: 'Adresse',      value: d => d.mieterAdresse },
  { id: 'kv-m-dob',   kind: 'kv', type: 'field', label: 'Geburtsdatum', value: d => d.mieterGeburtsdatum },

  { id: 's-objekt',   kind: 'section', type: 'fixed', title: 'Mietobjekt' },
  { id: 'kv-o-adr',   kind: 'kv', type: 'prefilled', label: 'Adresse',          value: DEFAULTS.objektAdresse },
  { id: 'kv-o-zim',   kind: 'kv', type: 'field',     label: 'Bezeichnung',       value: d => d.zimmerName },
  { id: 'kv-o-flae',  kind: 'kv', type: 'field',     label: 'Wohnfläche',        value: d => `ca. ${d.zimmerFlaeche} m²` },
  { id: 'kv-o-gem',   kind: 'kv', type: 'field',     label: 'Mitgenutzte Räume', value: d => d.gemeinschaftsraeume },
  { id: 'kv-o-moeb',  kind: 'kv', type: 'fixed',     label: 'Möblierung',        value: 'Möbliert · Inventar siehe Anlage A' },

  { id: 's-mietzeit', kind: 'section', type: 'fixed', title: 'Mietzeit & Mietzins' },
  { id: 'kv-z-von',   kind: 'kv', type: 'field', label: 'Mietbeginn', value: d => d.mietbeginn },
  { id: 'kv-z-bis',   kind: 'kv', type: 'field', label: 'Mietende',   value: d => d.mietende },

  {
    id: 'kv-z-erst', kind: 'kv', type: 'conditional',
    label: 'Anteil erster Monat',
    value: d => `€ ${d.ersterMonatBetrag?.toFixed(2)} (${d.ersterMonatTage} Tage × € ${d.ersterMonatTagespreis?.toFixed(2)}/Tag)`,
    condition: d => d.ersterMonatAnteilig,
  } as KVBlock,

  { id: 'kv-z-mon',   kind: 'kv', type: 'field', label: 'Monatliche Miete', value: d => `€ ${d.monatlMiete.toFixed(2)} (Vollmonat, pauschal inkl. NK)` },

  {
    id: 'kv-z-letzt', kind: 'kv', type: 'conditional',
    label: 'Anteil letzter Monat',
    value: d => `€ ${d.letzterMonatBetrag?.toFixed(2)} (${d.letzterMonatTage} Tage × € ${d.letzterMonatTagespreis?.toFixed(2)}/Tag)`,
    condition: d => d.letzterMonatAnteilig,
  } as KVBlock,

  {
    id: 'total', kind: 'totalBox', type: 'field',
    label: 'Gesamtmiete:',
    value: d => `€ ${d.gesamtmiete.toFixed(2)}`,
  },

  { id: 's-zahlung', kind: 'section', type: 'fixed', title: 'Zahlungsplan & Bankverbindung', size: 'large' },

  { id: 'kv-z1',  kind: 'kv', type: 'field', label: '1. Zahlung',
    value: d => `€ ${d.zahlung1Betrag.toFixed(2)} (${d.zahlung1Beschreibung}), fällig am ${d.zahlung1Faellig}` },

  {
    id: 'kv-zw', kind: 'kv', type: 'conditional',
    label: 'Weitere Zahlungen',
    value: d => `€ ${d.weitereZahlungenBetrag?.toFixed(2)} monatlich, jeweils fällig 3. Werktag`,
    condition: d => d.weitereZahlungen,
  } as KVBlock,

  { id: 'kv-zl',  kind: 'kv', type: 'field', label: 'Letzte Zahlung',
    value: d => `€ ${d.letzteZahlungBetrag.toFixed(2)} (${d.letzteZahlungBeschreibung}), fällig am ${d.letzteZahlungFaellig}` },

  { id: 'kv-kau', kind: 'kv', type: 'field',     label: 'Kaution',
    value: d => `€ ${d.kaution.toFixed(2)} (fällig 5 Tage nach Unterzeichnung)` },

  { id: 'kv-kto', kind: 'kv', type: 'prefilled', label: 'Kontoinhaber', value: DEFAULTS.kontoinhaber },
  { id: 'kv-iban',kind: 'kv', type: 'prefilled', label: 'IBAN',         value: DEFAULTS.iban },
  { id: 'kv-bic', kind: 'kv', type: 'prefilled', label: 'BIC',          value: DEFAULTS.bic },

  {
    id: 'note-zahlung', kind: 'text', type: 'field',
    text: d => `Alle Zahlungen per Überweisung. Verwendungszweck: Casa Castel – ${d.zimmerName} – Miete Monat Jahr / Kaution.`,
  },
]


// ── PAGE 2 ────────────────────────────────────────────────────

export const PAGE_2: AnyBlock[] = [

  { id: 's-nutzung', kind: 'section', type: 'fixed', title: 'Nutzungsrechte Gemeinschaftsbereiche', size: 'large' },
  {
    id: 'txt-nutzung', kind: 'text', type: 'field',
    text: d => `Ab Mietbeginn steht dem Mieter die Mitnutzung folgender Gemeinschaftsbereiche zu: ${d.gemeinschaftsraeume}. Die Nutzung erfolgt schonend und rücksichtsvoll. Eine Reinigungspflicht nach jeder Nutzung wird ausdrücklich vereinbart.`,
  },

  { id: 'cl-1', kind: 'clause', type: 'fixed', num: '1', title: 'Befristung und Beendigung',
    body: 'Das Mietverhältnis ist gemäß § 575 Abs. 1 Nr. 3 BGB auf ausdrücklichen Wunsch des Mieters befristet. Der Mieter hat erklärt, das Mietobjekt nur für den vereinbarten Zeitraum zu benötigen. Das Mietverhältnis endet automatisch ohne Kündigung. Eine stillschweigende Verlängerung nach § 545 BGB wird ausdrücklich ausgeschlossen. Ein Anspruch auf Verlängerung besteht nicht.' },

  { id: 'cl-2', kind: 'clause', type: 'field', num: '2', title: 'Mietzins & Anteilige Berechnung',
    body: d => `Die monatliche Pauschalmiete beträgt € ${d.monatlMiete.toFixed(2)}. Zieht der Mieter nicht zum ersten eines Monats ein oder zum letzten eines Monats aus, werden die Tage anteilig berechnet. Der Tagespreis ergibt sich aus der Monatsmiete geteilt durch die tatsächliche Anzahl der Kalendertage des jeweiligen Monats. Alle Nebenkosten (Strom, Wasser, Heizung, WLAN) sind in der Pauschale enthalten.` },

  { id: 'cl-3', kind: 'clause', type: 'fixed', num: '3', title: 'Fälligkeit der Mietzahlungen',
    body: 'Die Miete ist jeweils spätestens bis zum dritten Werktag des fälligen Monats zu überweisen (§ 556b BGB). Bei Zahlungsverzug ist der Vermieter berechtigt, Verzugszinsen gemäß § 288 BGB geltend zu machen.' },

  { id: 'cl-4', kind: 'clause', type: 'field', num: '4', title: 'Kaution',
    body: d => `Der Mieter zahlt eine Kaution von € ${d.kaution.toFixed(2)} spätestens 5 Tage nach Unterzeichnung. Vom Mieter selbstverschuldete Schäden werden zu 100 % von der Kaution abgezogen. Kleinreparaturen bis 100 € pro Schadensfall gehen zu Lasten des Mieters (§ 535 BGB). Schäden in Gemeinschaftsbereichen werden anteilig auf alle Bewohner aufgeteilt. Der verbleibende Betrag wird nach Prüfung des Zustands zurückerstattet.` },

  { id: 'cl-5', kind: 'clause', type: 'field', num: '5', title: 'Schlüsselübergabe',
    body: d => `Der Mieter erhält bei Einzug ${d.hausstuerschluessel} Haustürschlüssel und ${d.zimmerschluessel} Zimmerschlüssel. Alle Schlüssel sind bei Auszug an den Vermieter zurückzugeben. Bei Verlust trägt der Mieter die vollständigen Kosten für den Schlossaustausch.` },

  { id: 'cl-6', kind: 'clause', type: 'fixed', num: '6', title: 'Zustand & Übergabe',
    body: 'Das Zimmer wird möbliert und in vertragsgemäßem Zustand übergeben. Ein Übergabeprotokoll wird bei Ein- und Auszug erstellt und von beiden Parteien unterzeichnet. Das Zimmer ist in gleichem Zustand zurückzugeben.' },

  { id: 'cl-7', kind: 'clause', type: 'fixed', num: '7', title: 'Haftpflichtversicherung',
    body: 'Der Mieter ist verpflichtet, für die Dauer des Mietverhältnisses eine gültige private Haftpflichtversicherung zu unterhalten und dem Vermieter auf Verlangen nachzuweisen.' },

  { id: 'cl-8', kind: 'clause', type: 'fixed', num: '8', title: 'Hausordnung',
    body: 'Rauchen ist im gesamten Gebäude nicht gestattet. Haustiere sind nicht erlaubt. Untervermietung ist ohne schriftliche Zustimmung des Vermieters untersagt. Nachtruhe gilt von 22:00 bis 07:00 Uhr.' },

  { id: 'cl-9', kind: 'clause', type: 'fixed', num: '9', title: 'Datenschutz',
    body: 'Personenbezogene Daten werden ausschließlich zur Vertragsabwicklung gespeichert (Art. 6 Abs. 1 lit. b DSGVO) und nach Ablauf der gesetzlichen Aufbewahrungsfrist gelöscht.' },

  { id: 'cl-10', kind: 'clause', type: 'fixed', num: '10', title: 'Salvatorische Klausel & Gerichtsstand',
    body: `Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam. Es gilt deutsches Recht. Gerichtsstand ist ${DEFAULTS.gerichtsstand}.` },
]


// ── PAGE 3 ────────────────────────────────────────────────────

export const PAGE_3: AnyBlock[] = [

  { id: 's-inventar', kind: 'section', type: 'fixed', title: 'Anlage A — Inventar', size: 'large' },

  {
    id: 'tbl-inventar', kind: 'table', type: 'field',
    headers: ['Gegenstand', 'Anzahl'],
    rows: d => d.inventar.map(i => [i.gegenstand, String(i.anzahl)]),
  },

  {
    id: 'comment-lines', kind: 'commentLines', type: 'fixed',
    label: 'Sonstige Anmerkungen',
    count: 5,
  },

  {
    id: 'sig', kind: 'signature', type: 'field',
    leftRole:  'Vermieter',
    leftName:  DEFAULTS.vermieterSig,
    rightRole: 'Mieter',
    rightName: d => d.mieterName,
    ort:       DEFAULTS.unterschriftOrt,
  },
]


// ── FULL DOCUMENT ─────────────────────────────────────────────

export const KURZZEIT_MIETVERTRAG_TEMPLATE = {
  id:       'kurzzeit-mietvertrag-v1',
  name:     'Kurzzeitvermietung — Zimmervermietung',
  pages:    [PAGE_1, PAGE_2, PAGE_3],
  defaults: DEFAULTS,
} as const
