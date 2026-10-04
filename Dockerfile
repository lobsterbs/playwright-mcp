FROM mcr.microsoft.com/playwright/mcp:v0.0.82
USER root
COPY patches/apply-patches.js /app/patches/apply-patches.js
COPY patches/patches.json /app/patches/patches.json
RUN node /app/patches/apply-patches.js && rm -rf /app/patches
USER node
EXPOSE 8931
ENTRYPOINT ["node", "/app/cli.js", "--headless", "--browser", "chromium", "--no-sandbox", "--allowed-hosts", "*", "--port", "8931", "--host", "0.0.0.0"]
