# HOMS — Offline desktop package (USB / pendrive)

Use this when the security gate computer has **no internet** and you cannot install from the website.

## Do NOT save the website as HTML

Saving https://svcehoms.vercel.app from the browser only downloads a single `.html` file.
That will **not** work. You need the full **HOMS-Portable.zip** package.

## On your laptop (with internet)

1. Open the HOMS project folder.
2. Run:
   ```
   npm run package:portable
   ```
3. Copy **`HOMS-Portable.zip`** from the project folder to your pendrive.

## On the old computer (no internet)

1. Copy **`HOMS-Portable.zip`** from the pendrive to the Desktop.
2. Right-click → **Extract All** (or unzip) into a folder, e.g. `HOMS-Portable`.
3. Open that folder and double-click:
   - **Windows:** `START-HOMS.bat`
   - **Mac:** `START-HOMS.command` (right-click → Open if blocked)
4. Your browser opens at `http://localhost:8080` — use HOMS normally.

Keep the black/blue terminal window open while using the app. Close it to stop.

## Requirements

- Windows 7+ (PowerShell) or Mac/Linux
- Any modern browser (Chrome, Edge, Firefox)
- **Optional:** Python 3 — if installed, the launcher uses it instead of PowerShell

## Important notes

- Login and syncing still need **internet once** to reach the HOMS server (Supabase).
  After that, the **security gate scanner** can work offline using the built-in offline cache.
- Open the security dashboard **once online** before going fully offline so pass data is downloaded.
- Do not open `index.html` directly by double-clicking — always use `START-HOMS.bat`.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Blank white page | Use `START-HOMS.bat`, not `index.html` |
| “Port in use” | Close other HOMS windows; restart the launcher |
| Pass not found offline | Connect to internet once, open Security → wait for cache, then go offline |
| Windows blocks script | Right-click `START-HOMS.bat` → Run as administrator |
