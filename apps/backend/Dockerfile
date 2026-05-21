FROM oven/bun:1.3

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production
COPY src ./src

EXPOSE 3001
CMD ["bun", "src/index.ts"]
