export const PLAYER_SPEED = 7.2;
export const PLAYER_TURN_SPEED = 3.8;
export const DASH_SPEED = 15;
export const DASH_HIT_RADIUS = 1.25;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeInput(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return { x: 0, y: 0 };
  const scale = Math.min(1, 1 / length);
  return { x: x * scale, y: y * scale };
}

/** Converts a screen-space input vector into world X/Z movement around a heading. */
export function screenToWorld(input, heading = 0) {
  const v = normalizeInput(input.x, input.y);
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  return {
    x: cos * v.x + sin * v.y,
    z: -sin * v.x + cos * v.y,
  };
}

export function cameraFollowOffset(heading, distance = 12, height = 7.2) {
  return {
    x: -Math.sin(heading) * distance,
    y: height,
    z: -Math.cos(heading) * distance,
  };
}

export function forwardForHeading(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

export function steerHeading(heading, turnInput, dt, turnSpeed = PLAYER_TURN_SPEED) {
  return heading + turnInput * turnSpeed * dt;
}

/**
 * Maps a horizontal control value into the turn basis seen by the follow camera.
 * With this camera behind the explorer, its screen-right axis is world -X at
 * heading zero, so screen-space horizontal input must be inverted before it
 * changes the world-space heading.
 */
export function turnInputFromScreenX(horizontalInput) {
  return -horizontalInput;
}

export function movementDelta(direction, speed, dt) {
  return {
    x: direction.x * speed * dt,
    z: direction.z * speed * dt,
  };
}

export function speedForInput(dashing, normalSpeed = PLAYER_SPEED) {
  return dashing ? DASH_SPEED : normalSpeed;
}

export function dashHitsTarget(start, end, target, radius = DASH_HIT_RADIUS) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const projection = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((target.x - start.x) * dx + (target.z - start.z) * dz) / lengthSquared))
    : 0;
  const closestX = start.x + dx * projection;
  const closestZ = start.z + dz * projection;
  return Math.hypot(target.x - closestX, target.z - closestZ) <= radius;
}

export function petWalkPhase(time, phase = 0, speed = 8) {
  return Math.sin(time * speed + phase);
}
