# Physical Flashcard Manager

Vue 3 + TypeScript web application for creating, editing, and exporting mathematical flashcards with rich text editing capabilities.

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Rich Text Editor**: TipTap with custom math extension
- **Math Rendering**: KaTeX
- **Styling**: Tailwind CSS 4 + DaisyUI
- **Backend**: REST API (separate repository)
- **PDF Generation**: External rendering service

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

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | REST API backend base URL | `http://localhost:8000/api` |
| `VITE_BACKEND_RENDER_URL` | PDF rendering service endpoint | `http://localhost:3000` |

## Features

### Authentication
- Email/password login with token-based authentication
- Session tokens stored in sessionStorage
- Protected routes with automatic redirect to login

### Collections Management
- Create, edit, and delete flashcard collections
- Each collection has a title and optional description
- View all cards in a collection
- Export entire collections to PDF

### Flashcard Editor
- Rich text editing with TipTap for both front and back of cards
- **Math Support**: Insert inline and block LaTeX equations with live KaTeX preview
  - Click existing equations to edit them
  - Interactive modal with syntax validation
- **Image Support**: Drag-drop or paste images into cards
  - Automatically resized to 700px width
  - Stored as data URLs
- **Formatting Options**: Bold, italic, bullet lists, numbered lists, headings
- Split-screen editor with live preview

### PDF Export
- Export collections to PDF for printing
- Customizable card dimensions (width/height in millimeters)
- Defaults to business card size (89mm × 51mm)
- Includes proper KaTeX styling for math rendering

### Settings
- Configure card dimensions for preview and export
- Settings persist to localStorage

## Architecture

The application uses a three-tier architecture:

1. **Vue 3 Frontend** (this repository)
   - Single-page application with client-side routing
   - Communicates with backend via REST API
   - Handles rich text editing and real-time preview

2. **REST API Backend** (separate repository)
   - User authentication and authorization
   - Flashcard and collection data persistence
   - Django REST Framework with token authentication

3. **PDF Rendering Service** (separate service)
   - Converts HTML to PDF with custom page sizes
   - Supports KaTeX math rendering
   - Receives structured JSON with page HTML and dimensions