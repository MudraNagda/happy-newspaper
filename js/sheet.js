// Google Sheet → issues. Reads the public gviz JSON endpoint (sheet must be link-shared, Viewer).
// Column matching is by keyword in the header, case-insensitive (see README).

const FIELD_KEYS = [
  // [field, [keywords that must ALL appear in header]] — first match wins, so order matters.
  ['issueNo',        ['issue', 'number']],
  ['issueNo',        ['issue', 'no']],
  ['date',           ['issue', 'date']],
  ['mainHeadline',   ['main', 'headline']],
  ['mainKicker',     ['kicker']],
  ['mainStory',      ['main', 'story']],
  ['secondHeadline', ['second', 'headline']],
  ['secondStory',    ['second', 'story']],
  ['secondImage',    ['second', 'image']],
  ['secondCaption',  ['second', 'caption']],
  ['lettersHeadline',['letters', 'headline']],
  ['letters',        ['letters']],
  ['courts',         ['courts']],
  ['artsHeadline',   ['arts', 'headline']],
  ['artsImage',      ['arts', 'image']],
  ['artsCaption',    ['arts', 'caption']],
  ['arts',           ['arts']],
  ['weather',        ['weather']],
  ['shipping',       ['shipping']],
  ['classifieds',    ['classified']],
  ['objectUrl',      ['object', 'url']],
  ['objectCaption',  ['object', 'caption']],
  ['objectScale',    ['object', 'scale']],
  ['objectFallback', ['object', 'png']],
  ['objectFallback', ['object', 'fallback']],
  ['objectUrl',      ['object']],
  ['timestamp',      ['timestamp']],
  ['date',           ['date']],
];

export function headerToField(header) {
  const h = String(header || '').toLowerCase();
  for (const [field, keys] of FIELD_KEYS) if (keys.every(k => h.includes(k))) return field;
  return null;
}

export function sheetIdFrom(url) {
  const m = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

export function gvizUrl(sheetUrl, tab = '') {
  const id = sheetIdFrom(sheetUrl);
  if (!id) throw new Error('Not a Google Sheets URL');
  const gid = (String(sheetUrl).match(/[#&?]gid=(\d+)/) || [])[1];
  let u = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=1`;
  if (tab) u += /^\d+$/.test(tab) ? `&gid=${tab}` : `&sheet=${encodeURIComponent(tab)}`;
  else if (gid) u += `&gid=${gid}`;
  return u;
}

export function parseGviz(text) {
  const start = text.indexOf('(');
  const end = text.lastIndexOf(')');
  if (start < 0 || end < 0) throw new Error('Unexpected gviz response');
  const data = JSON.parse(text.slice(start + 1, end));
  if (data.status === 'error') throw new Error((data.errors || []).map(e => e.detailed_message || e.message).join('; '));
  const cols = data.table.cols.map(c => c.label || c.id);
  const rows = data.table.rows.map(r => (r.c || []).map(c => (c ? (c.f ?? c.v ?? '') : '')));
  return { cols, rows };
}

// Google Drive share link → direct image/file URL.
export function normalizeUrl(url, objectsDir = '') {
  let u = String(url || '').trim();
  if (!u) return '';
  let m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  if (/^https?:\/\//i.test(u) || u.startsWith('/') || u.startsWith('data:')) return u;
  return objectsDir + u; // bare filename → repo objects folder
}

export function rowsToIssues({ cols, rows }, cfg) {
  const fields = cols.map(headerToField);
  const issues = [];
  for (const r of rows) {
    const issue = {};
    fields.forEach((f, i) => { if (f && r[i] !== '' && issue[f] === undefined) issue[f] = String(r[i]); });
    if (!Object.keys(issue).some(k => k !== 'timestamp')) continue; // blank row
    if (issue.secondImage) issue.secondImage = normalizeUrl(issue.secondImage);
    if (issue.artsImage) issue.artsImage = normalizeUrl(issue.artsImage);
    if (issue.objectUrl) issue.objectUrl = normalizeUrl(issue.objectUrl, cfg.objectsDir);
    if (issue.objectFallback) issue.objectFallback = normalizeUrl(issue.objectFallback, cfg.objectsDir);
    issue.objectScale = parseFloat(issue.objectScale) || 1;
    issue._sort = Date.parse(issue.date) || Date.parse(issue.timestamp) || 0;
    issues.push(issue);
  }
  // Newest first; stable so the form's row order breaks ties.
  return issues.map((x, i) => [x, i]).sort((a, b) => (b[0]._sort - a[0]._sort) || (b[1] - a[1])).map(([x]) => x);
}

const CACHE_KEY = 'happy-newspaper:issues';

export async function loadIssues(cfg) {
  if (!cfg.sheetUrl) return { issues: window.SAMPLE_ISSUES || [], source: 'sample' };
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch {}
  if (cached && cached.sheetUrl === cfg.sheetUrl && Date.now() - cached.at < cfg.cacheMs && cached.issues.length) {
    return { issues: cached.issues, source: 'cache' };
  }
  try {
    const res = await fetch(gvizUrl(cfg.sheetUrl, cfg.sheetTab), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const issues = rowsToIssues(parseGviz(await res.text()), cfg);
    if (!issues.length) throw new Error('Sheet has no issues yet');
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ sheetUrl: cfg.sheetUrl, at: Date.now(), issues })); } catch {}
    return { issues, source: 'sheet' };
  } catch (err) {
    if (cached && cached.issues && cached.issues.length) return { issues: cached.issues, source: 'stale', error: err };
    return { issues: window.SAMPLE_ISSUES || [], source: 'sample', error: err };
  }
}
