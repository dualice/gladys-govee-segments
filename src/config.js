// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user in Gladys from the `config_schema` of the manifest.
// This module provides the defaults and normalizes the received object, so the
// rest of the code never deals with `undefined`. The defaults MUST stay
// consistent with the `default` values of the manifest.
// -----------------------------------------------------------------------------

import { MAX_SEGMENTS } from './govee-lan.js';

export const DEFAULT_CONFIG = {
  device_name: 'Govee light bar',
  device_ip: '',
  segment_count: 12,
  segments_per_bar: 6,
};

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} raw config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const segments = Math.round(Number(raw.segment_count ?? DEFAULT_CONFIG.segment_count));
  const perBar = Math.round(Number(raw.segments_per_bar ?? DEFAULT_CONFIG.segments_per_bar));
  const count = Number.isFinite(segments)
    ? Math.max(1, Math.min(MAX_SEGMENTS, segments))
    : DEFAULT_CONFIG.segment_count;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    device_name: String(raw.device_name || DEFAULT_CONFIG.device_name).trim(),
    device_ip: String(raw.device_ip ?? '').trim(),
    // Config can arrive as strings from a form; keep the count in the range the
    // packet mask supports.
    segment_count: count,
    // Segments of one bar: at least 1, at most the whole light.
    segments_per_bar: Number.isFinite(perBar)
      ? Math.max(1, Math.min(count, perBar))
      : Math.min(count, DEFAULT_CONFIG.segments_per_bar),
  };
}
