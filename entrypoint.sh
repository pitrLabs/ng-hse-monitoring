#!/bin/sh

cat <<EOF > /app/dist/ng-hse-monitoring/browser/env.js
window.__env = {
  API_URL: "${API_URL}"
};
EOF

exec "$@"
