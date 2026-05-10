FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# The SDK's path-picker tries the linux-x64-musl directory FIRST on Linux
# and returns whatever path it can resolve, then errors at spawn time if
# the binary at that path isn't actually executable on this libc. On
# Debian (glibc), wipe the musl directory so the picker falls through to
# linux-x64 (which has a working glibc binary).
RUN rm -rf node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl \
 && echo "--- node_modules/@anthropic-ai listing after cleanup ---" \
 && ls -la node_modules/@anthropic-ai/ \
 && echo "--- linux-x64 contents ---" \
 && ls -la node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/ 2>/dev/null || echo "linux-x64 dir missing!"

COPY . .

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.mjs"]
