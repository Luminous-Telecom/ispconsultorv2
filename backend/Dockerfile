# syntax=docker/dockerfile:1.4

FROM node:20
WORKDIR /app

# Instala dependências de sistema necessárias para o node-canvas
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Atualiza o npm global com cache persistente
RUN --mount=type=cache,target=/root/.npm \
    npm install -g npm@11.6.2

# Copia package.json e package-lock.json
# Isso garante que mudanças nesses arquivos invalidam o cache corretamente
COPY package.json package-lock.json ./

# Instala dependências do projeto com cache do npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# Copia o restante do código
COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx sequelize-cli db:migrate --env development && npm run dev"]
