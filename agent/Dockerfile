FROM node:20-alpine

# Dependências nativas para node-pty
RUN apk add --no-cache python3 make g++ linux-headers bash

WORKDIR /app

# dev → https://dev.luminoustelecom.com.br | prod → https://backnet.app (fixo no index.js)
ARG BACKNET_AGENT_CHANNEL=prod
ENV BACKNET_AGENT_CHANNEL=${BACKNET_AGENT_CHANNEL}

COPY package.json ./
RUN npm install --production

COPY index.js ./

ENTRYPOINT ["node", "--", "index.js"]
