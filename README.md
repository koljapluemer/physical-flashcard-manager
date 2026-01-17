# Physical Flashcard Manager

Vue 3 + TypeScript web application for creating, editing, and exporting mathematical flashcards with rich text editing capabilities.

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Editor**: Plain textarea with markdown syntax
- **Math Rendering**: KaTeX (via remark-math + rehype-katex)
- **Styling**: Tailwind CSS + DaisyUI
- **Backend**: REST API (separate repository)
- **PDF Generation**: External rendering service

## Content Format

Flashcard content is stored as **Markdown**. The editor uses plain textareas for direct markdown input, and content is rendered to HTML for preview and PDF export.

### Supported Markdown Features

| Feature | Syntax | Example |
|---------|--------|---------|
| Bold | `**text**` | **bold** |
| Italic | `*text*` | *italic* |
| Headings | `### Heading` | Level 3 heading |
| Bullet list | `- item` | Unordered list |
| Numbered list | `1. item` | Ordered list |
| Images | `![alt](url)` | Inline images |
| Inline math | `$E = mc^2$` | Rendered via KaTeX |
| Colored box | ` ```box\ntext\n``` ` | Highlighted aside |

### Architecture

```
User types markdown in <textarea> → Stored as markdown
                                         ↓
Preview/PDF ← HTML ← markdownToHtml() ← Markdown
```

- **Editor**: Plain textarea for markdown input with collapsible help
- **Storage**: Plain markdown strings in `front`/`back` fields
- **Rendering**: Single `markdownToHtml()` pipeline handles all conversion:
  - Math: `$...$` → KaTeX HTML
  - Boxes: ` ```box ` → `<aside class="flashcard-box">`

## Setup

```bash
npm install
git submodule add git@github.com:koljapluemer/physical-flashcard-doc.git doc
```

- Create `.env` from `.env.example`

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint check
```

## Key Files

| File | Purpose |
|------|---------|
| `src/views/CardEditorView.vue` | Card editor with markdown textareas |
| `src/utils/markdownToHtml.ts` | Markdown → HTML conversion (math + boxes) |
| `src/components/CardPreview.vue` | Live preview with rendered markdown |
| `src/api/render.ts` | PDF export with markdown conversion |
