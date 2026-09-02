// Fills the four page templates from an issue object. Each page is rendered twice (top/bottom quadrant);
// the quadrant's overflow clips it so the horizontal fold cuts through the layout.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function paragraphs(text) {
  return String(text || '').replace(/\r/g, '').split(/\n\s*\n|\n/).map(s => s.trim()).filter(Boolean);
}

function fillText(root, field, value) {
  root.querySelectorAll(`[data-f="${field}"]`).forEach(el => { el.textContent = value || ''; el.classList.toggle('empty', !value); });
}
function fillBody(root, field, text, { dropFirst = false } = {}) {
  root.querySelectorAll(`[data-f="${field}"]`).forEach(el => {
    const ps = paragraphs(text);
    el.innerHTML = ps.map((p, i) => `<p${i === 0 && dropFirst ? ' class="drop"' : ''}>${esc(p)}</p>`).join('');
    el.classList.toggle('empty', !ps.length);
  });
}
function fillImage(root, field, url, caption, newsprint) {
  root.querySelectorAll(`figure[data-f="${field}"]`).forEach(fig => {
    const img = fig.querySelector('.img');
    fig.classList.toggle('empty', !url);
    fig.classList.toggle('newsprint', !!newsprint);
    img.style.backgroundImage = url ? `url("${url.replace(/"/g, '%22')}")` : '';
    const cap = fig.querySelector('figcaption'); if (cap) cap.textContent = caption || '';
  });
}

export function renderIssue(issue, cfg) {
  const pages = {
    'front': document.getElementById('tpl-front'),
    'inside-left': document.getElementById('tpl-inside-left'),
    'inside-right': document.getElementById('tpl-inside-right'),
    'back': document.getElementById('tpl-back'),
  };
  // Second story: last paragraph becomes the short note.
  const secondPs = paragraphs(issue.secondStory);
  const secondNote = secondPs.length > 1 ? secondPs.pop() : '';

  for (const [name, tpl] of Object.entries(pages)) {
    const frag = tpl.content.cloneNode(true);
    const root = frag.firstElementChild;
    fillText(root, 'masthead', cfg.masthead);
    fillText(root, 'price', cfg.price);
    fillText(root, 'earLeft', cfg.earLeft);
    fillText(root, 'earRight', cfg.earRight);
    fillText(root, 'date', issue.date);
    fillText(root, 'issueNo', issue.issueNo);
    fillText(root, 'mainHeadline', issue.mainHeadline);
    fillText(root, 'mainKicker', issue.mainKicker);
    fillBody(root, 'mainStory', issue.mainStory, { dropFirst: true });
    fillText(root, 'secondHeadline', issue.secondHeadline);
    fillBody(root, 'secondStory', secondPs.join('\n\n'));
    fillText(root, 'secondNote', secondNote);
    fillImage(root, 'secondImage', issue.secondImage, issue.secondCaption, cfg.newsprintImages);
    fillText(root, 'lettersHeadline', issue.lettersHeadline || (issue.letters ? 'Letters to the Editor' : ''));
    fillBody(root, 'letters', issue.letters);
    fillBody(root, 'courts', issue.courts);
    fillText(root, 'artsHeadline', issue.artsHeadline);
    fillBody(root, 'arts', issue.arts);
    fillImage(root, 'artsImage', issue.artsImage, issue.artsCaption, cfg.newsprintImages);
    fillBody(root, 'weather', issue.weather);
    fillBody(root, 'shipping', issue.shipping);
    fillText(root, 'objectLine', issue.objectCaption ? `In the fold this week — ${issue.objectCaption}.` : 'Nothing in the fold this week.');
    root.querySelectorAll('[data-f="classifieds"]').forEach(el => {
      const ads = String(issue.classifieds || '').split(/\n|;/).map(s => s.trim()).filter(Boolean).slice(0, 4);
      el.innerHTML = ads.map(a => `<p>${esc(a)}</p>`).join('');
      el.classList.toggle('empty', !ads.length);
    });

    document.querySelectorAll(`.page[data-page="${name}"]`).forEach(slot => {
      slot.replaceChildren(root.cloneNode(true));
    });
  }
}
