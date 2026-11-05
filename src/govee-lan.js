// -----------------------------------------------------------------------------
// Govee LAN client.
//
// Govee lights answer JSON commands on UDP port 4003 once "LAN Control" is on
// in the Govee Home app. The documented commands only cover the whole light
// (power, brightness, one color, a white temperature). Per-segment colors go
// through `ptReal`: a raw 20-byte packet, the same one the Govee app sends over
// Bluetooth, relayed by the LAN API. It is not documented by Govee; the packet
// layout below was checked on an H6056 (Flow Plus light bar).
//
// Commands are fire-and-forget: the container runs on a Docker bridge, and the
// light's replies (devStatus) go to UDP port 4002 of the HOST, which the
// container cannot receive. State is therefore tracked by the integration.
// -----------------------------------------------------------------------------

import dgram from 'node:dgram';

export const CONTROL_PORT = 4003;

// One `ptReal` packet carries a 16-bit segment mask.
export const MAX_SEGMENTS = 15;

/** Send one JSON object to the light. Replaced in the tests. */
function udpTransport(ip, message) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const payload = Buffer.from(JSON.stringify(message));
    socket.send(payload, CONTROL_PORT, ip, (err) => {
      socket.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

let transport = udpTransport;

/** Test seam: swap the network layer. Call with no argument to restore it. */
export function setTransport(fn) {
  transport = fn ?? udpTransport;
}

export function intToRgb(value) {
  const n = Math.max(0, Math.min(0xffffff, Math.round(Number(value) || 0)));
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToInt({ r, g, b }) {
  return (r << 16) | (g << 8) | b;
}

/** Parse "#rrggbb" / "rrggbb" / "#rgb". Returns null when it is not a color. */
export function parseHexColor(text) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(text ?? '').trim());
  if (!match) {
    return null;
  }
  let hex = match[1];
  if (hex.length === 3) {
    hex = [...hex].map((c) => c + c).join('');
  }
  return intToRgb(parseInt(hex, 16));
}

/**
 * Build the base64 `ptReal` packet that paints the segments of `mask`
 * (bit 0 = first segment) with one color.
 */
export function segmentPacket({ r, g, b }, mask) {
  const packet = Buffer.alloc(20);
  packet[0] = 0x33;
  packet[1] = 0x05;
  packet[2] = 0x15;
  packet[3] = 0x01;
  packet[4] = r;
  packet[5] = g;
  packet[6] = b;
  packet[12] = mask & 0xff;
  packet[13] = (mask >> 8) & 0xff;
  // Last byte: XOR of the 19 previous ones.
  packet[19] = packet.subarray(0, 19).reduce((acc, byte) => acc ^ byte, 0);
  return packet.toString('base64');
}

function command(cmd, data) {
  return { msg: { cmd, data } };
}

export const lan = {
  turn: (ip, on) => transport(ip, command('turn', { value: on ? 1 : 0 })),

  brightness: (ip, percent) =>
    transport(
      ip,
      command('brightness', { value: Math.max(1, Math.min(100, Math.round(percent))) }),
    ),

  // `kelvin` 0 means "use the RGB color"; otherwise the white temperature.
  color: (ip, rgb, kelvin = 0) =>
    transport(ip, command('colorwc', { color: rgb, colorTemInKelvin: kelvin })),

  /**
   * Paint segments in one message. `colors` is an array, one entry per segment
   * (index 0 = first segment); `null` leaves a segment alone. Segments sharing
   * a color go in one packet.
   */
  segments(ip, colors) {
    const groups = new Map();
    colors.slice(0, MAX_SEGMENTS).forEach((rgb, index) => {
      if (!rgb) {
        return;
      }
      const key = `${rgb.r},${rgb.g},${rgb.b}`;
      const group = groups.get(key) ?? { rgb, mask: 0 };
      group.mask |= 1 << index;
      groups.set(key, group);
    });
    if (groups.size === 0) {
      return Promise.resolve();
    }
    const packets = [...groups.values()].map(({ rgb, mask }) => segmentPacket(rgb, mask));
    return transport(ip, command('ptReal', { command: packets }));
  },
};

/** Colors of a straight gradient between two colors over `count` segments. */
export function gradient(from, to, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    return {
      r: Math.round(from.r + (to.r - from.r) * t),
      g: Math.round(from.g + (to.g - from.g) * t),
      b: Math.round(from.b + (to.b - from.b) * t),
    };
  });
}
