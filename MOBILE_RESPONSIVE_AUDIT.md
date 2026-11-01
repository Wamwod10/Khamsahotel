# Khamsa Hotel — Mobile Responsive Code Audit

Date: 2026-11-01
Repository: Wamwod10/Khamsahotel
Scope: public mobile booking and content pages; desktop design and back-end logic remain unchanged.

## Confirmed code-level issues

| Priority | Area | Cause | Correction |
| --- | --- | --- | --- |
| P1 | Homepage | Hardcoded booking form offset (previous -680px/-660px), conflicting selector paths | Replaced mobile hero rules with correct DOM selectors and natural content flow |
| P1 | Home room cards | `margin-top: 750px`, `width: 376px` and image width 400px | Responsive grid and width constraints, no fake spacer |
| P1 | Booking inputs | iOS-native date/time controls can impose intrinsic width | Constrained flex/grid children and native input sizing at 44px |
| P1 | Rooms listing | Many negative left/right offsets and positioned price elements | Restored mobile document flow with responsive images and price wrapping |
| P2 | Navigation | Custom property `--nav-h` marked `!important`, overriding runtime measured height; mobile width accumulation | Dynamic navbar height restored, drawer and action widths balanced |
| P2 | Booking modal | Duplicated tablet/mobile overrides, fixed-width summary and vertical overflow | Consolidated modal stylesheet, scrollable dialog, two-column summary, sticky actions |
| P2 | Home extras | Cards fixed at 320px/330px or overflowing text/image | Fluid grids for nearby places, booking benefits and gallery |
| P2 | Contact page | Absolute map address overlay and fixed widths | Address block enters normal flow on mobile |
| P2 | Payment / My Booking | Modal min-width, long text and button widths | Viewport-safe modal scrolling and flexible controls |
| P3 | Footer | Text shrank to 10px at very small widths | Kept legible font sizes with wrapping |
| P2 | Gallery | Close button was hidden in base stylesheet | Exposed 44px close control on mobile |

## Responsive decisions

- Preserve existing white/orange visual language, room photography, pricing UI and desktop composition.
- Keep 44px minimum touch targets for form inputs and primary actions.
- Use `minmax(0,1fr)`, `min-width:0` and container-relative widths to avoid horizontal overflow.
- Avoid hardcoded mobile vertical spacers, negative offsets, or fixed widths greater than the viewport.
- Keep iPhone input font size >=16px to prevent automatic zoom in Safari.
- Provide scrollable dialogs inside `100dvh` and a visible bottom action row.
- Reduce 2-column sections to 1 column on narrow phones.

## Source checks performed

- Checked latest GitHub branch and actual import paths for mobile styles.
- Audited public layout, homepage, navbar, room listing, booking, gallery, nearby, benefits, offers, contact, My Booking, payment modals and footer.
- Checked edited stylesheet brace balance and searched for known legacy offset patterns.
- Confirmed no business pricing, booking API, payment API or Bnovo integration changes in this mobile styling set.

## Browser QA checklist (NOT VERIFIED)

A browser/device execution has **not** been completed. Verify these at 320x700, 360x800, 375x812, 390x844, 430x932, 768x1024, and 1024x768:

1. Home hero image doesn't stretch/crop into an unreadable banner; all hero text and feature labels remain visible.
2. Booking form date/time inputs render at 44px height, can be focused and picked in iOS Safari, and never exceed the card width.
3. No horizontal page scrolling; home room cards begin directly after booking form.
4. Mobile language selector and nav drawer open and close; overlay aligns with measured nav height.
5. Room listing images and badges fit; price lines wrap without overlap.
6. Booking modal can scroll, focused inputs are accessible, and action buttons remain reachable above the mobile keyboard.
7. My Booking cards, edit modal, payment and status dialogs are readable and usable.
8. Gallery close/next/prev buttons work; contact map content, offers and footer are legible.
9. Compare desktop at 1366x768 and 1440x900 against previous production.
10. Confirm no console errors, unexpected API calls or booking/time-zone regressions.

## Deployment

GitHub main contains the corrected source. Vercel's most recent full build for the latest commits could not be confirmed because GitHub commit statuses report: `Deployment rate limited — retry in 24 hours`. Do not claim the latest source is live until a READY deployment references the exact latest SHA and is aliased to khamsahotel.uz.
