#!/bin/sh

cat <<EOF > /app/dist/ng-hse-monitoring/browser/env.js
window.__env = {
  API_URL: "${API_URL}",
  HLS_SERVER_URL: "${HLS_SERVER_URL}",
  MEDIA_SERVER_URL: "${MEDIA_SERVER_URL}"
};
EOF

exec "$@"
