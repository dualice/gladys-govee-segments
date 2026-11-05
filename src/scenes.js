// -----------------------------------------------------------------------------
// Scene actions (Gladys 5.1+). Declared in the manifest `scene_actions`, handled
// here by key. A scene action that throws fails THIS action only.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { gradient, lan, parseHexColor } from './govee-lan.js';
import { repeatPerBar } from './layout.js';

const logger = createLogger({ name: 'scenes' });

function readColors(config, fields) {
  if (!config.device_ip) {
    throw new Error('Set the light bar IP address in the integration configuration.');
  }
  const from = parseHexColor(fields.from);
  const to = parseHexColor(fields.to);
  if (!from || !to) {
    throw new Error('Colors must look like #ff8800.');
  }
  return { from, to };
}

export const SCENE_ACTIONS = {
  // Paint the same gradient on every bar, bottom to top.
  async set_gradient(gladys, { fields, config }) {
    const { from, to } = readColors(config, fields);
    logger.info(`Scene action set_gradient <- ${fields.from} -> ${fields.to}`);
    const colors = repeatPerBar(gradient(from, to, config.segments_per_bar), config);
    await lan.segments(config.device_ip, colors);
    return { segments: config.segment_count };
  },

  // Paint one gradient across all the segments, as if the bars were one.
  async set_gradient_across(gladys, { fields, config }) {
    const { from, to } = readColors(config, fields);
    logger.info(`Scene action set_gradient_across <- ${fields.from} -> ${fields.to}`);
    await lan.segments(config.device_ip, gradient(from, to, config.segment_count));
    return { segments: config.segment_count };
  },
};
