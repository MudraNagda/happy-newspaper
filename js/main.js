import { loadIssues, normalizeUrl } from './sheet.js';
import { renderIssue } from './render.js';
import { Fold } from './fold.js';
import { WeeklyObject } from './object.js';
import { Origami } from './origami.js';

const cfg = window.PAPER_CONFIG;
const $ = (id) => document.getElementById(id);
const paper = $('paper'), desk = $('desk');
const isMobile = matchMedia('(max-width: 720px), ((hover: none) and (pointer: coarse))').matches;
const speed = cfg.openSpeed ?? 0.95;

let issues = [], index = 0;
const weekly = new WeeklyObject($('objectSlot'), { speed });

const HINTS = ['click to unfold', 'click to open', 'click to fold'];
const fold = new Fold(paper, $('tilt'), {
  speed, tilt: cfg.tiltAmount ?? 12,
  onStage: (stage) => {
    $('hintText').textContent = isMobile ? HINTS[stage].replace('click', 'tap') : HINTS[stage];
    document.body.dataset.stage = stage;
    if (stage === 2) weekly.mount(); else weekly.unmount(); // mounts at stage 2 only
  },
});
fold.tiltEnabled = !isMobile;
fold.attachTilt(desk);
$('hintText').textContent = isMobile ? 'tap to unfold' : 'click to unfold';
document.body.dataset.stage = 0;
const origami = new Origami({ cfg, fold, fit: $('fit'), panel: $('tearaway'), guides: $('tearGuides'), root: $('origami') });
window.__paper = { fold, weekly, origami, show: (i) => show(i), get issues() { return issues; } }; // handy in devtools

function show(i) {
  index = Math.max(0, Math.min(issues.length - 1, i));
  const issue = issues[index];
  renderIssue(issue, cfg);
  $('olderBtn').disabled = index >= issues.length - 1;
  $('newerBtn').disabled = index <= 0;
  $('olderBtn').hidden = $('newerBtn').hidden = issues.length < 2;
  const obj = issue.objectUrl
    ? { url: normalizeUrl(issue.objectUrl, cfg.objectsDir), caption: issue.objectCaption, scale: issue.objectScale || 1, fallback: normalizeUrl(issue.objectFallback, cfg.objectsDir) }
    : (cfg.defaultObject ? { ...cfg.defaultObject, url: normalizeUrl(cfg.defaultObject.url, cfg.objectsDir) } : null);
  weekly.prepare(obj);
  if (fold.stage === 2) weekly.mount();
  document.title = `${cfg.masthead} — ${issue.date || ''}`.trim();
}
$('olderBtn').addEventListener('click', () => show(index + 1));
$('newerBtn').addEventListener('click', () => show(index - 1));
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' && !$('olderBtn').disabled) $('olderBtn').click();
  if (e.key === 'ArrowRight' && !$('newerBtn').disabled) $('newerBtn').click();
});

(async () => {
  const { issues: got, source, error } = await loadIssues(cfg);
  issues = got; show(0);
  const st = $('status');
  if (source === 'sample' && cfg.sheetUrl) st.textContent = `couldn't read the sheet (${error?.message || 'error'}) — showing the sample issue`;
  else if (source === 'stale') st.textContent = 'sheet unreachable — showing the last saved issue';
  else st.textContent = '';
  setInterval(async () => {
    const r = await loadIssues(cfg);
    if (r.source === 'sheet' && JSON.stringify(r.issues) !== JSON.stringify(issues)) { issues = r.issues; show(0); }
  }, cfg.cacheMs + 1000);
})();
