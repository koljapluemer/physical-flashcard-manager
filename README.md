# Physical Flashcard Manager

Vue 3 + Vite frontend for drafting, editing, and exporting math flashcards backed by Dexie Cloud.

## Project Setup

```bash
npm install
```

### Compile and Hot-Reload for Development

```bash
npm run dev
```

### Type-Check, Compile, and Minify for Production

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
| --- | --- |
| `VITE_DC_DATABASE_URL` | Dexie Cloud database URL |
| `VITE_DC_REQUIRE_AUTH` | `true` to require OTP auth (recommended) |
| `VITE_BACKEND_RENDER_URL` | PDF rendering endpoint |

## Dexie Cloud Realm Management

Head to the hidden `/settings` route to:

1. View sync status and account details.
2. Create realms and set the active workspace for the app.
3. Invite collaborators by email (with optional roles).

If no realms exist yet, the app automatically redirects to the settings page so you can create one before managing collections.

## Printing Support

The flashcard editor stores HTML (front/back), optional per-card CSS, and includes KaTeX for math rendering. When exporting to PDF the frontend sends fully composed HTML to `VITE_BACKEND_RENDER_URL` for rendering.
