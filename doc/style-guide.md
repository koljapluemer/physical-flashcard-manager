# Style Guide — Flashcard Manager CMS

## Design Principles

- **Flat and clean.** No gradients, no decorative shadows, no fancy backgrounds. This is an internal tool.
- **Consistent surfaces.** Everything lives on one of three surface levels: `--bg` (page), `--surface` (cards/panels), `--surface-muted` (inputs/subtle areas).
- **Print-safe.** The global stylesheet must never interfere with print card styling. All card/print CSS lives in `src/styles/cardPreview.css` and `src/styles/cardContent.css` — those files are off-limits.
- **No CSS framework.** We intentionally avoid Tailwind, Bootstrap, etc. to retain full control over print styles.

---

## Design Tokens

All tokens are CSS custom properties defined in `:root` in `src/style.css`.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#f5f7fa` | Page background |
| `--surface` | `#ffffff` | Cards, modals, navbar |
| `--surface-muted` | `#f8fafc` | Input backgrounds, subtle fills |
| `--surface-strong` | `#eef2f7` | Toggle off-state, strong fills |
| `--text` | `#142033` | Primary text |
| `--muted` | `#5f6d83` | Labels, secondary text, icons |
| `--border` | `#d7dfeb` | All borders |
| `--primary` | `#2156d9` | Primary actions, active states |
| `--primary-strong` | `#1b45ad` | Primary hover state |
| `--primary-soft` | `#eaf0ff` | Active button/tab backgrounds |
| `--danger` | `#c0383e` | Destructive actions |
| `--danger-soft` | `#fbecec` | Danger alert background |
| `--success` | `#1f7f48` | Success states |
| `--success-soft` | `#eaf8ef` | Success alert background |
| `--warning` | `#915f00` | Warning states |
| `--warning-soft` | `#fff5de` | Warning alert background |

### Shadows

| Token | Usage |
|-------|-------|
| `--shadow` | `0 8px 28px rgba(15,24,37,0.08)` — large cards |
| `--shadow-sm` | `0 2px 10px rgba(15,24,37,0.08)` — cards, panels |

### Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `12px` | Cards, modals, collapse panels |
| `--radius-sm` | `8px` | Buttons, inputs, alerts |

---

## Typography

- **Font stack:** `"IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif`
- **Mono stack:** `"JetBrains Mono", "Fira Code", "SFMono-Regular", Menlo, Consolas, monospace` (use `.font-mono`)
- **Base line-height:** `1.5`

| Class | Size |
|-------|------|
| `.text-xs` | 0.75rem |
| `.text-sm` | 0.875rem |
| *(base)* | 1rem |
| `.text-lg` | 1.125rem |
| `.text-xl` | 1.25rem |
| `.text-2xl` | 1.5rem |
| `.text-3xl` | 2rem |

Weight classes: `.font-medium` (500), `.font-semibold` (600)

---

## Layout

### App Shell

The app shell is a sticky navbar + scrollable main content area.

```html
<nav class="navbar">
  <RouterLink class="nav-brand" to="/">App Name</RouterLink>
  <div class="flex-none flex">
    <RouterLink class="nav-link" :class="{ 'nav-link-active': isActive }">Page</RouterLink>
  </div>
</nav>
<main class="py-6 px-4 sm:px-8">
  <div class="mx-auto w-full max-w-6xl">
    <!-- content -->
  </div>
</main>
```

- `.navbar` — 3rem tall, sticky, white background, bottom border
- `.nav-brand` — app title, right border separator, hover goes primary
- `.nav-link` — muted color, underline active state using `.nav-link-active`
- Main content max-width: `72rem` (`.max-w-6xl`)

### Spacing Scale

Based on 0.25rem increments. Key classes: `.gap-2` (0.5rem), `.gap-3` (0.75rem), `.gap-4` (1rem), `.gap-6` (1.5rem).

---

## Components

### Buttons

```html
<button class="btn">Default</button>
<button class="btn btn-primary">Primary</button>
<button class="btn btn-sm">Small</button>
<button class="btn btn-xs">Extra small</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-link">Link</button>
<button class="btn btn-error">Danger</button>
<button class="btn btn-active">Active state</button>
```

**Segmented group** (connected buttons, shared border):
```html
<div class="btn-group">
  <button class="btn" :class="{ 'btn-active': active === 'a' }">Option A</button>
  <button class="btn" :class="{ 'btn-active': active === 'b' }">Option B</button>
</div>
```

Button sizes: default, `.btn-sm`, `.btn-xs`. Square icon button: `.btn-square`.

### Form Controls

```html
<!-- Text input -->
<fieldset class="fieldset">
  <legend class="fieldset-legend">Label</legend>
  <input type="text" class="input input-bordered" />
</fieldset>

<!-- Select -->
<select class="select select-bordered">...</select>

<!-- Textarea -->
<textarea class="textarea textarea-bordered h-48 font-mono"></textarea>

<!-- Toggle switch (boolean / two-state) -->
<label class="flex items-center gap-3 cursor-pointer">
  <span class="label-text">Off label</span>
  <input type="checkbox" class="toggle" v-model="value" />
  <span class="label-text">On label</span>
</label>

<!-- Checkbox -->
<input type="checkbox" class="checkbox" />
```

### Tabs

Underline-style tabs for switching between content panels.

```html
<div role="tablist" class="tabs tabs-bordered mb-4">
  <button role="tab" class="tab" :class="{ 'tab-active': active === 'a' }" @click="active = 'a'">
    Tab A
  </button>
  <button role="tab" class="tab" :class="{ 'tab-active': active === 'b' }" @click="active = 'b'">
    Tab B
  </button>
</div>
<div v-show="active === 'a'">Panel A</div>
<div v-show="active === 'b'">Panel B</div>
```

### Cards

```html
<div class="card">
  <div class="card-body">
    <h2 class="card-title">Title</h2>
    content
  </div>
</div>
```

### Collapse Panels

Two variants are supported.

**Checkbox-driven** (used in collection detail panels):
```html
<div class="collapse collapse-arrow bg-base-100 shadow">
  <input type="checkbox" checked />
  <div class="collapse-title text-lg font-semibold">Section Title</div>
  <div class="collapse-content">
    <div><!-- wrap content in a div for the grid-height animation --></div>
  </div>
</div>
```
Starts open because `checked`. User can toggle. The arrow rotates on open/close.

**Native `<details>`** (used for inline tips/reference):
```html
<details class="collapse collapse-arrow bg-base-200">
  <summary class="collapse-title font-medium">Markdown Tips</summary>
  <div class="collapse-content">
    content
  </div>
</details>
```

### Modal

Uses the native HTML `<dialog>` element. Open with `.showModal()`, close with `close()`.

```html
<dialog ref="modalRef" class="modal" @close="onClose">
  <div class="modal-box">
    <div class="flex items-start justify-between gap-4">
      <h3 class="text-xl font-semibold">Modal Title</h3>
      <form method="dialog">
        <button class="btn btn-sm" type="submit">Close</button>
      </form>
    </div>
    <!-- content -->
  </div>
  <!-- Click-outside-to-close -->
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

Open: `modalRef.value.showModal()`. The `::backdrop` provides the dim overlay. `.modal-backdrop` is a transparent full-screen form that closes the dialog on click. `.modal-box` sits above it via `z-index: 1`.

### Alerts

```html
<div class="alert alert-info">Info message</div>
<div class="alert alert-error">Error message</div>
<div class="alert alert-success">Success message</div>
<div class="alert alert-warning">Warning message</div>
```

### Loading States

```html
<span class="loading loading-spinner"></span>
<span class="loading loading-spinner loading-xs"></span>
<span class="loading loading-dots"></span>
```

---

## Utility Classes

All utilities are hand-rolled in `src/style.css`. A representative list:

**Display/flex:** `.flex`, `.flex-1`, `.flex-col`, `.flex-wrap`, `.flex-none`, `.grid`, `.items-center`, `.items-start`, `.justify-between`, `.justify-center`, `.justify-end`

**Spacing:** `.gap-2/3/4/6`, `.p-2/3`, `.px-4`, `.py-2/6/8`, `.mt-1/3`, `.mb-2`, `.mr-2`, `.mx-auto`, `.space-y-2/3/4/5/6`

**Sizing:** `.w-full`, `.max-w-md/4xl/6xl`, `.min-h-screen`, `.h-48/12`, `.w-24/20/16/12`

**Typography:** `.text-xs/sm/lg/xl/2xl/3xl`, `.font-medium`, `.font-semibold`, `.font-mono`, `.text-center`, `.text-right`, `.capitalize`, `.whitespace-pre-wrap`

**Color:** `.text-base-content`, `.text-light`, `.text-primary`, `.text-error`, `.bg-base-100`, `.bg-base-200`

**Visual:** `.rounded`, `.rounded-lg`, `.border`, `.border-b`, `.shadow`, `.shadow-lg`, `.opacity-40`, `.transition`, `.z-50`

**Overflow:** `.overflow-x-auto`, `.overflow-y-auto`

**Responsive:** `.sm:flex-row`, `.sm:px-8`, `.md:grid-cols-2`, `.md:col-span-2`, `.lg:grid-cols-2`

---

## Print Styles

`src/styles/cardPreview.css` and `src/styles/cardContent.css` handle all flashcard print/preview rendering. **Do not modify these from the UI stylesheet.** They use isolated CSS variables scoped to the card component.

If you need a new CSS variable for card theming, add it to the CardPreview component's inline style bindings, not to `style.css`.

---

## Adding New Styles

1. **Prefer tokens over hardcoded values.** Always use `var(--border)`, `var(--radius-sm)`, etc.
2. **No gradients on UI chrome.** Gradients are reserved for actual content (flashcard headers) where user-controlled.
3. **No decorative backgrounds.** The page background is flat `--bg`. Don't add texture or gradients.
4. **Add utilities only if used 3+ places.** One-off layout needs go in the component as inline `style=""`.
5. **Add new component classes near related ones** — buttons near buttons, form controls near form controls.
6. **`color-mix()` is acceptable** for derived colors (border tints, muted text at opacity). It's supported in all modern browsers and this is an internal tool.
