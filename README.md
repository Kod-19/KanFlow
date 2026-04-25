# KanFlow - Modern Kanban Task Board

Responsive Kanban board built with vanilla HTML, CSS, and JavaScript.

## Live Demo

[https://kan-flow-ivory.vercel.app/](https://kan-flow-ivory.vercel.app/)

## Latest Updates

- Per-card `...` options menu with:
  - Edit Task
  - Set Due Time
  - Delete Task
- Task editing supports:
  - title (required)
  - description (optional)
  - due date/time (optional)
- Cards now show description and due time when available
- Local storage upgraded to structured task objects (with migration from old saved data)
- Touch drag-and-drop improved on smaller screens:
  - smoother movement
  - long-press drag
  - better scroll/drag handling
  - edge auto-scroll while dragging

## Core Features

- Three columns: To Do, In Progress, Done
- Drag and drop across columns (desktop + touch)
- Trash with restore to any column
- Progress bars and task counters
- Auto-save between sessions

## Run

Open `index.html` in any modern browser.

## Files

- `index.html` - app structure and modal
- `style.css` - responsive UI styles
- `script.js` - state, drag/drop, task actions, and persistence
