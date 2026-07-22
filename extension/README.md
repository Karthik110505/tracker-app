# GATE Offline Saver & Archiver Extension

A lightweight, modern Google Chrome and Brave browser extension (Manifest V3) designed to capture and download web pages—such as the GATE exam result pages from `gate-cs-archive.netlify.app`—for offline usage. 

The extension compiles the page in its fully rendered state, preserving all diagrams, tables, formulas (KaTeX/MathJax), and styles, while freezing the DOM so it remains exact and static when viewed offline.

---

## Key Features

1. **Save Offline HTML (Single-File)**:
   - Clones the current document object model (DOM).
   - Resolves and fetches external stylesheets, and parses their `url(...)` declarations to fetch and inline custom web fonts (like KaTeX math fonts) and background images as Base64 data URLs.
   - Converts `<img>` tags in parallel batches to embedded Base64 data URLs.
   - Replaces HTML5 `<canvas>` elements with static images so dynamic charts/drawings are preserved.
   - Strips `<script>` tags, `<noscript>` tags, and inline event handlers (`onclick`, etc.) to "freeze" the page state, preventing client-side routers or API fetches from wiping or redirecting the page offline.
   - Generates a standard `.html` file that opens on *any* browser or device (including mobile).

2. **Save MHTML Archive**:
   - Uses Chrome's native `chrome.pageCapture` API to generate a standard `.mhtml` archive.
   - Extremely precise but less compatible across non-Chromium browsers.

3. **Bypass Save Dialog & Save to Custom Subfolder**:
   - Save automatically (skips file dialog prompts).
   - Organize files inside a subfolder under your Downloads directory.

4. **Premium Glassmorphic UI**:
   - Translucent dark-mode design with glowing details matching the GATE archive brand.
   - Real-time progress bar and status spinner showing exactly what resource is being packaged.

---

## How to Save directly to `E:\GATE\TEST_RESULTS`

Due to browser security sandboxing, Chrome/Brave extensions are **prohibited** from directly downloading to absolute paths outside of the main browser downloads directory. You can easily bypass this using one of these two methods:

### Method A: Change your browser's default downloads location (Simplest)
1. Open your browser settings and search for **Downloads** (or go to `chrome://settings/downloads`).
2. Click **Change** next to **Location**.
3. Select your target directory: `E:\GATE\TEST_RESULTS`.
4. Open the extension popup preferences (click the gear icon ⚙️):
   - Toggle **Save automatically** to **ON**.
   - Leave the **Default Subfolder** field empty (or set to `/`).
5. All downloads will now save directly to `E:\GATE\TEST_RESULTS` automatically.

### Method B: Create a Windows Directory Junction (Redirection)
If you want to keep your main browser downloads folder as is, you can create a virtual redirection link in Windows:
1. Open **Command Prompt** as Administrator.
2. Run the following command (replace `<YOUR_WINDOWS_USERNAME>` with your actual Windows username):
   ```cmd
   mklink /j "C:\Users\<YOUR_WINDOWS_USERNAME>\Downloads\GATE" "E:\GATE\TEST_RESULTS"
   ```
3. Open the extension popup preferences (click the gear icon ⚙️):
   - Toggle **Save automatically** to **ON**.
   - Set the **Default Subfolder** to `GATE`.
4. Any download will write to `Downloads/GATE` and Windows will automatically and instantly redirect it to `E:\GATE\TEST_RESULTS`.

---

## Installation Instructions

Follow these simple steps to install the extension in Google Chrome or Brave:

1. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Brave**: `brave://extensions/`
2. In the top-right corner, toggle the **Developer mode** switch to **ON**.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the extension directory:
   ```
   d:\projects\GATERevisionTrackerWebsite
   ```
5. The **GATE Offline Saver** extension icon will now appear in your browser. Pin it to the toolbar for quick access!

---

## How to Use

1. Complete your exam on [GATE CSE Archive](https://gate-cs-archive.netlify.app).
2. On the `/result` page, once your marks, tables, and questions are fully loaded, click the **GATE Offline Saver** icon in the browser toolbar.
3. Click the gear icon (**⚙️**) in the top right of the popup to set your download preferences (e.g. following **Method A** or **Method B** above).
4. Click **Save Offline HTML** (Recommended).
5. Watch the progress bar in the popup package your resources. Once complete, it will automatically download to your preferred offline directory.
6. Open the downloaded file offline (with internet disconnected) to verify that all questions, SVG diagrams, mathematical equations, and styles are present and identical to the original page!
