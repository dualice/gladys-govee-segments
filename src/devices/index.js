// -----------------------------------------------------------------------------
// Device registry. Each device type lives in its own file and exposes:
//   - key                         : short identifier (used in logs)
//   - deviceExternalId(gladys)    : the device external_id (for dispatch)
//   - buildDevice(gladys, config) : the discovery payload sent to Gladys
//   - onSetValue(gladys, {...})   : run a user command
// -----------------------------------------------------------------------------

import { bar } from './bar.js';

export const DEVICE_BLUEPRINTS = [bar];

/** Build the discovery payload for Gladys (all devices). */
export function buildDiscoveredDevices(gladys, config) {
  return DEVICE_BLUEPRINTS.map((bp) => bp.buildDevice(gladys, config));
}

/** Find the blueprint that owns a device, from its external_id. */
export function findBlueprintByDevice(gladys, device) {
  return DEVICE_BLUEPRINTS.find((bp) => bp.deviceExternalId(gladys) === device.external_id);
}
