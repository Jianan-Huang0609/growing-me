# Growing Me repository instructions

These instructions apply to the whole repository.

## Product boundary

Growing Me is clone-first. In the local workflow, `private/life-grid-monthly.json` is the only authoritative personal map. It is private, Git-ignored, and must never be copied into source files, fixtures, screenshots, logs, `dist/`, commits, or chat output unless the user explicitly asks for a backup.

The coding agent conducts the interview and is the only local writer. The website is a read-only projection of the private file. Do not create a second authoritative copy in browser storage, generated HTML, another session, or a knowledge service.

Public source may contain only the blank template, fictional demonstrations, Skill, Schema, code, tests, and documentation.

## One engine, three experience modes

Maintain one UI engine and one data contract. Do not fork the product into three codebases or let one mode silently fall through to another mode's data source. These are independent user-facing entries, not tabs in one page: do not add a prominent global mode switch merely because the renderer is shared.

- `?mode=personal` is the local private workflow. `private/life-grid-monthly.json` is its only authority, and the website is a read-only projection. The coding agent may update that file only through the confirmation and revision protocol below.
- `?mode=example` is a complete, fictional, public-safe teaching case. Its source JSON, rooms, and direction identities stay fixed. Visitors may temporarily edit or fill each existing direction workbench's goal, anti-vision, input, practice, output, evidence-description, and review fields; adding or editing monthly actions is a supporting trial path. These edits change only the current page's in-memory view. Refresh and reset restore the original fictional sample. Example must not request or read the private API, write any localStorage key or other persistent store, or modify the private file. Export the original sample, never trial edits. Do not present a trial evidence description as a real completed record.
- `?mode=blank` starts strictly empty for a first-time visitor. Empty cells remain visibly empty; do not backfill them with example cards or inferred content. After the user explicitly imports a map, this entry may save and restore that map only in its dedicated starter localStorage key so the user can keep using the blank-start version.

Mode changes may reuse rendering code, but data is isolated. `example` must never use private or browser-persisted personal data; label direction-workbench and monthly-action trials as temporary and explain that refresh discards edits. `blank` must never read the private API/file, Example data, Personal localStorage, or another mode's in-memory state; it may read only its own starter storage after an explicit user import. Starter storage is not cloud sync, cross-device backup, or the authoritative Personal private file. Tell Blank users to export important changes.

The complete Example is the current public-review priority. Keep it self-contained: it must not carry a Blank-template call to action inside the experience or interrupt the fictional case with setup choices.

## Required local workflow

When a user asks to start or continue their Life Grid:

1. If the local app is not already running and the user asked the coding agent to set up the workflow, run `./start`; otherwise give the user that exact command. It initializes `private/life-grid-monthly.json` from the blank template when needed and serves only on loopback.
2. Read `skills/growing-me-life-grid-monthly/SKILL.md` and every reference it requires for the current mode.
3. Read the latest `private/life-grid-monthly.json` before interviewing or proposing a change. Treat its `meta.revision` as the write base.
4. Interview one question at a time. Preserve user wording and present AI synthesis as a candidate.
5. Do not write merely because a candidate was proposed. Wait for explicit confirmation of the exact change. If the user explicitly asks to save an unfinished draft, keep its status `candidate`; do not relabel it `confirmed`.
6. Preserve stable ids, untouched fields, and unknown fields. Build the complete candidate with the confirmed change, update `meta.updated_at`, and set `meta.revision` to exactly the base revision plus one.
7. Write that candidate to a uniquely named temporary file in the same `private/` directory as the authoritative file. Strictly validate the raw temporary JSON without silently defaulting, coercing, dropping, or repairing fields; also require the repository Schema/model invariants and the exact next revision.
8. After validation, immediately re-read the authoritative file. If its revision differs from the base, stop; never rename or overwrite the authoritative file.
9. Atomically rename the same-directory temporary file onto `private/life-grid-monthly.json`, then read the authoritative path back and strictly validate its revision and intended fields.
10. If any pre-rename step fails, leave the authoritative file untouched. If rename or read-back fails, stop without a second overwrite and report failure or unknown state. Never claim success from a valid temporary file alone.

If file access is unavailable, do not claim the website or private file was updated. Return one complete, valid JSON document for manual import or backup. A patch, prose summary, or partial fragment is not a valid fallback map.

## Product sequence

Keep work in this order:

1. Confirm the center vision and eight first-level rooms.
2. Confirm each room's second-level long-term directions, up to eight per room.
3. Run a whole-map calibration for overlap, vague language, missing areas, and misplaced metrics, tools, or projects.
4. Make the same data legible in both the two-layer grid and room-corridor views, with eight distinct room spatial grammars.
5. Only then add a small number of monthly actions and records.
6. Design Agent, cross-session, Codex project, OpenClaw, Wiki, cloud sync, account, or remote-write integrations later. Do not connect or create them as part of the clone-first slice.

Eight by eight is a maximum structure, not a completion quota. Do not invent content to fill empty cells.

The 64 second-level positions are a long-term coordinate system, not 64 todos. A direction may describe what to notice, practice, produce, and review without becoming a monthly action. Keep the active monthly action set deliberately small.

## Safety and validation

- Never expose a direct static route to `private/`, `.git/`, credentials, or local machine files.
- The local server must bind only to `127.0.0.1` or `::1`; do not broaden it to the LAN without a separate explicit decision.
- The public build must exclude `private/`.
- A public release must be assembled as a reviewed, allowlisted, clean snapshot. Do not push this development repository's existing history directly to a public remote: earlier history may contain personal-derived wording even when the current tree is sanitized.
- Invalid JSON or an invalid model must not replace the last valid website view.
- Do not edit long-term directions, mark actions complete, retire content, or infer sensitive health or financial facts without explicit user confirmation.
- Preserve unrelated dirty work. Modify only files required by the current request.

For a private-file write, a useful validation command is:

```bash
node -e "const fs=require('node:fs');const model=require('./monthly/model.js');model.assertCanonicalMonthly(JSON.parse(fs.readFileSync('private/life-grid-monthly.json','utf8')));console.log('life-grid canonical')"
```

This proves structural readability only. It does not prove that the content reflects the user's intent; explicit confirmation is the semantic gate.

Before calling a revision shareable, minimally verify all three modes independently:

1. `personal` reads the valid private file, preserves the last valid view on invalid input, recovers after repair, and never writes from the browser.
2. `example` shows one complete fictional map; in a room's direction workbench, a visitor can edit or fill goal, anti-vision, input, practice, output, evidence-description, and review fields in page memory. Monthly actions can also be tried. Refresh/reset restores the original sample, export contains the original sample, and no private API or persistent storage is touched.
3. `blank` opens as a genuinely empty map for a new browser profile; after an explicit import, it restores only its own starter map and never reveals Example or Personal content.
4. Switching or reloading modes does not leak data across them.
5. Import/export, keyboard access, mobile layout, Skill packaging, and a public build without `private/` are checked separately.

Passing automated checks is necessary but not sufficient. Until independent users complete the clone-to-first-confirmed-change flow, describe the product as a **shareable alpha**, not mature or production-ready.

After a successful authoritative-file read-back, use wording equivalent to: “私人文件已更新并回读 Rn；页面在本地服务和页面仍开启时会自动刷新。” Only after directly checking the live browser and seeing that revision may you additionally say: “已在浏览器验证页面显示 Rn。” Never collapse these two evidence levels.
