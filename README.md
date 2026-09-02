# The Happy Newspaper

A weekly newspaper that lives on a desk. It arrives folded; click once to unfold it, again to open the spread, and a small object (the **highlight of the week**) tumbles out of the fold and lands on the desk. Every issue is a row in a Google Sheet, filled in with a Google Form. Formatting is fixed in the design; the sheet only supplies words, image URLs and the object.

Live site: **https://mudranagda.github.io/happy-newspaper/** · Repo: https://github.com/MudraNagda/happy-newspaper

No build step, no server, no keys. Plain HTML/CSS/JS, three.js from a CDN, hosted on GitHub Pages.

---

## One-time setup (≈10 minutes)

1. **Create the Form + Sheet** — open https://script.google.com, make a new project, paste [`setup/create-form.gs`](setup/create-form.gs), run `createHappyNewspaperForm`, approve permissions once. The log prints the Form URL (fill weekly) and the Sheet URL.
   *Or* build the Form by hand with the question titles in the table below and link it to a response Sheet.
2. **Share the Sheet** — Share → *Anyone with the link* → *Viewer*. Required: the site reads it through the public `gviz` JSON endpoint, so nothing is private and no API key is needed.
3. **Point the site at it** — in [`js/config.js`](js/config.js) set `sheetUrl` to the Sheet URL and commit. Masthead, price, ears and timings live in the same file.

Until `sheetUrl` is set the site shows the built-in sample issue from [`js/sample-issue.js`](js/sample-issue.js).

## Weekly workflow

1. (Optional) Make the object: export a `.glb` (< 1 MB, < 20k tris, baked colours), drop it in [`objects/`](objects/) as `YYYY-MM-DD.glb`, `git push`. Or host it on Drive/anywhere public and paste the link.
2. Fill the Form: articles, image URLs, **Object URL**, **Object caption**.
3. Done. The site picks up the newest row on next load (responses are cached 10 minutes; if the sheet is unreachable the last good issue is shown).

## Form questions → where they land

Columns are matched by **keyword in the header**, case-insensitive, so the exact wording can vary as long as the key words are there.

| Question | Lands in |
|---|---|
| `Issue date` | dateline (masthead title stays fixed) and sort order, newest first |
| `Issue number` | dateline, left (optional) |
| `Main headline` | front-page banner headline |
| `Main kicker` | one-line italic standfirst (optional) |
| `Main story` | front page, 3 justified columns; blank line = new paragraph |
| `Second headline` / `Second story` | lower front page; the **last paragraph becomes the short note** |
| `Second image` (URL) / `Second caption` | lower front-page photo |
| `Letters headline` / `Letters` | page 2, 2 columns (headline defaults to "Letters to the Editor") |
| `Courts` | page 2, "The Week in the Courts", 2 columns |
| `Arts headline` / `Arts` | page 3 review |
| `Arts image` (URL) / `Arts caption` | review ph