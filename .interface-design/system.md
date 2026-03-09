# MotoIsla Admin — Design System

## Direction & Feel
Precision instrument panel for a motorcycle parts store. Dense, scannable, focused.
Like a workshop dashboard at night — dark steel surfaces with focused chrome-blue highlights.
Not warm, not playful. Operational, clear, trustworthy.

## Surfaces (elevation scale — same blue-slate hue family)
- **Base (page):** `#0f172a` — deepest slate
- **Card (paper):** `#131d2e` — card elevation
- **Elevated (menus/dialogs):** `#1a2540` — dropdown and dialog surfaces

## Color Tokens
- **Accent:** `#38bdf8` (sky-400) — single action/selection color
- **Accent light:** `#7dd3fc` (sky-300) — labels, focus rings
- **Text primary:** `#f1f5f9` (slate-100)
- **Text secondary:** `#94a3b8` (slate-400)
- **Text muted:** `#64748b` (slate-500) — labels, nav inactive
- **Text disabled:** `#475569` (slate-600)
- **Border standard:** `rgba(148, 163, 184, 0.1)` — whisper-quiet separation
- **Border hover:** `rgba(148, 163, 184, 0.32)`
- **Border focus:** `rgba(56, 189, 248, 0.5)`
- **Success:** `#10b981` / light `#a7f3d0`
- **Warning:** `#f59e0b` / light `#fde68a`
- **Error:** `#ef4444` / light `#fecaca`

## Depth Strategy
**Borders only** — no decorative shadows. Borders are whisper-quiet (rgba, not solid hex).
Hover: background tint `rgba(56, 189, 248, 0.04–0.08)`.
Selected/active: background tint `rgba(56, 189, 248, 0.1)`.

## Typography
- **Font:** Roboto via `--font-roboto`
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
- Background: `rgba(11, 17, 32, 0.45)` — inset feel (darker than card)
- Border: `rgba(148, 163, 184, 0.18)` at rest → `0.32` hover → `rgba(56,189,248,0.5)` focus
- Label: `#64748b` at rest → `#7dd3fc` focused
- No per-page sx needed — theme handles all

### Primary Button
- Gradient: `linear-gradient(135deg, #0ea5e9 → #38bdf8)`
- Text color: `#0c1a2e` (dark, not white)
- Subtle glow shadow on hover

### Navigation (Sidebar)
- Drawer bg: `#0f172a` — **same as page** (unified)
- Border separator: `rgba(148, 163, 184, 0.08)`
- Inactive item: color `#64748b`, icon `#475569`
- Hover: bg `rgba(148,163,184,0.07)`, color `#cbd5e1`
- Active: bg `rgba(56,189,248,0.1)`, color `#38bdf8`, icon `#38bdf8`

### AppBar (Topbar)
- `color="transparent"` + sx backgroundColor `rgba(15,23,42,0.85)`
- Backdrop blur 12px
- Border bottom `rgba(148,163,184,0.08)`

### Tables
- Head cell: bg `rgba(15,23,42,0.6)`, color `#64748b`, 0.7rem uppercase
- Row: color `#e2e8f0`, border `rgba(148,163,184,0.08)`
- Row hover: `rgba(56,189,248,0.04)` — use `hover` prop on TableRow

### Chips (semantic colors — applied via sx)
- Green (active/paid): bg `rgba(16,185,129,0.14)`, color `#a7f3d0`, border `rgba(16,185,129,0.22)`
- Amber (warning/pending): bg `rgba(245,158,11,0.14)`, color `#fde68a`
- Blue (info): bg `rgba(56,189,248,0.14)`, color `#bae6fd`
- Gray (neutral): bg `rgba(148,163,184,0.12)`, color `#cbd5e1`
- Red (error/inactive): bg `rgba(239,68,68,0.14)`, color `#fecaca`

### KpiCard pattern (pages)
```tsx
<Paper sx={{
  p: 2.25, height: "100%",
  border: `1px solid ${tone.border}`,
  background: `linear-gradient(180deg, rgba(15,23,42,0.98) 0%, ${tone.glow} 100%)`,
}}>
```

### Section Card pattern (pages)
```tsx
<Paper sx={{
  p: 2.5,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(15,23,42,0.96) 100%)",
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
6px width, `rgba(148,163,184,0.18)` thumb, transparent track.

## What the theme handles automatically
TextField, Autocomplete dropdown, all Button variants, Chip font/radius,
Drawer background, ListItemButton states, TableHead/Cell, Alert borders,
Dialog surface, Divider, Checkbox, Skeleton, Tooltip.

## What requires per-component sx
- Chip semantic colors (PAID/PENDING/ACTIVE etc.)
- KpiCard tone borders and glow backgrounds
- Page header gradient backgrounds
- TableContainer outer border (when inside a card that already has a border, skip this)
