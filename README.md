# Blockium Adblocker

A lightweight, highly performant adblocker built with Manifest V3. Blockium features a beautiful glassmorphism UI, a real-time analytics dashboard, and powerful network-level ad blocking capabilities.

## How to Install in Chrome (Developer Mode)

Since this extension is not currently published on the Chrome Web Store, you will need to install it locally using Developer Mode. Follow these simple steps:

1. **Open the Extensions Page**
   Open Google Chrome, type `chrome://extensions/` into the URL address bar, and hit **Enter**.

2. **Enable Developer Mode**
   In the top-right corner of the Extensions page, you will see a toggle switch labeled **Developer mode**. Turn it **ON**.

3. **Load the Extension**
   Once Developer Mode is enabled, three new buttons will appear in the top-left corner. Click the button that says **Load unpacked**.

4. **Select the Folder**
   A file browser window will open. Navigate to the `adblocker` folder on your computer (the folder containing the `manifest.json` file). Select the folder and click **Select** or **Open**.

5. **Pin the Extension (Optional but Recommended)**
   The Blockium extension is now installed! To keep it visible in your toolbar at all times, click the gray **Puzzle Piece** icon in the top-right corner of Chrome, find Blockium in the dropdown list, and click the **Pin** icon next to it.

## Troubleshooting

- **Extension not updating?** If you make code changes, go to `chrome://extensions/` and click the circular **Reload** (↻) icon on the Blockium card to restart it.
- **Data dashboard not working?** Same as above, make sure you reload the extension so the background tracking script can boot up properly.
