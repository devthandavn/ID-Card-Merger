# ID-Card-Merger

# ID Card A4 Print Maker

A fast, private, mobile-friendly vanilla web application that arranges front and back photos of any ID card side by side on a single portrait A4 sheet (210 × 297 mm) for physical printing, high-resolution 300 DPI PNG export, or exact vector PDF generation.

---

## Key Features

- **Standard A4 Layout**:
  - Paper Size: Exactly 210 mm × 297 mm (A4 Portrait).
  - Top Margin: Exactly 25.4 mm (1.0 inch).
  - Side Margins: 15.0 mm base margins.
  - Front-to-Back Gap: Exactly 12.0 mm default spacing.
  - Symmetrical horizontal centering within the usable width.
- **Aspect Ratio Preservation**: Front and back cards retain their natural aspect ratios without distortion, stretching, or cropping.
- **Image Manipulation**:
  - Independent 90° clockwise and counter-clockwise rotation for each card.
  - Live fine-tuning sliders for card width (default 85.6 mm) and inter-card gap.
  - Replace or clear images individually.
- **100% Client-Side Privacy**:
  - Photos are processed in-memory using the browser's HTML5 Canvas and Blob APIs.
  - No database, no backend server, no cookies, no tracking, and zero cloud uploads.
- **Export Options**:
  - **Vector PDF**: Generated directly with millimetric coordinates via `jsPDF`.
  - **300 DPI PNG**: Full-sheet 2480 × 3508 px raster export with clean white background.
  - **Browser Print**: Dedicated print CSS that hides all user interface elements and prints only the cards on the A4 page.
  - **Web Share**: Shares the print-ready PDF using the native OS share sheet (on supported mobile and desktop browsers).

---

## Free Deployment Instructions (GitHub Pages)

You can host this application permanently and for free using GitHub Pages without installing any build tools.

### Step 1: Create a GitHub Repository
1. Log in to [GitHub](https://github.com).
2. Click **New Repository** (or visit `https://github.com/new`).
3. Name your repository (e.g., `id-card-a4-maker`).
4. Set the repository visibility to **Public**.
5. Leave "Initialize with a README" unchecked, then click **Create repository**.

### Step 2: Upload Files
1. On your repository page, click **Add file** &rarr; **Upload files**.
2. Drag and drop the following 4 files:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`
3. Enter a commit message (e.g., `"Initial release"`) and click **Commit changes**.

### Step 3: Enable GitHub Pages
1. Go to your repository's **Settings** tab.
2. In the left navigation sidebar, click **Pages** (under the "Code and automation" heading).
3. Under **Build and deployment** &rarr; **Source**, select **Deploy from a branch**.
4. Under **Branch**, select `main` (or `master`) and folder `/ (root)`.
5. Click **Save**.

### Step 4: Access Your Live App
- Wait 30–60 seconds. Refresh the Pages settings tab until you see:
  > *Your site is live at `https://<your-username>.github.io/<repository-name>/`*
- Click the link to open the app on your mobile phone or desktop browser.

---

## Printer Configuration Guide

When printing the sheet directly from your browser (`Ctrl + P` or the **Print Sheet** button):

1. **Destination**: Select your printer or "Save as PDF".
2. **Paper Size**: Choose **A4**.
3. **Orientation**: Set to **Portrait**.
4. **Scale**: Choose **Actual Size** or set custom scale to **100%**.
   > *Warning:* Do not use **"Fit to Page"**, **"Fit to Printable Area"**, or **"Shrink Oversized Pages"**, as they alter card dimensions.
5. **Margins**: Set to **None** or **Default**.
6. **Headers and Footers**: Uncheck to keep the A4 sheet completely blank except for the ID cards.

---

## Acceptance Test Verification

| Test | Criterion | Status |
| :--- | :--- | :--- |
| **1** | PDF page size is exactly A4 portrait (210 × 297 mm) | Verified (`format: 'a4'`, `unit: 'mm'`) |
| **2** | Top content margin is exactly 25.4 mm (1 inch) | Verified (`MARGIN_TOP_MM = 25.4`) |
| **3** | Side margins are aligned to 15 mm base | Verified (centered horizontally within usable page width) |
| **4** | Card gap default is 12 mm | Verified (`DEFAULT_GAP_MM = 12.0`) |
| **5** | Images maintain aspect ratio without distortion | Verified (`naturalWidth / naturalHeight` aspect calculation) |
| **6** | Shared layout across Preview, PDF, PNG, Print | Verified (all derive positions from `calculateLayout()`) |
| **7** | PNG export resolution | Verified (2480 × 3508 px at 300 DPI) |
| **8** | Print sheet contains no UI controls | Verified (`.no-print` hidden via `@media print`) |
| **9** | Rotate, reset, replace, and validation | Verified (0°, 90°, 180°, 270° increments & full reset) |