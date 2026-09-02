/**
 * One-click setup: creates the Google Form with every question the paper reads,
 * links it to a new response Sheet, and logs both URLs.
 *
 * How to run:
 *   1. Go to https://script.google.com → New project → paste this file → Save.
 *   2. Run `createHappyNewspaperForm` (▶). Approve the permissions once.
 *   3. View → Logs: copy the Sheet URL into js/config.js → sheetUrl.
 *   4. In the Sheet: Share → Anyone with the link → Viewer.
 *
 * Question titles are matched by keyword in the site (see README), so keep the words
 * "Issue date", "Main headline", "Object URL", etc. Reword the help text freely.
 */
function createHappyNewspaperForm() {
  const form = FormApp.create('The Happy Newspaper — weekly issue');
  form.setDescription('One response = one issue. Blank lines in a story become paragraph breaks. Leave anything blank to leave that slot empty.');

  const text = (title, help, required) => { const i = form.addTextItem().setTitle(title); if (help) i.setHelpText(help); if (required) i.setRequired(true); return i; };
  const para = (title, help) => { const i = form.addParagraphTextItem().setTitle(title); if (help) i.setHelpText(help); return i; };

  form.addSectionHeaderItem().setTitle('Front page');
  text('Issue date', 'e.g. Monday, 1 September 2026 (shown in the dateline)', true);
  text('Issue number', 'e.g. No. 12 (optional)');
  text('Main headline', '', true);
  text('Main kicker', 'One-line standfirst under the headline (optional)');
  para('Main story', 'Auto-split into 3 justified columns. Blank line = new paragraph.');
  text('Second headline', 'Lower front page');
  para('Second story', 'The last paragraph becomes the short note in italics.');
  text('Second image', 'Image URL. Google Drive share links work if the file is link-shared.');
  text('Second caption', '');

  form.addSectionHeaderItem().setTitle('Inside left — page 2');
  text('Letters headline', 'Defaults to "Letters to the Editor"');
  para('Letters', 'Auto-split into 2 columns.');
  para('Courts', '"The Week in the Courts", 2 columns.');

  form.addSectionHeaderItem().setTitle('Inside right — page 3');
  text('Arts headline', '');
  para('Arts', 'The review.');
  text('Arts image', 'Image URL');
  text('Arts caption', '');
  para('Weather', '');
  para('Shipping', '');
  para('Classifieds', 'Up to 4 ads, one per line (or separated by ;)');

  form.addSectionHeaderItem().setTitle('Highlight of the week (optional)')
      .setHelpText('Leave blank for a week with nothing in the fold.');
  text('Object URL', 'A .glb — either a filename in the site\'s objects/ folder (e.g. 2026-09-01.glb) or a public/Drive link.');
  text('Object caption', 'Shown next to the object once it lands, e.g. "this week: a rose I printed"');
  text('Object scale', 'Number, default 1');
  text('Object PNG', 'Optional .png fallback for browsers without WebGL');

  const ss = SpreadsheetApp.create('The Happy Newspaper — issues');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('FORM (fill this weekly): ' + form.getPublishedUrl());
  Logger.log('FORM (edit):            ' + form.getEditUrl());
  Logger.log('SHEET (paste in config): ' + ss.getUrl());
  Logger.log('Now: Share the Sheet → Anyone with the link → Viewer.');
}
