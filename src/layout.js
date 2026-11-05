// -----------------------------------------------------------------------------
// Physical layout of the light: segments are numbered bar by bar, each bar
// from bottom to top (verified on the H6056: 1-6 left bar, 7-12 right bar).
// -----------------------------------------------------------------------------

/** How many bars the segments are split into. */
export function barCount(config) {
  return Math.ceil(config.segment_count / config.segments_per_bar);
}

/** Human name of a segment (0-based index), e.g. "Left bar 1 (bottom)". */
export function segmentLabel(index, config) {
  const perBar = config.segments_per_bar;
  const bars = barCount(config);
  const bar = Math.floor(index / perBar);
  const inBar = (index % perBar) + 1;
  let barName = `Bar ${bar + 1}`;
  if (bars === 1) barName = 'Segment';
  if (bars === 2) barName = ['Left bar', 'Right bar'][bar];
  const barLength = Math.min(perBar, config.segment_count - bar * perBar);
  let position = '';
  if (barLength > 1 && inBar === 1) position = ' (bottom)';
  if (barLength > 1 && inBar === barLength) position = ' (top)';
  return `${barName} ${inBar}${position}`;
}

/** Repeat one bar's colors on every bar, for the whole light. */
export function repeatPerBar(barColors, config) {
  const all = [];
  for (let bar = 0; bar < barCount(config); bar += 1) all.push(...barColors);
  return all.slice(0, config.segment_count);
}
