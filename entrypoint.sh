#!/bin/sh

# Generate env.js with runtime environment variables
# Path for Nginx container
cat <<EOF > /usr/share/nginx/html/env.js
window.__env = {
  API_URL: "${API_URL}",
  HLS_SERVER_URL: "${HLS_SERVER_URL}",
  MEDIA_SERVER_URL: "${MEDIA_SERVER_URL}",
  BMAPP_URL: "${BMAPP_URL:-http://103.75.84.183:2323}"
};
EOF

exec "$@"
