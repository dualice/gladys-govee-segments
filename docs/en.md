# Govee Light Bar Segments

Control a Govee RGBIC light bar from Gladys over your local network, including
a separate color for each segment. No Govee account, no API key and no cloud.

## What you get

One device with these controls:

- **Power**, **Brightness**, **Color** (the whole bar) and **Color temperature**;
- one **Segment N** color control per segment of the light.

## Setup

1. In the **Govee Home** app, open the light bar's settings and turn on
   **LAN Control**.
2. Find the light's IP address (your router lists it) and give it a fixed
   address so it does not change.
3. In the **Configuration** tab of this integration, enter the IP address and
   the number of segments of your light, then save.
4. Open the **Discovery** tab and add the device.

## Scenes

The **Paint a gradient** action fades the segments from one color to another.
Both colors are written like `#ff8800`.

## Good to know

- The light does not report its state back to Gladys: the controls show what
  you last sent, not what the light does if you change it from the Govee app.
- Setting the whole-bar color or the color temperature replaces the segment
  colors.
- Tested on the H6056 (Flow Plus light bar). Other RGBIC models may use a
  different number of segments or ignore the segment commands.

## Troubleshooting

If nothing happens, check that LAN Control is on, that the IP address is
correct, and that the light and Gladys are on the same network. The integration
logs every command; read them from the Gladys UI.
