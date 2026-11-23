# Photo portfolio typography review

The user chose **two theme-specific combinations** on November 23, 2026:

| Theme | Headings / photograph titles | Body / navigation / controls / byline |
| --- | --- | --- |
| Light | Fraunces | Manrope |
| Dark | Space Grotesk | IBM Plex Sans |

IJ.PRIME uses Instrument Sans at weight 500 in both modes. A sun/moon button
switches theme and typography together. The existing site's `next-themes`
preference is reused, including persistence and its existing default/system
behavior. No independent font toggle or second preference store.

## Dark palette review

The user requested three color directions, then darker versions of beige and
graphite. **Darker graphite (`#141517`) is the settled, approved choice.** Keep
the current light/dark font assignments and Instrument Sans wordmark.

| Palette | Background | Character |
| --- | --- | --- |
| `beige` | `#1f1c18` | Deeper warm taupe, softened cream text, sand accents |
| `graphite` — active | `#141517` | Deeper neutral graphite, softened silver text/accents |
| `ink` | `#142333` | Deep ink blue, cool text and blue accents |

Change `portfolioDarkPalette` in `features/photo-portfolio/appearance.ts` to one
of those values. The layout supplies `data-dark-palette`; dark-only stylesheet
selectors change the full set of surface/text/border/focus variables. No palette
picker was added. Light colors and font assignments remain independent.

All three were previewed at the same 1280 × 720 viewport and saved for comparison.
Browser confirmed each actual background, unchanged dark fonts, preserved light
paper/Fraunces when switching theme. The first round used beige `#2d2922` and
graphite `#202123`. Revised darker backgrounds/surfaces/borders and softened text
were previewed at the same size; darker graphite was left active. Initial
TypeScript/scoped lint and all diff checks passed; no captured console errors.

The original review options are retained below as reference.

| Option | Headings / photograph titles | Body / navigation / controls | Intended character |
| --- | --- | --- | --- |
| 1 | Newsreader | Instrument Sans | Quiet, bookish, warm; closest to the established editorial direction |
| 2 — light mode | Fraunces | Manrope | Softer, more expressive, with a more distinctive serif |
| 3 — dark mode | Space Grotesk | IBM Plex Sans | Crisp, contemporary; a deliberate alternative without serif headings |

These descriptions are design judgments for this portfolio, not claims from the
font designers. The combinations share one size/spacing system for comparison.

## User feedback

- Option 1: **7/10**. Likes the sidebar font choices (Instrument Sans). Newsreader
  feels too messy. Preserve that preference when settling on a final combination;
  the heading and body fonts can be mixed after the three-option review.
- Option 2: Fraunces is **much better** than option 1's serif. After revisiting
  option 1, the user chose option 2 with only its wordmark replaced by Instrument
  Sans from option 1. All layout cleanup is retained.
- Option 3: liked its techy character. User decided to use it for dark mode and
  keep the previous consolidated scheme for light mode.

## Implementation and switching themes

`features/photo-portfolio/typography.ts` supplies four unique local font variables:
`--portfolio-font-light-heading`, `--portfolio-font-light-body`,
`--portfolio-font-dark-heading`, and `--portfolio-font-dark-body`. The stylesheet
maps the semantic heading/body roles to the appropriate pair using the existing
root `.dark` class. The former `activePortfolioFontOption` selector was removed.

`PortfolioThemeSwitch.tsx` calls the existing provider's `setTheme`; the control is
beside copyright on desktop and beside the menu button on mobile. Both action
labels/icons are in stable server/client markup; CSS shows only the appropriate
action, avoiding theme-dependent hydration differences. No root provider settings
or homepage components were changed.

`portfolioTypography.wordmarkClassName` independently supplies Instrument Sans to
`Sidebar` through the preview layout. The class is applied only to the IJ.PRIME
span; it does not override the active body font on the byline or navigation.

Font roles are consistent across Selected Work, Series, Archive, About, Index,
viewer captions, and empty/error states. Headings and photograph titles use
`--portfolio-font-heading`; all interface/body text uses
`--portfolio-font-body`. Wordmark explicitly uses Instrument Sans at weight 500.

Current sizes:

- Overview titles: 32 px desktop, 28 px mobile (previously 45 / 38 px).
- Series card titles: 20 px (previously 22 px).
- Sequence heading: 20 px; photograph captions: 14 px.
- Empty/error headings: 28 px. Other body/control sizes retain their hierarchy.

## Font assets and licenses

`features/photo-portfolio/fonts/` contains Latin variable WOFF2s, each family's
SIL Open Font License, and `sources.json` recording exact source URLs.
`scripts/prepare-portfolio-fonts.mjs` downloads fonts from Google's font service
and licenses from the official Google Fonts repository. Assets are self-hosted
through `next/font/local`; page loads and builds need no Google font download.
Inactive font files are not preloaded.

References:

- [Newsreader](https://github.com/productiontype/Newsreader)
- [Instrument Sans](https://github.com/Instrument/instrument-sans)
- [Fraunces](https://github.com/undercasetype/Fraunces)
- [Manrope in Google Fonts](https://github.com/google/fonts/tree/main/ofl/manrope)
- [Space Grotesk](https://github.com/floriankarsten/space-grotesk)
- [IBM Plex](https://github.com/IBM/plex)
- [Next.js local fonts](https://nextjs.org/docs/app/api-reference/components/font#local-fonts)

## Option 1 verification

TypeScript, scoped ESLint, and diff whitespace checks passed. Browser verified
Newsreader on page/series/viewer/photo titles and Instrument Sans on navigation
and search. Font loading state was `loaded`; desktop overview title measured
32 px, mobile 28 px. Selected Work stayed 720 px document / 720 px viewport on
desktop and 844 / 844 on mobile. No mobile horizontal overflow or captured browser
console errors. Option 3 had not been applied at that checkpoint.

## Option 2 verification

Browser confirmed Fraunces on viewer headings/captions and Manrope in the sidebar;
fonts loaded successfully. Selected Work subtitle is absent in slideshow and
Index. Footer links are exactly Instagram and Personal website; copyright is
separated from the link group. Mobile navigation contains the same two links.
Desktop viewer stays 720 / 720 px, mobile 844 / 844 px, with no horizontal
overflow or captured console errors. TypeScript and scoped lint passed for the
viewer/footer changes; diff whitespace check passed.

Consolidated scheme verified in browser: Fraunces headings, Manrope navigation
and byline, Instrument Sans wordmark at 500; fonts loaded. TypeScript, scoped
lint, and diff whitespace checks passed.

## Option 3 verification

At the user's request, option 3 is active for comparison. Browser confirmed
Space Grotesk headings, IBM Plex Sans navigation/body, and the preserved
Instrument Sans wordmark. Fonts loaded successfully; existing sizes and layout
are retained. This combination subsequently became the dark-mode typography.

## Theme milestone verification

TypeScript, scoped ESLint, and diff whitespace checks passed. Browser verified:

- Correct palette and font pair in each theme; Instrument Sans wordmark in both.
- Light and dark preferences survive reload. Switching preserves Archive search,
  open viewer details, and Index contents. Keyboard Enter activates the switch.
- Dark Archive place picker uses the dark surface and IBM Plex Sans; filtering
  still works. Dark Index uses dark image frames and scrolls normally.
- Desktop slideshow remains 720 / 720 px. At 390 × 844, slideshow is 844 / 844,
  with no horizontal overflow and a visible mobile theme button.
- Mobile menu navigation retains the theme. No captured browser console errors.

Pause for the user's palette/control review before developing another UI milestone.
