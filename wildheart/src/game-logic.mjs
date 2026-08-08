export const PLAYER_SPEED = 7.2;
export const PLAYER_TURN_SPEED = 1.8;
export const TURN_INPUT_DEADZONE = 0.18;
export const TURN_INPUT_RESPONSE = 1.4;
export const TURN_SMOOTHING_RESPONSE = 12;
export const DASH_SPEED = 18;
export const DASH_MIN_SPEED = 11;
export const DASH_ENERGY_MAX = 100;
export const DASH_ENERGY_DRAIN = 44;
export const DASH_ENERGY_RECOVERY = 24;
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

/** Dash preserves horizontal steering but always drives along the current facing. */
export function dashInput(input, dashing) {
  return dashing ? { x: input.x, y: 1 } : { x: input.x, y: input.y };
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

export function smoothInput(current, target, dt, response = TURN_SMOOTHING_RESPONSE) {
  const safeDt = Math.max(0, dt);
  const safeResponse = Math.max(0, response);
  if (safeDt === 0 || safeResponse === 0) return current;
  return current + (target - current) * (1 - Math.exp(-safeResponse * safeDt));
}

function applyTurnDeadzone(horizontalInput) {
  const magnitude = Math.abs(horizontalInput);
  if (magnitude <= TURN_INPUT_DEADZONE) return 0;
  const normalized = (magnitude - TURN_INPUT_DEADZONE) / (1 - TURN_INPUT_DEADZONE);
  return Math.sign(horizontalInput) * normalized ** TURN_INPUT_RESPONSE;
}

/**
 * Maps a horizontal control value into the turn basis seen by the follow camera.
 * With this camera behind the explorer, its screen-right axis is world -X at
 * heading zero, so screen-space horizontal input must be inverted before it
 * changes the world-space heading.
 */
export function turnInputFromScreenX(horizontalInput) {
  const easedInput = applyTurnDeadzone(horizontalInput);
  return easedInput === 0 ? 0 : -easedInput;
}

export function movementDelta(direction, speed, dt) {
  return {
    x: direction.x * speed * dt,
    z: direction.z * speed * dt,
  };
}

export function dashSpeedForEnergy(energy, maxEnergy = DASH_ENERGY_MAX) {
  const ratio = maxEnergy > 0 ? clamp(energy / maxEnergy, 0, 1) : 0;
  return DASH_MIN_SPEED + (DASH_SPEED - DASH_MIN_SPEED) * ratio;
}

export function updateDashEnergy(energy, dashHeld, dt, maxEnergy = DASH_ENERGY_MAX) {
  const change = (dashHeld ? -DASH_ENERGY_DRAIN : DASH_ENERGY_RECOVERY) * Math.max(0, dt);
  return clamp(energy + change, 0, maxEnergy);
}

export function speedForInput(dashing, normalSpeed = PLAYER_SPEED, dashEnergy = DASH_ENERGY_MAX) {
  return dashing ? dashSpeedForEnergy(dashEnergy) : normalSpeed;
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
