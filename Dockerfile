FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# The SDK may look at the linux-x64-musl path even on glibc systems
# (libc detection isn't always reliable). Mirror the glibc binary into
# the musl directory so either lookup resolves to a working binary.
RUN if [ -d node_modules/@anthropic-ai/claude-agent-sdk-linux-x64 ] \
    && [ ! -d node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl ]; then \
      cp -r node_modules/@anthropic-ai/claude-agent-sdk-linux-x64 \
            node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl ; \
    fi \
 && ls node_modules/@anthropic-ai/

COPY . .

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.mjs"]
