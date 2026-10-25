#!/bin/sh
cd "$(dirname "$0")"
python3 -m http.server 8787 &
PID=$!
(sleep 1; command -v open >/dev/null && open http://localhost:8787 || command -v xdg-open >/dev/null && xdg-open http://localhost:8787)
wait $PID
