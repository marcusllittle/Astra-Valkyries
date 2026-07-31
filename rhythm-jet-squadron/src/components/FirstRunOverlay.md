# FirstRunOverlay — integration notes

`FirstRunOverlay` shows a 4-step onboarding modal on first visit, then never again (keyed to `localStorage.astra_first_run_done`).

## Wiring it in

Import and render it once at the App level, inside the Router but outside all Routes, so it appears on any starting route:

```tsx
// App.tsx — add import
import FirstRunOverlay from "./components/FirstRunOverlay";

// Inside the <div className="app-container"> block, add:
<FirstRunOverlay />
```

It renders `null` when the user has already dismissed it, so it is always safe to include.

## Resetting for testing

```js
localStorage.removeItem('astra_first_run_done')
```
