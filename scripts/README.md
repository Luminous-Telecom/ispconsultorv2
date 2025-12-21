# Scripts de Instalação e Configuração

Este diretório contém scripts automatizados para instalação e configuração do BackNet ERP.

## Scripts Disponíveis

### 1. `setup.sh` - Setup Completo (Recomendado)

Instala todas as dependências do sistema de uma vez:

```bash
npm run setup
# ou
sudo bash scripts/setup.sh
```

**O que faz:**
- ✅ Instala e configura Elasticsearch
- ✅ Instala todas as dependências NPM (root, backend e frontend)
- ✅ Cria arquivos `.env` a partir de `.env.example` se não existirem
- ✅ Adiciona variáveis do Elasticsearch ao `.env` do backend

### 2. `install-elasticsearch.sh` - Instalação do Elasticsearch

Instala e configura apenas o Elasticsearch:

```bash
npm run setup:elasticsearch
# ou
sudo bash scripts/install-elasticsearch.sh
```

**O que faz:**
- ✅ Verifica se o Elasticsearch já está instalado
- ✅ Instala dependências necessárias (wget, apt-transport-https, etc.)
- ✅ Adiciona repositório oficial do Elasticsearch
- ✅ Instala Elasticsearch 8.x
- ✅ Configura JVM (heap size)
- ✅ Inicia o serviço automaticamente
- ✅ Habilita inicialização automática no boot

**Nota:** Se o Elasticsearch já estiver instalado e rodando, o script detecta e não faz nada.

## Quando Usar

### Após Atualizar o Sistema

Quando você atualizar o sistema (git pull, etc.), execute:

```bash
npm run setup
```

Isso garantirá que:
- O Elasticsearch está instalado e configurado
- Todas as dependências NPM estão atualizadas
- Os arquivos `.env` estão configurados corretamente

### Primeira Instalação

Na primeira instalação do sistema, execute:

```bash
# 1. Clonar repositório
git clone <seu-repositorio>
cd BackNet-ERP

# 2. Executar setup completo
npm run setup

# 3. Editar arquivos .env
nano backend/.env
nano frontend/.env

# 4. Configurar banco de dados e executar migrations
cd backend
npm run migrate

# 5. Iniciar sistema
cd ..
npm run dev
```

### Apenas Elasticsearch

Se você só precisa instalar/configurar o Elasticsearch:

```bash
npm run setup:elasticsearch
```

## Requisitos

- **Sistema Operacional:** Ubuntu/Debian
- **Permissões:** Root (sudo) para instalação do Elasticsearch
- **Node.js:** >= 18 (já deve estar instalado)

## Troubleshooting

### Erro: "Por favor, execute como root (sudo)"

Os scripts precisam de permissões de root para instalar o Elasticsearch. Execute com `sudo`:

```bash
sudo npm run setup
```

### Elasticsearch não inicia

Verifique os logs:

```bash
journalctl -u elasticsearch -n 50
```

Verifique o status:

```bash
systemctl status elasticsearch
```

### Erro ao adicionar repositório

Se houver erro ao adicionar o repositório do Elasticsearch, verifique sua conexão com a internet e tente novamente.

## Estrutura dos Scripts

```
scripts/
├── setup.sh                    # Setup completo
├── install-elasticsearch.sh    # Instalação do Elasticsearch
└── README.md                   # Este arquivo
```

## Variáveis de Ambiente Adicionadas

O script `setup.sh` adiciona automaticamente as seguintes variáveis ao `backend/.env`:

```env
# Configurações do Elasticsearch (Auditoria)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=backnet-auditoria
```

Você pode editar essas variáveis manualmente se necessário.

