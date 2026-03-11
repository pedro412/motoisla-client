# MotoIsla Admin — Design System

## Direction & Feel
Precision instrument panel for a motorcycle parts store. Dense, scannable, focused.
Like a workshop dashboard at night — neutral zinc surfaces with focused chrome-blue highlights.
Not warm, not playful. Operational, clear, trustworthy.

## Surfaces (elevation scale — neutral zinc)
- **Base (page):** `#09090b` — deepest zinc
- **Card (paper):** `#18181b` — card elevation
- **Elevated (menus/dialogs):** `#27272a` — dropdown and dialog surfaces

## Color Tokens
- **Accent:** `#38bdf8` (sky-400) — single action/selection color
- **Accent light:** `#7dd3fc` (sky-300) — labels, focus rings
- **Text primary:** `#fafafa` (zinc-50)
- **Text secondary:** `#a1a1aa` (zinc-400)
- **Text muted:** `#71717a` (zinc-500) — labels, nav inactive
- **Text disabled:** `#52525b` (zinc-600)
- **Border standard:** `rgba(161, 161, 170, 0.1)` — whisper-quiet separation
- **Border hover:** `rgba(161, 161, 170, 0.32)`
- **Border focus:** `rgba(56, 189, 248, 0.5)`
- **Success:** `#10b981` / light `#a7f3d0`
- **Warning:** `#f59e0b` / light `#fde68a`
- **Error:** `#ef4444` / light `#fecaca`

## Depth Strategy
**Borders only** — no decorative shadows. Borders are whisper-quiet (rgba, not solid hex).
Hover: background tint `rgba(56, 189, 248, 0.04–0.08)`.
Selected/active: background tint `rgba(56, 189, 248, 0.1)`.

## Typography
- **Font:** Inter via `--font-inter`
- **h4:** weight 800, tracking -0.02em
- **h5:** weight 700, tracking -0.01em
- **h6:** weight 700
- **overline:** weight 700, tracking 0.1em, 0.7rem — used for section labels
- **body1/2:** weight 400–500
- **button:** weight 600, textTransform none

## Spacing
MUI default 8px grid. Key: p: 2–3 for cards, p: 1 for lists.

## Border Radius
- **Buttons, inputs, list items:** 8px (`borderRadius: 8` inline)
- **Cards (Paper):** 10px (theme shape.borderRadius)
- **Chips:** 6px
- **Dialogs:** 10px

## Key Component Patterns

### Inputs (OutlinedInput)
- Background: `rgba(9, 9, 11, 0.45)` — inset feel (darker than card)
- Border: `rgba(161, 161, 170, 0.18)` at rest → `0.32` hover → `rgba(56,189,248,0.5)` focus
- Label: `#71717a` at rest → `#7dd3fc` focused
- No per-page sx needed — theme handles all

### Primary Button
- Solid: `#0ea5e9`, hover `#0284c7`
- Text color: `#09090b` (dark, not white)
- Subtle glow shadow on hover

### Navigation (Sidebar)
- Drawer bg: `#09090b` — **same as page** (unified)
- Border separator: `rgba(161, 161, 170, 0.08)`
- Inactive item: color `#71717a`, icon `#52525b`
- Hover: bg `rgba(161,161,170,0.07)`, color `#d4d4d8`
- Active: bg `rgba(56,189,248,0.1)`, color `#38bdf8`, icon `#38bdf8`

### AppBar (Topbar)
- `color="transparent"` + sx backgroundColor `rgba(9,9,11,0.85)`
- Backdrop blur 12px
- Border bottom `rgba(161,161,170,0.08)`

### Tables
- Head cell: bg `rgba(9,9,11,0.6)`, color `#71717a`, 0.7rem uppercase
- Row: color `#e4e4e7`, border `rgba(161,161,170,0.08)`
- Row hover: `rgba(56,189,248,0.04)` — use `hover` prop on TableRow

### Chips (semantic colors — applied via sx)
- Green (active/paid): bg `rgba(16,185,129,0.14)`, color `#a7f3d0`, border `rgba(16,185,129,0.22)`
- Amber (warning/pending): bg `rgba(245,158,11,0.14)`, color `#fde68a`
- Blue (info): bg `rgba(56,189,248,0.14)`, color `#bae6fd`
- Gray (neutral): bg `rgba(161,161,170,0.12)`, color `#d4d4d8`
- Red (error/inactive): bg `rgba(239,68,68,0.14)`, color `#fecaca`

### KpiCard pattern (pages)
```tsx
<Paper sx={{
  p: 2.25, height: "100%",
  border: `1px solid ${tone.border}`,
  background: `linear-gradient(180deg, rgba(9,9,11,0.98) 0%, ${tone.glow} 100%)`,
}}>
```

### Section Card pattern (pages)
```tsx
<Paper sx={{
  p: 2.5,
  border: "1px solid rgba(161, 161, 170, 0.14)",
  background: "linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(9,9,11,0.96) 100%)",
}}>
```

### Page Header pattern
```tsx
<Paper sx={{
  p: { xs: 2.25, md: 3 },
  border: "1px solid rgba(56, 189, 248, 0.14)",
  background: "radial-gradient(...), linear-gradient(135deg, ...)",
}}>
  <Typography variant="overline" sx={{ color: "#bae6fd" }}>Section label</Typography>
  <Typography variant="h4">Page Title</Typography>
  <Typography sx={{ color: "text.secondary" }}>Subtitle</Typography>
```

## Scrollbar
6px width, `rgba(161,161,170,0.18)` thumb, transparent track.

## What the theme handles automatically
TextField, Autocomplete dropdown, all Button variants, Chip font/radius,
Drawer background, ListItemButton states, TableHead/Cell, Alert borders,
Dialog surface, Divider, Checkbox, Skeleton, Tooltip.

## What requires per-component sx
- Chip semantic colors (PAID/PENDING/ACTIVE etc.)
- KpiCard tone borders and glow backgrounds
- Page header gradient backgrounds
- TableContainer outer border (when inside a card that already has a border, skip this)
