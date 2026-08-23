import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { findActiveGamepad, type GamepadLike } from "../lib/gamepadInput";
import {
  EMPTY_UI_GAMEPAD_INPUT,
  findDirectionalTarget,
  readUiGamepad,
  type UiGamepadInput,
  type UiNavigationDirection,
} from "../lib/uiGamepadNavigation";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "[role='button'][tabindex]:not([aria-disabled='true'])",
].join(",");
const GAMEPLAY_OVERLAY_SELECTOR = ".tutorial-overlay, .pause-overlay, .mobile-play-gate";
const MODAL_SELECTOR = "[aria-modal='true'], .gacha-results-overlay, .card-preview-overlay";
const INITIAL_REPEAT_DELAY_MS = 340;
const REPEAT_INTERVAL_MS = 115;

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none"
    && style.visibility !== "hidden"
    && Number(style.opacity) > 0
    && rect.width > 1
    && rect.height > 1;
}

function focusableElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

function preferredElement(elements: HTMLElement[]): HTMLElement | null {
  return elements.find((element) => element.dataset.gamepadDefault === "true")
    ?? elements.find((element) => element.matches(".retro-menu-item.active"))
    ?? elements.find((element) => element.matches("[aria-selected='true'], [aria-pressed='true'], .selected, .active"))
    ?? elements[0]
    ?? null;
}

function focusElement(element: HTMLElement): void {
  element.focus({ preventScroll: true });
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
}

function adjustRange(input: HTMLInputElement, direction: UiNavigationDirection): boolean {
  if (input.type !== "range" || (direction !== "left" && direction !== "right")) return false;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = input.step === "any" ? (max - min) / 20 : Number(input.step || 1);
  const next = Math.max(min, Math.min(max, Number(input.value) + (direction === "right" ? step : -step)));
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, String(next));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function moveFocus(direction: UiNavigationDirection): void {
  const elements = focusableElements();
  if (elements.length === 0) return;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let currentIndex = active ? elements.indexOf(active) : -1;
  if (currentIndex < 0) {
    const preferred = preferredElement(elements);
    if (!preferred) return;
    currentIndex = elements.indexOf(preferred);
  }
  if (active instanceof HTMLInputElement && adjustRange(active, direction)) return;

  const rects = elements.map((element) => element.getBoundingClientRect());
  const nextIndex = findDirectionalTarget(rects, currentIndex, direction);
  if (nextIndex !== null) focusElement(elements[nextIndex]);
}

function activateFocusedElement(): void {
  const elements = focusableElements();
  if (elements.length === 0) return;
  const active = document.activeElement instanceof HTMLElement && elements.includes(document.activeElement)
    ? document.activeElement
    : preferredElement(elements);
  if (!active) return;
  if (document.activeElement !== active) focusElement(active);
  active.click();
}

function closeTopModal(): boolean {
  const modal = document.querySelector<HTMLElement>(MODAL_SELECTOR);
  if (!modal) return false;
  const buttons = Array.from(modal.querySelectorAll<HTMLButtonElement>("button:not([disabled])")).filter(isVisible);
  const closeButton = buttons.find((button) => /close|back|cancel|done|ok/i.test(
    `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`,
  ));
  if (closeButton) closeButton.click();
  else window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  return true;
}

function activateBackControl(): boolean {
  const backControl = focusableElements().find((element) => (
    element.dataset.gamepadBack === "true"
    || element.matches(".btn-back")
    || /^\s*←/.test(element.textContent ?? "")
  ));
  if (!backControl) return false;
  backControl.click();
  return true;
}

function pressedOnEdge(next: boolean, previous: boolean): boolean {
  return next && !previous;
}

export default function GamepadNavigationLayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  useLayoutEffect(() => {
    pathnameRef.current = location.pathname;
    navigateRef.current = navigate;
  }, [location.pathname, navigate]);

  useEffect(() => {
    let animationFrame = 0;
    let preferredPadIndex: number | null = null;
    let previous: UiGamepadInput = { ...EMPTY_UI_GAMEPAD_INPUT };
    let heldDirection: UiNavigationDirection | null = null;
    let nextRepeatAt = 0;
    let gamepadMode = false;

    const setGamepadMode = (active: boolean) => {
      gamepadMode = active;
      document.body.classList.toggle("gamepad-navigation-active", active);
    };

    const leaveGamepadMode = () => setGamepadMode(false);
    const leaveGamepadModeForKeyboard = (event: KeyboardEvent) => {
      if (event.isTrusted) leaveGamepadMode();
    };

    const tick = (now: number) => {
      const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
      const gamepad = findActiveGamepad(
        pads as unknown as ArrayLike<GamepadLike | null>,
        preferredPadIndex,
      );
      preferredPadIndex = gamepad?.index ?? null;
      const next = readUiGamepad(gamepad);
      const pathname = pathnameRef.current;
      const overlayActive = Boolean(document.querySelector(GAMEPLAY_OVERLAY_SELECTOR));
      const gameplayOwnsInput = pathname === "/shmup" && !overlayActive;

      const confirmEdge = pressedOnEdge(next.confirmPressed, previous.confirmPressed);
      const backEdge = pressedOnEdge(next.backPressed, previous.backPressed);
      const startEdge = pressedOnEdge(next.startPressed, previous.startPressed);
      const hasAction = confirmEdge || backEdge || startEdge || next.direction !== null;
      if (hasAction && !gameplayOwnsInput) setGamepadMode(true);
      if (gameplayOwnsInput && gamepadMode) setGamepadMode(false);
      if (!next.connected && gamepadMode) setGamepadMode(false);

      if (!gameplayOwnsInput) {
        if (pathname === "/video-cutscene") {
          if (confirmEdge) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
          if (backEdge || startEdge) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        } else if (pathname === "/" && !document.querySelector(".home-menu-phase")) {
          if (confirmEdge || startEdge) document.querySelector<HTMLElement>(".home-screen")?.click();
        } else {
          if (next.direction) {
            const shouldMove = next.direction !== heldDirection || now >= nextRepeatAt;
            if (shouldMove) {
              moveFocus(next.direction);
              nextRepeatAt = now + (next.direction === heldDirection ? REPEAT_INTERVAL_MS : INITIAL_REPEAT_DELAY_MS);
            }
          }
          if (confirmEdge) activateFocusedElement();
          if (backEdge) {
            if (pathname === "/shmup") {
              document.querySelector<HTMLElement>(".pause-actions .pause-btn")?.click();
            } else if (closeTopModal()) {
              // Modal owns the back action.
            } else if (activateBackControl()) {
              // The screen's explicit back route is safer than browser history.
            } else if (pathname !== "/") {
              navigateRef.current(-1);
            }
          }
        }
      }

      heldDirection = next.direction;
      if (!next.direction) nextRepeatAt = 0;
      previous = next;
      animationFrame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointerdown", leaveGamepadMode, true);
    window.addEventListener("keydown", leaveGamepadModeForKeyboard, true);
    animationFrame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointerdown", leaveGamepadMode, true);
      window.removeEventListener("keydown", leaveGamepadModeForKeyboard, true);
      document.body.classList.remove("gamepad-navigation-active");
    };
  }, []);

  return null;
}
