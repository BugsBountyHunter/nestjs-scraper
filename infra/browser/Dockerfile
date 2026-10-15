# Network-isolated browser for the scraper (SSRF boundary).
# Tag must match the app's playwright version (package.json).
FROM mcr.microsoft.com/playwright:v1.59.1-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends iptables \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/browser
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund playwright-core@1.59.1
COPY server.js entrypoint.sh ./

# Starts as root only to install firewall rules; entrypoint drops to pwuser.
USER root
EXPOSE 3333
ENTRYPOINT ["/srv/browser/entrypoint.sh"]
