# NODE_VERSION comes from .nvmrc; pnpm comes from packageManager, never host defaults.
ARG NODE_VERSION
FROM node:${NODE_VERSION}-bookworm
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global "$(node -p 'require("./package.json").packageManager')"
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["node", "scripts/integration/runtime.mjs"]
