# 04 — UI & Theme

## Direction (Q16, Q17)

- **Dual light + dark**, both first-class and intentional — not just inverted colors.
- Clean, modern, "smooth tech" aesthetic: generous whitespace, subtle borders, layered
  surfaces, a restrained purple accent used sparingly, smooth micro-animations (hover,
  fade/slide between sections). Linear / Vercel-style polish.
- **Keep it simple and match the existing design language** (don't over-design).
- **Simpler than Sprout** for job detail: 2-pane not 3-pane (Q25).

## Mechanics (Q17 = next-themes, OS default + toggle) — ✅ Phase 1 done

- **`next-themes`** installed; `ThemeProvider` in `app/layout.tsx`.
- `defaultTheme="system"`, `enableSystem`, manual toggle in sidebar.
- Hand-tuned light + dark CSS variables in `app/globals.css` (`:root` + `.dark`).

## Token map

| Token | Usage |
|-------|--------|
| `bg-background` | Page background |
| `bg-card` | Sidebar, cards, panels |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text |
| `border-border` | Dividers, card borders |
| `bg-brand-purple` | Logo, active nav, accents |
| `bg-brand-green` | Success, tailor CTA |

## Migration status

| Area | Status |
|------|--------|
| `globals.css` dual tokens | ✅ |
| Dashboard layout | ✅ `bg-background` |
| Sidebar + MobileNav | ✅ `bg-card` |
| Auth pages | ✅ |
| Profile workspace | ✅ |
| Theme toggle | ✅ |
| Dashboard home cards | 🟡 some `text-white` hardcoded |
| Job detail (not built) | ⬜ build themed from start |
| Document panel (not built) | ⬜ build themed from start |

## Sequencing (Q18)

- **Phase 1:** ✅ tokens + ThemeProvider + toggle
- **During Phases 2–5:** new screens use semantic tokens only — no new `navy-*` or raw hex
- **Final pass:** deep per-page polish, micro-animations, cross-theme QA

## Micro-animations (final pass)

- Section transitions in profile nav
- Score counter animate-in
- Badge count pulse on new notification
- Version switch fade in document panel
- Sidebar accordion smooth open (job detail)

## Gotchas

- lucide-react is **v1** — verify every icon name before importing (`Github`/`Linkedin` missing; use `Code2`/`Link2`). `Sun`/`Moon` work for toggle.
- Test both themes on: dashboard/tracker, profile, tailor, job detail, auth.
- Sprout uses blue accent cards for credentials — we can use `bg-primary/5 border-primary/20` or a dedicated `credentials` surface token if needed.

## Screen specs

Full layout specs: **`10-screens-and-ia.md`**
