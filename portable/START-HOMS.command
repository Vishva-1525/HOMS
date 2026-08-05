#!/bin/bash
cd "$(dirname "$0")"
PORT=8080
URL="http://localhost:$PORT/"

echo ""
echo " HOMS - Hostel Outpass Management"
echo " Running at $URL"
echo " Press Ctrl+C to stop."
echo ""

if command -v python3 >/dev/null 2>&1; then
  (sleep 1 && open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) &
  exec python3 -m http.server "$PORT"
fi

if command -v python >/dev/null 2>&1; then
  (sleep 1 && open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) &
  exec python -m http.server "$PORT"
fi

echo "Python not found. Install Python 3 or use START-HOMS.bat on Windows."
read -r -p "Press Enter to exit..."
