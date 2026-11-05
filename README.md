# Govee Light Bar Segments (Gladys Assistant integration)

Local control of a Govee RGBIC light bar from [Gladys Assistant](https://gladysassistant.com),
with a separate color for each segment. No Govee account, no cloud.

Built from the official
[`integration-template-js`](https://github.com/GladysAssistant/integration-template-js).
Tested on an H6056 (Flow Plus light bar).

## How it works

- Gladys runs the integration as a sandboxed Docker container.
- Power, brightness, whole-bar color and white temperature use Govee's documented
  LAN API (JSON over UDP port 4003, "LAN Control" on in the Govee Home app).
- Segment colors use the `ptReal` command: the raw 20-byte packet the Govee app
  sends over Bluetooth, relayed by the LAN API (`src/govee-lan.js`).
- The light's replies cannot reach a container on a Docker bridge, so state is
  tracked by the integration, not read back.

## Develop

Needs Node 22+.

```bash
npm install
npm test
npm run lint
npm run format:check
```

## Install in Gladys

Publish the repository and its Docker image (see the template README for the
release workflow), then add the repository from the Gladys integration store.
Set `docker_image` in the manifest to your image first.
