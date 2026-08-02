/**
 * Input helpers for the shmup.
 *
 * Mouse control exists because this game leans on precision — hitboxScale,
 * the precisionRoute passive, and Nova's whole perk is a smaller hurtbox —
 * and a keyboard cannot express that. A cursor can.
 *
 * The important design choice is that the ship *follows* the cursor at its
 * own speed rather than snapping to it. True 1:1 positioning would never
 * consult shipSpeed, which would silently turn every ship's speed stat and
 * three skill nodes (Quick Thrusters, Afterburner, Ghost Step) into numbers
 * that display and do nothing. Capping the step keeps all of them live: a
 * fast ship sits under the cursor through a hard flick, a slow one trails
 * it and has to lead the shot.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * One frame of cursor-following movement.
 *
 * Moves from `from` toward `target`, travelling at most `speed * dt`. When
 * the remaining distance is under that budget it lands exactly on target,
 * so the ship settles instead of oscillating around the cursor.
 *
 * Returns the new position; bounds clamping is the caller's job because
 * only the sim knows the playfield.
 */
export function followStep(
  from: Vec2,
  target: Vec2,
  speed: number,
  deltaSeconds: number,
): Vec2 {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);

  // Already there (or a degenerate frame): hold position rather than
  // dividing by zero.
  const maxStep = Math.max(0, speed) * Math.max(0, deltaSeconds);
  if (distance <= 1e-6 || maxStep <= 0) return { x: from.x, y: from.y };

  if (distance <= maxStep) return { x: target.x, y: target.y };

  const scale = maxStep / distance;
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

/**
 * Convert a client-space pointer position into canvas space.
 *
 * The canvas backing store is sized independently of its CSS box, so a
 * raw clientX/clientY is wrong by the ratio between them — on a scaled
 * canvas the ship would track a cursor that is not where the player sees
 * it.
 */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
): Vec2 {
  // A zero-sized rect means the canvas is not laid out yet.
  const scaleX = rect.width > 0 ? canvasWidth / rect.width : 1;
  const scaleY = rect.height > 0 ? canvasHeight / rect.height : 1;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
