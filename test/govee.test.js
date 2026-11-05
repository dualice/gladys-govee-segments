import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  gradient,
  intToRgb,
  lan,
  parseHexColor,
  rgbToInt,
  segmentPacket,
  setTransport,
} from '../src/govee-lan.js';
import { normalizeConfig } from '../src/config.js';
import { bar } from '../src/devices/bar.js';
import { buildDiscoveredDevices, findBlueprintByDevice } from '../src/devices/index.js';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { barCount, repeatPerBar, segmentLabel } from '../src/layout.js';

const sent = [];
setTransport(async (ip, message) => {
  sent.push({ ip, message });
});
afterEach(() => {
  sent.length = 0;
});

const config = normalizeConfig({
  device_ip: '192.168.1.237',
  segment_count: 4,
  segments_per_bar: 2,
});

async function setup() {
  const gladys = createFakeGladys();
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
  const [device] = gladys.fake.discoveredDevices;
  const feature = (name) => device.features.find((f) => f.name === name);
  return { gladys, device, feature };
}

// Run the device's command handler, as index.js does for onSetValue.
function setValue(gladys, feature, value) {
  return bar.onSetValue(gladys, { feature, value, config });
}

test('segment packet matches the packet verified on the H6056', () => {
  // Segment 1 red: 33 05 15 01 ff 00 00 00 00 00 00 00 01 00 ... checksum 0xdc
  // (XOR of the 19 bytes before it).
  const bytes = Buffer.from(segmentPacket({ r: 255, g: 0, b: 0 }, 0b1), 'base64');
  assert.equal(bytes.length, 20);
  assert.deepEqual([...bytes.subarray(0, 7)], [0x33, 0x05, 0x15, 0x01, 255, 0, 0]);
  assert.equal(bytes[12], 1);
  assert.equal(bytes[19], 0xdc);
});

test('mask spans two bytes for segments 9 and up', () => {
  const bytes = Buffer.from(segmentPacket({ r: 1, g: 2, b: 3 }, 1 << 9), 'base64');
  assert.equal(bytes[12], 0);
  assert.equal(bytes[13], 2);
});

test('color helpers round-trip', () => {
  assert.deepEqual(intToRgb(0xff8800), { r: 255, g: 136, b: 0 });
  assert.equal(rgbToInt({ r: 255, g: 136, b: 0 }), 0xff8800);
  assert.deepEqual(parseHexColor('#f80'), { r: 255, g: 136, b: 0 });
  assert.equal(parseHexColor('nope'), null);
});

test('segments sharing a color share a packet', async () => {
  const red = { r: 255, g: 0, b: 0 };
  await lan.segments('1.2.3.4', [red, null, red, { r: 0, g: 0, b: 255 }]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].message.msg.data.command.length, 2);
});

test('gradient hits both ends', () => {
  const colors = gradient({ r: 0, g: 0, b: 0 }, { r: 200, g: 100, b: 50 }, 5);
  assert.deepEqual(colors[0], { r: 0, g: 0, b: 0 });
  assert.deepEqual(colors[4], { r: 200, g: 100, b: 50 });
  assert.equal(colors.length, 5);
});

test('Gladys accepts the discovery payload and lists one color per segment', async () => {
  const { device } = await setup();
  const segments = device.features.filter((f) => f.external_id.includes('segment-'));
  assert.equal(segments.length, 4);
});

test('a segment color command reaches the light and is reflected', async () => {
  const { gladys, feature } = await setup();
  const target = feature('Left bar 2 (top)');
  await setValue(gladys, target, 0x00ff00);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].ip, '192.168.1.237');
  assert.equal(sent[0].message.msg.cmd, 'ptReal');
  // Segment 2 only: bit 1 of the mask, green.
  const packet = Buffer.from(sent[0].message.msg.data.command[0], 'base64');
  assert.deepEqual([...packet.subarray(4, 7)], [0, 255, 0]);
  assert.equal(packet[12], 0b10);
  assert.equal(gladys.fake.lastState(target.external_id), 0x00ff00);
});

test('power, brightness and white temperature use the standard commands', async () => {
  const { gladys, feature } = await setup();
  await setValue(gladys, feature('Power'), 0);
  await setValue(gladys, feature('Brightness'), 40);
  await setValue(gladys, feature('Color temperature'), 2700);
  assert.deepEqual(
    sent.map((s) => s.message.msg.cmd),
    ['turn', 'brightness', 'colorwc'],
  );
  assert.equal(sent[2].message.msg.data.colorTemInKelvin, 2700);
});

test('brightness 0 turns the light off instead of sending 0', async () => {
  const { gladys, feature } = await setup();
  await setValue(gladys, feature('Brightness'), 0);
  assert.equal(sent[0].message.msg.cmd, 'turn');
  assert.equal(sent[0].message.msg.data.value, 0);
});

test('commands fail clearly when the IP address is not set', async () => {
  const { gladys, feature } = await setup();
  await assert.rejects(
    bar.onSetValue(gladys, {
      feature: feature('Power'),
      value: 1,
      config: normalizeConfig({}),
    }),
    /IP address/,
  );
});

test('the registry finds the bar from its external_id', () => {
  const gladys = createFakeGladys();
  const device = { external_id: gladys.externalIds('light-bar', 'bar').device };
  assert.equal(findBlueprintByDevice(gladys, device), bar);
});

test('set_gradient paints every segment', async () => {
  const gladys = createFakeGladys();
  const out = await SCENE_ACTIONS.set_gradient(gladys, {
    fields: { from: '#ff0000', to: '#0000ff' },
    config,
  });
  assert.deepEqual(out, { segments: 4 });
  assert.equal(sent[0].message.msg.data.command.length, 2);
  await assert.rejects(
    SCENE_ACTIONS.set_gradient(gladys, { fields: { from: 'red', to: '#0000ff' }, config }),
    /#ff8800/,
  );
});

test('segments are named by bar and position', () => {
  const h6056 = normalizeConfig({ segment_count: 12, segments_per_bar: 6 });
  assert.equal(barCount(h6056), 2);
  assert.equal(segmentLabel(0, h6056), 'Left bar 1 (bottom)');
  assert.equal(segmentLabel(2, h6056), 'Left bar 3');
  assert.equal(segmentLabel(5, h6056), 'Left bar 6 (top)');
  assert.equal(segmentLabel(6, h6056), 'Right bar 1 (bottom)');
  assert.equal(segmentLabel(11, h6056), 'Right bar 6 (top)');
  assert.equal(
    segmentLabel(0, normalizeConfig({ segment_count: 9, segments_per_bar: 3 })),
    'Bar 1 1 (bottom)',
  );
  assert.equal(
    segmentLabel(0, normalizeConfig({ segment_count: 1, segments_per_bar: 1 })),
    'Segment 1',
  );
});

test('discovered features carry the positional names', async () => {
  const { device } = await setup();
  const names = device.features.filter((f) => f.name.includes('bar')).map((f) => f.name);
  assert.deepEqual(names, [
    'Left bar 1 (bottom)',
    'Left bar 2 (top)',
    'Right bar 1 (bottom)',
    'Right bar 2 (top)',
  ]);
});

test('repeatPerBar copies one bar on every bar', () => {
  assert.deepEqual(repeatPerBar([1, 2], config), [1, 2, 1, 2]);
});

test('set_gradient repeats the gradient on each bar, bottom to top', async () => {
  const gladys = createFakeGladys();
  await SCENE_ACTIONS.set_gradient(gladys, {
    fields: { from: '#ff0000', to: '#0000ff' },
    config,
  });
  // 4 segments, 2 per bar: red/blue on each bar -> 2 distinct colors -> 2 packets.
  const commands = sent[0].message.msg.data.command;
  assert.equal(commands.length, 2);
  const masks = commands.map((c) => Buffer.from(c, 'base64')[12]).sort((a, b) => a - b);
  assert.deepEqual(masks, [0b0101, 0b1010]);
});

test('set_gradient_across paints one gradient over every segment', async () => {
  const gladys = createFakeGladys();
  const out = await SCENE_ACTIONS.set_gradient_across(gladys, {
    fields: { from: '#ff0000', to: '#0000ff' },
    config,
  });
  assert.deepEqual(out, { segments: 4 });
  assert.equal(sent[0].message.msg.data.command.length, 4);
});

test('config is normalized and clamped', () => {
  assert.equal(normalizeConfig({ segment_count: '99' }).segment_count, 15);
  assert.equal(normalizeConfig({ segment_count: 'abc' }).segment_count, 12);
  assert.equal(normalizeConfig({ device_ip: ' 10.0.0.5 ' }).device_ip, '10.0.0.5');
  assert.equal(normalizeConfig({}).segment_count, 12);
  assert.equal(normalizeConfig({}).segments_per_bar, 6);
  assert.equal(normalizeConfig({ segment_count: 4, segments_per_bar: 9 }).segments_per_bar, 4);
});
