import { loadIssues, normalizeUrl } from './sheet.js';
import { renderIssue } from './render.js';
import { Fold, attachTilt } from './fold.js';
import { Drop } from './drop.js';

const cfg = window.PAPER_CONFIG;
const $ = (id) => document.getElementById(id);
const paper = $('paper'), desk = $('desk'), tilt = $('tilt');
const isMobile = matchMedia('(max-width: 720px), ((hover: none) and (pointer: coarse))').matches;

let issues = [], index = 0;
const drop = new Drop($('dropLayer'), $('dropCanvas'), $('dropFallback'), $('splat'), $('objectCaption'), desk);

const HINTS = ['click to unfold', 'click to open', 'click to fold'];
const fold = new Fold(paper, cfg, {
  onStage: (stage) => {
    $('hintText').textContent = isMobile ? HINTS[stage].replace('click', 'tap') : HINTS[stage];
    $('paperShadow').dataset.stage = stage;
    document.body.dataset.stage = stage;
  },
  onOpenProgress: (dir, openMs) => {
    if (dir === 'open') drop.scheduleDrop(openMs * 0.4);
    else drop.dismiss();
  },
});
$('hintText').textContent = isMobile ? 'tap to unfold' : 'click to unfold';
window.__paper = { drop, fold, show: (i) => show(i), get issues() { return issues; } }; // handy in devtools
attachTilt(desk, tilt, { enabled: !isMobile });

function show(i) {
  index = Math.max(0, Math.min(issues.length - 1, i));
  const issue = issues[index];
  renderIssue(issue, cfg);
  $('olderBtn').disabled = index >= issues.length - 1;
  $('newerBtn').disabled = index <= 0;
  $('olderBtn').hidden = $('newerBtn').hidden = issues.length < 2;
  const obj = issue.objectUrl
    ? { url: normalizeUrl(issue.objectUrl, cfg.objectsDir), caption: issue.objectCaption, scale: issue.objectScale || 1, drop: issue.objectDrop || 'tumble', fallback: normalizeUrl(issue.objectFallback, cfg.objectsDir) }
    : (cfg.defaultObject ? { ...cfg.defaultObject, url: normalizeUrl(cfg.defaultObject.url, cfg.objectsDir) } : null);
  drop.prepare(obj); // preload so the drop is instant
  if (fold.stage === 2) drop.scheduleDrop(0);
  document.title = `${cfg.masthead} — ${issue.date || ''}`.trim();
}
$('olderBtn').addEventListener('click', () => { drop.dismiss(true); show(index + 1); });
$('newerBtn').addEventListener('click', () => { drop.dismiss(true); show(index - 1); });
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
  // Refresh quietly when the ca