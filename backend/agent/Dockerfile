FROM node:20-alpine

# Dependências nativas para node-pty
RUN apk add --no-cache python3 make g++ linux-headers bash

WORKDIR /app

# dev → https://dev.luminoustelecom.com.br | prod → https://ispconsultor.com.br
ARG ISPCONSULTOR_AGENT_CHANNEL=prod
ENV ISPCONSULTOR_AGENT_CHANNEL=${ISPCONSULTOR_AGENT_CHANNEL}

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.js ./

ENTRYPOINT ["node", "--", "index.js"]
