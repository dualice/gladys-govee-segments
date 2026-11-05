// -----------------------------------------------------------------------------
// Scene actions (Gladys 5.1+). Declared in the manifest `scene_actions`, handled
// here by key. A scene action that throws fails THIS action only.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { gradient, lan, parseHexColor } from './govee-lan.js';

const logger = createLogger({ name: 'scenes' });

export const SCENE_ACTIONS = {
  // Paint a straight gradient from one color to another along the bar.
  async set_gradient(gladys, { fields, config }) {
    if (!config.device_ip) {
      throw new Error('Set the light bar IP address in the integration configuration.');
    }
    const from = parseHexColor(fields.from);
    const to = parseHexColor(fields.to);
    if (!from || !to) {
      throw new Error('Colors must look like #ff8800.');
    }
    logger.info(`Scene action set_gradient <- ${fields.from} -> ${fields.to}`);
    await lan.segments(config.device_ip, gradient(from, to, config.segment_count));
    return { segments: config.segment_count };
  },
};
