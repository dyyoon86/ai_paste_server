# PasteMotion — Design System

> Source of truth for the web app UI. The app (`src/app`, `src/components`) must
> follow these tokens. Tokens live in `tailwind.config.ts` (semantic colors,
> radius, font) and `src/app/globals.css` (CSS variables + base). Do not
> hardcode hex values in components — use the token classes.

## 1. Principles

1. **Studio, not toy.** This is a creator tool that outputs real video. The UI
   should feel like a focused production studio: calm neutral-dark canvas,
   elevated panels, one confident accent.
2. **Content is the hero.** The pasted spec, the analysis, and the preview are
   the stars. Chrome stays quiet — hairline borders, restrained text colors.
3. **One accent, used with intent.** Violet (`accent`) marks primary actions,
   selection, and live state. Everything else is neutral. Semantic colors
   (success/danger) appear only for status.
4. **Calm motion.** Transitions are short (120–200ms) and subtle. No bounce on
   chrome. Energy belongs in the rendered video, not the UI.
5. **Readable Korean + Latin.** System UI font stack (no web-font fetch at build)
   with Korean fallbacks so labels always render.

## 2. Color tokens

Dark theme only (matches the product's output bias). Hex → token name.

| Token | Hex | Use |
|-------|-----|-----|
| `canvas` | `#0B0B0F` | page background |
| `surface` | `#131319` | panels / cards |
| `inset` | `#0D0D12` | inputs, code, nested wells |
| `line` | `#24242F` | default hairline border |
| `line2` | `#2C2C3A` | stronger border / neutral button bg |
| `line3` | `#3A3A4A` | hover border / pressed neutral |
| `fg` | `#F2F2F6` | primary text |
| `fg2` | `#D7D7E2` | secondary emphasis text |
| `muted` | `#A6A6B6` | labels, secondary copy |
| `subtle` | `#76767F` | tertiary copy, meta |
| `faint` | `#5B5B68` | footnotes, disabled hints |
| `accent` | `#7C3AED` | primary actions, selection, live state |
| `accent-fg` | `#A78BFA` | accent text on dark |
| `accent-2` | `#22D3EE` | rare secondary highlight |
| `success` | `#34C759` | completed / safe |
| `danger` | `#FF453A` | errors / failures |
| `warning` | `#FFB020` | weak-hook / caution |

Accent `#7C3AED` intentionally matches the default render palette so the UI and
the produced video share a brand color.

## 3. Typography

- **Family:** system stack via `--font-sans`:
  `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Malgun Gothic",
  "Apple SD Gothic Neo", sans-serif`.
- **Scale (px):** display 30/800, h1 22/800, h2 16/700, body 14/450, small 12,
  micro 11. Line-height 1.1 for headings, 1.5 for body.
- **Tracking:** headings `-0.02em`. Eyebrow/kicker labels uppercase, `+0.12em`,
  11px, `subtle`.
- Numerals in analysis/scores may use `font-variant-numeric: tabular-nums`.

## 4. Spacing & radius

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40. Section gap 24.
- **Radius:** `sm` 10, `md` 14, `lg` 20 (cards), `xl` 28 (hero/paste box),
  `pill` 999.
- **Container:** max-width 1040px (`max-w-5xl`), horizontal padding 20px.
- **Panel padding:** 20px (cards), 16px (compact cards).

## 5. Components

- **Panel/Card:** `bg-surface`, `border border-line`, radius `lg`. Compact items
  inside use `bg-inset border-line`.
- **Primary button:** `bg-accent text-white`, radius `md`, weight 700, hover
  `brightness-110`, disabled `opacity-40`. Optional soft glow
  `shadow-[0_8px_30px_rgba(124,58,237,0.35)]` for the main CTA only.
- **Neutral button:** `bg-line2 text-fg2` hover `bg-line3`; or ghost
  `border border-line text-muted` hover `border-line3`.
- **Chip/Tag:** `border border-line2 text-muted`, radius `sm`, 11px.
- **Selected state:** `border-accent` + `bg-accent/10`.
- **Inputs/textarea:** `bg-inset border-line`, focus `border-accent`, mono 12px
  for the paste box.
- **Status bar:** track `bg-inset`, fill `bg-accent` (or `bg-danger` on fail).

## 6. Motion

- Hover/selection color: 150ms ease.
- Progress/width: 200ms ease.
- No transform bounce on chrome. The Remotion Player handles all media motion.

## 7. Backdrop

Subtle, single soft radial glow of `accent` at ~12% near the top, fading out, on
top of `canvas`. Keeps the page from feeling flat without competing with panels.
