// -----------------------------------------------------------------------------
// Device: a Govee RGBIC light bar controlled over the local network.
//
// Features: power, brightness, whole-bar color, white temperature, plus one
// color feature per segment ("Left bar 1 (bottom)" ... , keyed segment-1 ... segment-N).
// -----------------------------------------------------------------------------

import {
  createLogger,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { intToRgb, lan } from '../govee-lan.js';
import { segmentLabel } from '../layout.js';

const DEVICE_TYPE = 'light-bar';

const logger = createLogger({ name: DEVICE_TYPE });

// One light bar per integration for now. This id is part of every external_id
// and must never change: Gladys keys the device, its history and the dashboards
// on it.
const PLATFORM_DEVICE_ID = 'bar';

const FEATURE = {
  POWER: 'power',
  BRIGHTNESS: 'brightness',
  COLOR: 'color',
  TEMPERATURE: 'temperature',
};

const SEGMENT_PREFIX = 'segment-';

// Govee white temperature range, in kelvin.
const MIN_KELVIN = 2000;
const MAX_KELVIN = 9000;

export const bar = {
  key: DEVICE_TYPE,

  deviceExternalId(gladys) {
    return gladys.externalIds(DEVICE_TYPE, PLATFORM_DEVICE_ID).device;
  },

  buildDevice(gladys, config) {
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_DEVICE_ID);
    const light = (name, key, type, extra = {}) => ({
      name,
      external_id: ids.feature(key),
      category: DEVICE_FEATURE_CATEGORIES.LIGHT,
      type,
      read_only: false,
      has_feedback: false,
      keep_history: false,
      ...extra,
    });
    const segments = Array.from({ length: config.segment_count }, (_, i) =>
      light(
        segmentLabel(i, config),
        `${SEGMENT_PREFIX}${i + 1}`,
        DEVICE_FEATURE_TYPES.LIGHT.COLOR,
        {
          min: 0,
          max: 16777215,
        },
      ),
    );
    return {
      name: config.device_name,
      external_id: ids.device,
      features: [
        light('Power', FEATURE.POWER, DEVICE_FEATURE_TYPES.LIGHT.BINARY, { min: 0, max: 1 }),
        light('Brightness', FEATURE.BRIGHTNESS, DEVICE_FEATURE_TYPES.LIGHT.BRIGHTNESS, {
          unit: DEVICE_FEATURE_UNITS.PERCENT,
          min: 0,
          max: 100,
        }),
        light('Color', FEATURE.COLOR, DEVICE_FEATURE_TYPES.LIGHT.COLOR, {
          min: 0,
          max: 16777215,
        }),
        light('Color temperature', FEATURE.TEMPERATURE, DEVICE_FEATURE_TYPES.LIGHT.TEMPERATURE, {
          unit: DEVICE_FEATURE_UNITS.KELVIN,
          min: MIN_KELVIN,
          max: MAX_KELVIN,
        }),
        ...segments,
      ],
    };
  },

  async onSetValue(gladys, { feature, value, config }) {
    if (!config.device_ip) {
      throw new Error('Set the light bar IP address in the integration configuration.');
    }
    const ip = config.device_ip;
    const ids = gladys.externalIds(DEVICE_TYPE, PLATFORM_DEVICE_ID);
    const id = feature.external_id;

    if (id === ids.feature(FEATURE.POWER)) {
      await lan.turn(ip, value === 1);
    } else if (id === ids.feature(FEATURE.BRIGHTNESS)) {
      logger.info(`Brightness -> ${value}%`);
      if (value <= 0) {
        await lan.turn(ip, false);
      } else {
        await lan.brightness(ip, value);
      }
    } else if (id === ids.feature(FEATURE.COLOR)) {
      await lan.color(ip, intToRgb(value), 0);
    } else if (id === ids.feature(FEATURE.TEMPERATURE)) {
      const kelvin = Math.max(MIN_KELVIN, Math.min(MAX_KELVIN, Math.round(value)));
      await lan.color(ip, { r: 0, g: 0, b: 0 }, kelvin);
    } else {
      const index = segmentIndex(ids, id, config.segment_count);
      if (index === null) {
        logger.warn(`Unknown feature: ${id}`);
        return;
      }
      logger.info(`Segment ${index + 1} -> #${Number(value).toString(16).padStart(6, '0')}`);
      const colors = new Array(config.segment_count).fill(null);
      colors[index] = intToRgb(value);
      await lan.segments(ip, colors);
    }
    // The light does not report back (see src/govee-lan.js): reflect the command.
    await gladys.publishState(id, value);
  },
};

/** Index (0-based) of the segment a feature external_id stands for, or null. */
function segmentIndex(ids, externalId, count) {
  for (let i = 0; i < count; i += 1) {
    if (externalId === ids.feature(`${SEGMENT_PREFIX}${i + 1}`)) {
      return i;
    }
  }
  return null;
}
