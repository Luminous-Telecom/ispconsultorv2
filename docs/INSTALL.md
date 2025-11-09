# Manual de Instalação – BackNet ERP

## 1. Pré-requisitos
- Ubuntu/Debian ou WSL atualizado
- Node.js ≥ 18 (recomendado 20) e npm (vem junto com Node ≥ 5.2)
- MySQL ou MariaDB em execução
- Git (opcional, apenas para clonagem)

## 2. Instalar Node.js e npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```
> Use outra versão trocando `setup_20.x` por `setup_18.x`, etc.

## 3. Instalar e iniciar MySQL/MariaDB
```bash
sudo apt update
sudo apt install mariadb-server
sudo service mariadb start
# ou, se usar MySQL:
sudo service mysql start
```
Verifique o status:
```bash
sudo service mariadb status
# ou
sudo service mysql status
```

## 4. Criar banco de dados e usuário
Conecte-se via TCP e crie o banco/usuário:
```bash
mysql -u root -p -h 127.0.0.1
```
Dentro do prompt:
```sql
CREATE DATABASE IF NOT EXISTS backnet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'backnet'@'localhost' IDENTIFIED BY 'vantora';
GRANT ALL PRIVILEGES ON backnet.* TO 'backnet'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 5. Variáveis de ambiente
Copie os arquivos de exemplo:
```bash
cd /home/projetos/BackNet-ERP
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
```
Edite `backend/.env` com as credenciais reais:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=backnet
DB_USER=backnet
DB_PASSWORD=vantora
```
Atualize também `BASE_URL`, `FRONTEND_URL` e demais campos conforme o ambiente.

No frontend, ajuste `frontend/.env` se necessário:
```
REACT_APP_API_URL=http://localhost:3001/api
```

## 6. Instalar dependências
```bash
cd /home/projetos/BackNet-ERP
npm run install-all
```
O script instala dependências na raiz, backend e frontend automaticamente.

## 7. Executar migrações
Garanta que o banco está ativo e rode:
```bash
cd /home/projetos/BackNet-ERP/backend
npx sequelize-cli db:migrate --env development
```
> Se `npx` não for reconhecido, feche e reabra o terminal ou reinstale Node/npm.

## 8. Rodar em desenvolvimento
- Backend + frontend juntos:
  ```bash
  cd /home/projetos/BackNet-ERP
  npm run dev
  ```
  - API: `http://localhost:3001`
  - Frontend: `http://localhost:3000`

- Separados:
  ```bash
  cd backend && npm run dev
  cd frontend && npm run dev
  ```

## 9. Verificações adicionais
- Certifique-se de que `backend/uploads` e `backend/images` existem (crie se necessário).
- Evite `console.log` desnecessários em produção.
- Após criar/alterar/deletar dados, invalide queries conforme as práticas do projeto.

## 10. Solução de problemas comuns
- **Erro 2002 (mysqld.sock)**: inicie o serviço (`sudo service mysql start`).
- **`npx: command not found`**: Node/npm ausentes. Reinstale.
- **`Access denied for user`**: revise credenciais no MySQL e no `.env`.
- **Porta ocupada**: ajuste `PORT` no `.env` ou libere a porta (`lsof -i :3001`).

## 11. Próximos passos
- Ajuste variáveis para ambientes de staging/produção.
- Configure backups e políticas de segurança (senhas fortes, firewall).
- Automatize deploys e monitore logs sem expor dados sensíveis.

