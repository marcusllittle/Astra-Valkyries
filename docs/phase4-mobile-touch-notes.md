# Phase 4 — Mobile Touch Ergonomics Notes

The following CSS additions improve touch UX on real devices. Add them to `rhythm-jet-squadron/src/index.css` (or a dedicated `mobile.css` imported in `main.tsx`).

## Recommended additions

```css
/* Prevent callout/selection on long-press for game UI */
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* Prevent double-tap zoom on buttons and interactive elements */
button, a, [role="button"] {
  touch-action: manipulation;
}

/* Prevent rubber-band scroll on the game canvas wrapper */
.app-container {
  overscroll-behavior: none;
}

/* Safe area insets for devices with notches / home bars */
.app-container {
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-top: env(safe-area-inset-top, 0);
}

/* Joystick hit targets — minimum 44×44px for thumb reach */
.joystick-zone,
.fire-button {
  min-width: 44px;
  min-height: 44px;
}

/* Prevent text cursor on game canvas */
canvas {
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
}
```

## Capacitor viewport meta (capacitor.config.ts)

Ensure `allowNavigation` and viewport settings are correct for mobile:

```json
{
  "plugins": {
    "Keyboard": {
      "resize": "body",
      "resizeOnFullScreen": true
    },
    "StatusBar": {
      "backgroundColor": "#0d1117",
      "style": "DARK"
    }
  }
}
```

## Testing checklist

- [ ] No callout popup on long-press of game buttons
- [ ] No rubber-band scroll in portrait and landscape
- [ ] Double-tap does not zoom the game viewport
- [ ] Joystick and fire button register reliably without 300ms delay
- [ ] UI not clipped behind notch / home indicator on iPhone
- [ ] UI not clipped behind status bar / nav bar on Android
