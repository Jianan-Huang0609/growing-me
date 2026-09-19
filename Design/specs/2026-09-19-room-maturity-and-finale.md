# Room maturity and corridor finale

Linked feedback: [TODO](../dev-memory/TODO.md).

## Suggestion

The current room concepts are useful, but repeated generic backgrounds and simplified objects make them feel like a themed template. The corridor also needs an intentional ending after the eighth door.

## Approach

Art direction: an editorial life atlas / small spatial exhibition. Keep the existing forest green, mineral gold, and paper tones. Prefer one coherent, legible hero object per room, finer linework, real material hierarchy and negative space over extra glowing particles or more identical cards. Preserve eight distinct metaphors: route, gallery, technical bench, botanical tree, book, ledger bridge, cutaway home, and family album.

The eighth door leads to a final corridor threshold. Scrolling into it never exits automatically. An explicit action closes the outer corridor door, restores the overview grid, and lets the visitor begin another walk later. The room-level back button remains a separate, shorter return to that room's door.

## Plan

- Refine scene-specific SVG/HTML and CSS for all eight room layouts, without changing map content or the shared data contract.
- Make generic typography/card framing quieter where it competes with the illustration; keep all eight directions and their workbenches usable.
- Add an end-state and close transition to the corridor; handle keyboard, reduced motion, and mobile.
- Keep Personal private data untouched and public Example/Blank data isolated.

## Verification

- Review all eight Example rooms at entrance and at an active direction; open and close a direction workbench.
- Traverse to the corridor end, use explicit exit, verify the closing motion, grid return, and re-entry.
- Check Blank remains empty; run static build, public tests, syntax/diff checks, privacy scan, and inspect the live Pages deployment if published.
