# Taskboard

A lightweight task manager built with plain HTML, CSS and JavaScript. No server, no build step, no dependencies. Tasks are saved in your browser's `localStorage`, so they survive page reloads.

**Live demo:** https://your-username.github.io/taskboard *(replace after deploying)*

## Features

- Create, read, update and delete tasks
- Categories: Work, Personal, Study, Other
- Optional due dates, with overdue highlighting
- Mark tasks complete with an animated tick and strike-through
- Filter by status (All, Active, Completed) and by category
- Live search
- Drag-and-drop reordering (desktop)
- Inline editing: double-click a title or press Edit
- Responsive layout with automatic light and dark themes
- Keyboard accessible, with reduced-motion support

## Files

```
taskboard/
├── index.html   # markup
├── style.css    # styles and themes
├── script.js    # state, localStorage, rendering, events
└── README.md
```

## How it works

- State lives in a `tasks` array of `{ id, title, category, due, done, created }` objects.
- `saveToLocalStorage()` runs after every change; `loadFromLocalStorage()` runs on startup.
- Rendering rebuilds the list from the array using DOM methods (`textContent`, not `innerHTML`), so task text can't inject markup.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy

**GitHub Pages:** push to a public repo, then Settings → Pages → Deploy from a branch → `main` / root.
**Vercel / Netlify:** import the repo, no build command, publish directory `.`.

## Known limitation

Drag-and-drop uses native HTML5 drag events, which most touch screens don't support.

## License

MIT