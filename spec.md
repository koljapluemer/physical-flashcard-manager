### MVP SPEC — Flashcards Frontend

#### 1. Purpose

Author, edit, and manage math flashcards grouped into collections. Store and sync data via Dexie Cloud. Support math editing, images, and printable PDF export via backend.

---

#### 2. Stack

* **Framework:** Vue 3 + TypeScript
* **Editor:** TipTap (with KaTeX + image plugin)
* **Storage & Auth:** Dexie + Dexie Cloud
* **Styling:** Bulma via CDN + custom CSS for flashcards
* **Deployment:** Netlify
* **Linting:** ESLint configured with a lint script (`npm run lint`)

---

#### 3. Environment Variables

| Variable                  | Description                      |
| ------------------------- | -------------------------------- |
| `VITE_DC_DATABASE_URL`    | Dexie Cloud database URL         |
| `VITE_DC_REQUIRE_AUTH`    | true to enforce Dexie Cloud auth |
| `VITE_SHARED_REALM_ID`    | Realm ID all users share         |
| `VITE_BACKEND_RENDER_URL` | PDF rendering backend endpoint   |

Make a .env.example file.

---

#### 4. Dexie Cloud Setup

* Configure Dexie with Cloud addon:

  ```ts
  db.cloud.configure({ databaseUrl: import.meta.env.VITE_DC_DATABASE_URL, requireAuth: true })
  ```
* Auth handled automatically (OTP via Dexie Cloud modal). **No login route needed.**
* `realmId` hardcoded in env; all CRUD assigns this ID to enforce shared workspace.
* Initial realm creation requires a Dexie Cloud account with proper write permissions. Admin runs the app once to establish the realm (Dexie creates realm automatically on first write).
  *Reference:* Dexie Cloud access control docs.

---

#### 5. Data Model

**collections**

```ts
{
  id: string,
  name: string,
  description?: string,
  realmId: string,
  createdAt: number,
  updatedAt: number
}
```

**flashcards**

```ts
{
  id: string,
  collectionId: string,
  frontHtml: string,
  backHtml: string,
  css?: string,
  images?: string[], // base64 or data URIs
  realmId: string,
  createdAt: number,
  updatedAt: number
}
```

Indexes:

* collections: `id, realmId, name`
* flashcards: `id, realmId, collectionId`

---

#### 6. CRUD Operations

**Collections:** Create, Read, Update, Delete (cascade delete flashcards).
**Flashcards:** Create, Read, Update, Delete.

All operations filter by `realmId`.
Sync with Dexie Cloud on app start and after CRUD.

---

#### 7. TipTap Editor

* Base: StarterKit + KaTeX extension for inline/block math.
* Image plugin: supports drag-drop and paste.

  * On paste/upload, auto-resize to **700px width** using a simple canvas utility.
* Content saved as HTML for both `frontHtml` and `backHtml`.

---

#### 8. Styling

* Bulma from CDN for layout/UI.
* Each flashcard may include optional custom CSS stored in `css`.
* Final PDF HTML includes that CSS inline.

---

#### 9. Export to PDF

* Generate HTML document combining:

  * Bulma minimal reset
  * Flashcard CSS
  * Card HTML content (front/back)
  * KaTeX styles
* Send full HTML to backend `/render` endpoint.

Backend format:

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -o math.pdf \
  -d '{
        "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>Math Test</title><script src=\"https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js\" async></script></head><body><h1>Quadratic Formula</h1><p>When <em>a</em> \u2260 0:</p><p>\\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\)</p><p>Example: if a = 1, b = -3, c = 2, then roots are 1 and 2.</p></body></html>"
      }'
```


---

#### 10. Vue Structure

* Routes:

  * `/collections` (list + create)
  * `/collections/:id` (cards list)
  * `/collections/:id/card/:cardId` (editor)
* No `/login` route — Dexie Cloud auth handles UI.

Pinia stores:

* `useAuthStore`: reads Dexie Cloud auth state.
* `useCollectionsStore`: CRUD for collections.
* `useCardsStore`: CRUD for flashcards, build HTML for export.

---

#### 11. Linting

Add ESLint:

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Minimal config in `.eslintrc.cjs`:

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2021: true }
}
```

Add script:

```json
"scripts": {
  "lint": "eslint src --ext .ts,.vue"
}
```