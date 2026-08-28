FROM node:22-alpine AS builder

WORKDIR /workspace
COPY sdk/node ./sdk/node
COPY examples/vibecloud-shop ./examples/vibecloud-shop

WORKDIR /workspace/examples/vibecloud-shop
RUN npm install --omit=dev
RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /workspace
COPY --from=builder --chown=node:node /workspace/sdk/node ./sdk/node
COPY --from=builder --chown=node:node /workspace/examples/vibecloud-shop ./examples/vibecloud-shop

WORKDIR /workspace/examples/vibecloud-shop
USER node
EXPOSE 3000

CMD ["npm", "run", "start"]
