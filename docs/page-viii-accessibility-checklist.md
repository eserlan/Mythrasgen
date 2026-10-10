# Page VIII accessibility review checklist

The CI browser check runs axe-core against the Page VIII equipment activity, group selection, category results, selected item details, owned equipment, and character review. It checks WCAG 2.2 A/AA rules on those rendered states. Automated checks do not cover every success criterion or replace assistive-technology review.

Before release, manually verify and record the browser/assistive-technology versions and results for each item:

- [ ] Keyboard only: Tab/Shift+Tab through navigation, search, groups, categories, result rows, details, purchase controls, disclosures, and inventory editing. Enter/Space activates controls; focus remains visible and follows the page order.
- [ ] Keyboard only: choose a group and item, close item details, switch activities, and confirm no keyboard trap or focus loss.
- [ ] Screen reader: headings and landmarks are announced in order; selected result and current activity are identified; labels include item names; disclosure states are announced.
- [ ] Screen reader: successful purchase, acquisition, edit, and removal outcomes are understandable; errors explain how to fix the issue; remaining money changes are announced.
- [ ] Responsive reflow: inspect at 320 CSS px and at 400% browser zoom. Primary content has no horizontal scroll or clipped controls.
- [ ] Text spacing: apply WCAG 1.4.12 spacing overrides (line height 1.5×, paragraph spacing 2×, letter spacing .12em, word spacing .16em). Confirm content remains visible and operable.
- [ ] Contrast: verify normal text at least 4.5:1, large text and essential control boundaries at least 3:1 in light and dark themes.
- [ ] Touch: confirm controls are at least 24 CSS px or have sufficient spacing to meet WCAG 2.2 target-size minimums.

Record findings in the pull request before release. No manual screen-reader result is implied by the automated CI pass.
