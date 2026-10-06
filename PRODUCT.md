# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience is inferred from the portfolio context: design peers and hiring teams looking to understand Htet's design thinking and explore a working prototype. This audience has not been separately confirmed.

## Product Purpose

A personal portfolio surface for Htet's notes and interactive experiments. Success means a visitor can read the author's design thinking and try the inequality instrument in the same experience.

## Capabilities and Constraints

- The site has two sections: Notes and Playground.
- The first note is “Closer to the Material,” supplied by Htet. Preserve its wording and signature; remove only stray formatting backslashes and format its three questions as bullets. Do not invent a publication date.
- Playground contains the existing interactive inequality instrument. Preserve its controls, calculations, sounds, status indicators, and responsive behavior.
- The project is an existing React and Vite application. Content remains local; no public API or data-model changes are requested.
- On desktop, navigation, item list, and selected content occupy three visible panels. On narrow screens, show one panel at a time with back navigation.

## Brand Commitments

- The instrument's visual language is authoritative for the machine: light enamel or graphite casing, raised dark flaps, Barlow Condensed board lettering, red indicators, and the existing machine shadow.
- The portfolio shell uses warm light surfaces, charcoal text, restrained red active details, and fine dividers. Use a readable sans-serif for long-form note text.

## Evidence on Hand

- User-provided note: “Closer to the Material.”
- Existing interactive instrument in `src/instrument.tsx`.

## Product Principles

- Pair reflection with working artifacts.
- Let visitors move directly between notes and interactive experiments.
- Preserve the behavior and identity of the instrument while adding portfolio navigation.
