# Physical Flashcard Manager

Vue 3 + TypeScript web application for creating, editing, and exporting mathematical flashcards with rich text editing capabilities.

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Rich Text Editor**: TipTap with custom math extension
- **Math Rendering**: KaTeX
- **Styling**: Tailwind CSS+ DaisyUI
- **Backend**: REST API (separate repository)
- **PDF Generation**: External rendering service

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

- (should run via `just` in backend)
- don't forget to create `.env` from `.env.example` on setup 