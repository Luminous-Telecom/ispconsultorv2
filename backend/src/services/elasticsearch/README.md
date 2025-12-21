# Auditoria com Elasticsearch

Este módulo implementa um sistema de auditoria completo utilizando Elasticsearch para armazenar logs de todas as ações críticas do sistema.

## 📋 Funcionalidades

- ✅ **Captura Automática**: Middleware intercepta automaticamente ações de create, update e delete
- ✅ **Dados Completos**: Registra estado anterior e novo estado (diff)
- ✅ **Contexto Completo**: IP, User-Agent, rota, método HTTP, usuário
- ✅ **Resiliência**: Se Elasticsearch falhar, salva em arquivo local como fallback
- ✅ **Assíncrono**: Não bloqueia operações principais do sistema
- ✅ **Configurável**: Pode ser desabilitado simplesmente não configurando as variáveis

## 🚀 Configuração

### 1. Instalar Elasticsearch

#### Opção A: Docker (Recomendado para desenvolvimento)

```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

#### Opção B: Instalação Nativa (Ubuntu/Debian)

**1. Instalar dependências:**
```bash
sudo apt update
sudo apt install -y curl wget apt-transport-https gnupg2
```

**2. Adicionar repositório do Elasticsearch (Método Moderno):**
```bash
# Baixar e importar chave GPG
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Adicionar repositório com chave assinada
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
```

**Alternativa (Método Antigo - se o método acima não funcionar):**
```bash
# Se você estiver em uma versão muito antiga do Ubuntu/Debian que ainda suporta apt-key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
```

**3. Instalar Elasticsearch:**
```bash
sudo apt update
sudo apt install -y elasticsearch
```

**4. Configurar Elasticsearch:**
```bash
# Editar arquivo de configuração
sudo nano /etc/elasticsearch/elasticsearch.yml
```

Adicione ou modifique as seguintes linhas:
```yaml
# Nome do cluster
cluster.name: backnet-cluster

# Nome do nó
node.name: backnet-node-1

# Caminho dos dados
path.data: /var/lib/elasticsearch

# Caminho dos logs
path.logs: /var/log/elasticsearch

# Endereço de rede (aceitar conexões de qualquer IP)
network.host: 0.0.0.0

# Porta HTTP
http.port: 9200

# Desabilitar segurança (apenas para desenvolvimento)
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
```

**5. Configurar JVM (memória):**
```bash
# Criar arquivo de configuração de heap (método recomendado)
sudo mkdir -p /etc/elasticsearch/jvm.options.d
echo -e "-Xms1g\n-Xmx1g" | sudo tee /etc/elasticsearch/jvm.options.d/heap.options
```

Ajuste conforme sua RAM disponível (recomendado: metade da RAM total, mínimo 1GB):
```bash
# Para servidor com 4GB RAM
-Xms1g
-Xmx1g

# Para servidor com 8GB RAM
-Xms2g
-Xmx2g
```

**⚠️ Importante:** Não edite diretamente `/etc/elasticsearch/jvm.options`. Use arquivos em `jvm.options.d/` conforme mostrado acima. Se você encontrar erros sobre "improperly formatted JVM option", comente as linhas de exemplo no arquivo principal:
```bash
sudo sed -i 's/^ -Xms1g$/## -Xms1g/' /etc/elasticsearch/jvm.options
sudo sed -i 's/^ -Xmx1g$/## -Xmx1g/' /etc/elasticsearch/jvm.options
```

**6. Iniciar e habilitar Elasticsearch:**
```bash
# Iniciar serviço
sudo systemctl start elasticsearch

# Habilitar para iniciar no boot
sudo systemctl enable elasticsearch

# Verificar status
sudo systemctl status elasticsearch
```

**7. Verificar instalação:**
```bash
# Aguardar alguns segundos para o Elasticsearch iniciar
sleep 10

# Testar conexão
curl http://localhost:9200
```

Você deve ver uma resposta JSON com informações do cluster.

#### Opção C: Instalação Nativa (CentOS/RHEL)

**1. Instalar dependências:**
```bash
sudo yum update -y
sudo yum install -y curl wget
```

**2. Adicionar repositório do Elasticsearch:**
```bash
# Importar chave GPG
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

# Adicionar repositório
sudo tee /etc/yum.repos.d/elasticsearch.repo <<EOF
[elasticsearch-8.x]
name=Elasticsearch repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF
```

**3. Instalar Elasticsearch:**
```bash
sudo yum install -y elasticsearch
```

**4. Configurar Elasticsearch:**
```bash
# Editar arquivo de configuração
sudo nano /etc/elasticsearch/elasticsearch.yml
```

Adicione ou modifique as seguintes linhas:
```yaml
# Nome do cluster
cluster.name: backnet-cluster

# Nome do nó
node.name: backnet-node-1

# Caminho dos dados
path.data: /var/lib/elasticsearch

# Caminho dos logs
path.logs: /var/log/elasticsearch

# Endereço de rede (aceitar conexões de qualquer IP)
network.host: 0.0.0.0

# Porta HTTP
http.port: 9200

# Desabilitar segurança (apenas para desenvolvimento)
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
```

**5. Configurar JVM (memória):**
```bash
# Editar configuração de memória
sudo nano /etc/elasticsearch/jvm.options
```

Ajuste conforme sua RAM disponível:
```bash
# Para servidor com 4GB RAM
-Xms1g
-Xmx1g

# Para servidor com 8GB RAM
-Xms2g
-Xmx2g
```

**6. Configurar limites do sistema:**
```bash
# Aumentar limite de memória virtual
echo "elasticsearch soft memlock unlimited" | sudo tee -a /etc/security/limits.conf
echo "elasticsearch hard memlock unlimited" | sudo tee -a /etc/security/limits.conf

# Aumentar limite de arquivos abertos
echo "elasticsearch soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "elasticsearch hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

**7. Iniciar e habilitar Elasticsearch:**
```bash
# Iniciar serviço
sudo systemctl start elasticsearch

# Habilitar para iniciar no boot
sudo systemctl enable elasticsearch

# Verificar status
sudo systemctl status elasticsearch
```

**8. Verificar instalação:**
```bash
# Aguardar alguns segundos para o Elasticsearch iniciar
sleep 10

# Testar conexão
curl http://localhost:9200
```

#### Opção D: Instalação Manual (Tarball)

**1. Baixar Elasticsearch:**
```bash
cd /tmp
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.0-linux-x86_64.tar.gz
```

**2. Extrair e mover:**
```bash
tar -xzf elasticsearch-8.11.0-linux-x86_64.tar.gz
sudo mv elasticsearch-8.11.0 /opt/elasticsearch
```

**3. Criar usuário dedicado:**
```bash
sudo useradd -m -s /bin/bash elasticsearch
sudo chown -R elasticsearch:elasticsearch /opt/elasticsearch
```

**4. Configurar Elasticsearch:**
```bash
sudo nano /opt/elasticsearch/config/elasticsearch.yml
```

Adicione:
```yaml
cluster.name: backnet-cluster
node.name: backnet-node-1
network.host: 0.0.0.0
http.port: 9200
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
```

**5. Configurar JVM:**
```bash
sudo nano /opt/elasticsearch/config/jvm.options
```

Ajuste memória:
```bash
-Xms1g
-Xmx1g
```

**6. Criar serviço systemd:**
```bash
sudo nano /etc/systemd/system/elasticsearch.service
```

Adicione:
```ini
[Unit]
Description=Elasticsearch
After=network.target

[Service]
Type=simple
User=elasticsearch
Group=elasticsearch
ExecStart=/opt/elasticsearch/bin/elasticsearch
Restart=always
RestartSec=10
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
```

**7. Iniciar serviço:**
```bash
sudo systemctl daemon-reload
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch
sudo systemctl status elasticsearch
```

**8. Verificar:**
```bash
sleep 10
curl http://localhost:9200
```

#### Verificação Final (Todas as Opções)

Após instalar, verifique se está funcionando:

```bash
# Verificar status do serviço
sudo systemctl status elasticsearch

# Verificar logs
sudo journalctl -u elasticsearch -f

# Testar API
curl http://localhost:9200

# Verificar índices
curl http://localhost:9200/_cat/indices?v
```

**Troubleshooting:**

- Se o Elasticsearch não iniciar, verifique os logs: `sudo journalctl -u elasticsearch -n 50`
- Se houver erro de memória, ajuste `-Xms` e `-Xmx` em `/etc/elasticsearch/jvm.options`
- Se houver erro de permissões, verifique: `sudo chown -R elasticsearch:elasticsearch /var/lib/elasticsearch /var/log/elasticsearch`

### 2. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` do backend:

```env
# Elasticsearch - Auditoria
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=backnet-auditoria

# Opcional: Autenticação (se necessário)
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# Opcional: SSL/TLS (se necessário)
ELASTICSEARCH_SSL=false
ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED=true
```

**⚠️ Importante:**
- Se `ELASTICSEARCH_NODE` não estiver configurado, a auditoria será desabilitada automaticamente
- Os logs serão salvos em arquivo local como fallback (`logs/auditoria/`)
- O sistema continua funcionando normalmente mesmo sem Elasticsearch

### 3. Verificar Conexão

Após iniciar o backend, verifique os logs para confirmar a conexão:

```bash
# Verificar se o índice foi criado
curl http://localhost:9200/backnet-auditoria

# Verificar documentos
curl http://localhost:9200/backnet-auditoria/_search?pretty
```

## 📊 Estrutura dos Dados

Cada documento de auditoria contém:

```json
{
  "usuario_id": 1,
  "usuario_nome": "João Silva",
  "usuario_email": "joao@example.com",
  "acao": "update",
  "entidade": "Cliente",
  "entidade_id": 123,
  "dados_anteriores": {
    "nome": "Cliente Antigo",
    "email": "antigo@example.com"
  },
  "dados_novos": {
    "nome": "Cliente Novo",
    "email": "novo@example.com"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "rota": "/api/clientes/123",
  "metodo_http": "PUT",
  "observacoes": "Atualização via PUT /api/clientes/123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Uso nos Controllers

### Captura Automática (Recomendado)

O middleware captura automaticamente ações de **CREATE**. Para **UPDATE** e **DELETE**, você precisa fornecer os dados anteriores:

```typescript
import { setAuditData } from '../middleware/auditMiddleware';

// Exemplo: Update
static async update(req: Request, res: Response): Promise<void> {
  const cliente = await Cliente.findByPk(id);
  
  // Capturar dados anteriores
  const dadosAnteriores = cliente.toJSON() as Record<string, unknown>;
  
  // Atualizar
  await cliente.update(value);
  await cliente.reload();
  
  // Capturar dados novos
  const dadosNovos = cliente.toJSON() as Record<string, unknown>;
  
  // Registrar para auditoria
  setAuditData(req, dadosAnteriores, dadosNovos);
  
  res.json({ success: true, data: cliente });
}

// Exemplo: Delete
static async delete(req: Request, res: Response): Promise<void> {
  const cliente = await Cliente.findByPk(id);
  
  // Capturar dados anteriores
  const dadosAnteriores = cliente.toJSON() as Record<string, unknown>;
  setAuditData(req, dadosAnteriores);
  
  // Deletar
  await cliente.destroy();
  
  res.json({ success: true });
}
```

### Uso Manual (Opcional)

Se precisar registrar auditoria manualmente:

```typescript
import {
  registrarCriacaoElasticsearch,
  registrarAtualizacaoElasticsearch,
  registrarExclusaoElasticsearch
} from '../services/elasticsearch';

// Criar
await registrarCriacaoElasticsearch(
  req,
  'Cliente',
  cliente.id,
  cliente.toJSON(),
  'Observação opcional'
);

// Atualizar
await registrarAtualizacaoElasticsearch(
  req,
  'Cliente',
  cliente.id,
  dadosAnteriores,
  dadosNovos,
  'Observação opcional'
);

// Deletar
await registrarExclusaoElasticsearch(
  req,
  'Cliente',
  cliente.id,
  dadosAnteriores,
  'Observação opcional'
);
```

## 🔍 Consultas no Elasticsearch

### Buscar todas as ações de um usuário

```json
GET /backnet-auditoria/_search
{
  "query": {
    "term": {
      "usuario_id": 1
    }
  }
}
```

### Buscar ações de uma entidade específica

```json
GET /backnet-auditoria/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "entidade": "Cliente" } },
        { "term": { "entidade_id": 123 } }
      ]
    }
  }
}
```

### Buscar ações por período

```json
GET /backnet-auditoria/_search
{
  "query": {
    "range": {
      "timestamp": {
        "gte": "2024-01-01T00:00:00Z",
        "lte": "2024-01-31T23:59:59Z"
      }
    }
  }
}
```

### Buscar apenas atualizações com diff

```json
GET /backnet-auditoria/_search
{
  "query": {
    "term": {
      "acao": "update"
    }
  }
}
```

## 🛡️ Resiliência e Fallback

O sistema possui múltiplas camadas de resiliência:

1. **Elasticsearch disponível**: Logs são salvos no Elasticsearch
2. **Elasticsearch indisponível**: Logs são salvos em arquivo local (`logs/auditoria/auditoria-YYYY-MM-DD.json`)
3. **Erro no fallback**: Erro é logado no console, mas não interrompe a operação

### Estrutura de Fallback

```
logs/
└── auditoria/
    ├── auditoria-2024-01-15.json
    ├── auditoria-2024-01-16.json
    └── ...
```

Cada linha do arquivo é um JSON completo de uma ação de auditoria.

## 📝 Mapeamento de Rotas para Entidades

O middleware mapeia automaticamente rotas para entidades:

| Rota | Entidade |
|------|----------|
| `/api/clientes` | `Cliente` |
| `/api/planos` | `Plano` |
| `/api/bancos` | `Banco` |
| `/api/usuarios` | `Usuario` |
| `/api/titulos` | `Titulo` |
| `/api/contratos` | `Contrato` |
| `/api/dados-empresa` | `DadosEmpresa` |
| `/api/parametros` | `Parametros` |
| ... | ... |

Para adicionar novas rotas, edite `ROUTE_ENTITY_MAP` em `auditMiddleware.ts`.

## 🔒 Segurança

- ✅ Logs não contêm senhas ou dados sensíveis (campos são filtrados)
- ✅ IP do usuário é capturado corretamente mesmo atrás de proxy
- ✅ User-Agent é capturado para análise de segurança
- ✅ Timestamp ISO 8601 para ordenação precisa

## 🐛 Troubleshooting

### Elasticsearch não conecta

1. Verifique se o Elasticsearch está rodando: `curl http://localhost:9200`
2. Verifique as variáveis de ambiente no `.env`
3. Verifique os logs do backend para erros de conexão
4. Os logs serão salvos em arquivo local como fallback

### Índice não é criado

1. Verifique permissões do usuário do Elasticsearch
2. Verifique se `ELASTICSEARCH_INDEX_NAME` está configurado
3. O índice é criado automaticamente na primeira inserção

### Logs não aparecem

1. Verifique se o middleware está registrado em `index.ts`
2. Verifique se a rota está mapeada em `ROUTE_ENTITY_MAP`
3. Verifique os logs do backend para erros
4. Verifique arquivos de fallback em `logs/auditoria/`

## 📚 Referências

- [Documentação do Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Cliente Node.js do Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)

