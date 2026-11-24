# UX block 1: dead ends and navigation loops

Branch `feature/ux-dead-ends`. Source audit: `/Users/waltercaste/.gemini/antigravity-cli/brain/0cc92043-9634-42d6-a0c8-3522fc7dafb9/ux-audit-raw.md`.
Every UI change must follow AGENTS.md and DESIGN.md (ScreenHeader, theme tokens, shared components).

## Specs

- S1 (A-F01): A citizen redirected to `/company-invitations` must be able to leave: decline or postpone the invitation, or log out; back must not loop to `/` and back.
- S2 (A-F03): During password recovery (`new-password.tsx`) the user must be able to cancel/log out; back must not loop.
- S3 (Adm-F1): In `/admin`, back from an inner editor (PointWorkspace, CompanyPointEditor, RewardEditor, UserEditor, CompanyFields) returns to the previous list, not out of admin nor loop via `/`.
- S4 (C-F11): Signed-in citizen Profile shows "Configuraciones" (/settings) and "Qué recibimos" (/device-categories).
- S5 (C-F26): In `new-delivery.tsx`, a point with no categories shows an explanation and an "Elegir otro punto" action instead of a silently disabled "Generar código".

## Tasks

| ID | Specs | Route | Commit |
|---|---|---|---|
| T1 | S1 | delegated (context backstop) | e44b5d9 |
| T2 | S2 | delegated | 0b55ab5 |
| T3 | S3 | delegated | 6fc81d5 |
| T4 | S4 | delegated | 88aaa24 |
| T5 | S5 | delegated | HEAD (last commit) |

## Log

- L1: "necesito que uses ux heuristics e impeccable para revisar todo la app y darle sentido a lo que no y mejorar la experiencia, podes lanzar agentes con hydrogen" → model pro chosen; user approved block 1 with "arranca".
