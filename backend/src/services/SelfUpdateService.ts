import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
  steps: {
    elasticsearch?: CommandResult;
    gitPull: CommandResult;
    npmInstall: CommandResult;
    build: CommandResult;
    migrate: CommandResult;
    pm2Reload?: CommandResult;
  };
}

/**
 * Service responsável por executar o self-update da aplicação
 * Executa os comandos na ordem: git pull -> npm install -> build -> migrations -> pm2 reload
 */
export class SelfUpdateService {
  private readonly projectRoot: string;
  private readonly backendPath: string;
  private readonly pm2ProcessName: string;
  private readonly backendPort: number;
  private readonly backendUrl: string;

  constructor() {
    const currentDir = __dirname;
    logger.info('Inicializando SelfUpdateService', { currentDir });
    
    // 1. Encontrar a raiz do Git (onde está a pasta .git)
    // Isso vai procurar em /opt/backnet.prod/backend/dist/..., subir até achar /opt/backnet.prod
    const gitRoot = this.findPathWith(currentDir, '.git');
    
    if (gitRoot) {
      this.projectRoot = gitRoot;
    } else {
      // Fallback de emergência se não achar (mas o findPathWith deve achar)
      this.projectRoot = path.resolve(currentDir, '../../..');
      logger.error('CRÍTICO: Não foi possível encontrar a pasta .git automaticamente.');
    }

    // 2. Definir onde o backend roda (para npm install, build, migrations)
    // O backend está dentro da pasta 'backend' relativa ao git root?
    // Se o script está rodando, ele já está dentro do backend.
    // Vamos procurar o package.json mais próximo do script atual.
    const backendRoot = this.findPathWith(currentDir, 'package.json');
    this.backendPath = backendRoot || path.resolve(this.projectRoot, 'backend');

    this.pm2ProcessName = process.env.PM2_PROCESS_NAME || 'BackNet-backend';
    
    // 3. Configurar URL do backend para health check
    this.backendPort = parseInt(process.env.PORT || '3001', 10);
    // Usar localhost para health check interno (mesmo servidor)
    this.backendUrl = `http://localhost:${this.backendPort}`;
    
    logger.info('SelfUpdateService Configurado', {
      currentDir,
      projectRoot: this.projectRoot, // Deve ser /opt/backnet.prod
      backendPath: this.backendPath, // Deve ser /opt/backnet.prod/backend
      hasGit: fs.existsSync(path.join(this.projectRoot, '.git')),
      hasPackageJson: fs.existsSync(path.join(this.backendPath, 'package.json'))
    });
  }

  /**
   * Sobe os diretórios recursivamente procurando por um arquivo ou pasta específica
   */
  private findPathWith(startPath: string, targetItem: string): string | null {
    let currentPath = startPath;
    const rootPath = path.parse(startPath).root; // Ex: /

    // Loop para subir diretórios até chegar na raiz do sistema
    while (currentPath !== rootPath) {
      const targetPath = path.join(currentPath, targetItem);
      
      if (fs.existsSync(targetPath)) {
        return currentPath;
      }
      
      // Sobe um nível
      currentPath = path.dirname(currentPath);
    }

    // Verifica a raiz do sistema também
    if (fs.existsSync(path.join(rootPath, targetItem))) {
      return rootPath;
    }

    return null;
  }

  /**
   * Executa um comando shell de forma segura
   */
  private async executeCommand(
    command: string,
    cwd: string,
    description: string
  ): Promise<CommandResult> {
    try {
      // Verificar se o diretório existe
      if (!fs.existsSync(cwd)) {
        const errorMsg = `Diretório não existe: ${cwd}`;
        logger.error(`Erro ao executar: ${description}`, { error: errorMsg });
        return {
          success: false,
          stdout: '',
          stderr: errorMsg,
          error: errorMsg,
        };
      }

      logger.info(`Executando: ${description}`, { command, cwd });

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'production',
        },
      });

      // Log apenas informações essenciais (sem URLs, tokens, etc)
      logger.info(`${description} concluído`, {
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorOutput = error as { stdout?: string; stderr?: string; code?: number };

      // Log detalhado do erro com mais informações
      const stderrPreview = errorOutput.stderr?.substring(0, 2000) || ''; // Primeiros 2000 chars
      const stdoutPreview = errorOutput.stdout?.substring(0, 2000) || ''; // Primeiros 2000 chars
      
      logger.error(`Erro ao executar: ${description}`, {
        error: errorMessage,
        code: errorOutput.code,
        command,
        cwd,
        stdoutLength: errorOutput.stdout?.length || 0,
        stderrLength: errorOutput.stderr?.length || 0,
        stdout: stdoutPreview,
        stderr: stderrPreview,
      });

      return {
        success: false,
        stdout: errorOutput.stdout?.trim() || '',
        stderr: errorOutput.stderr?.trim() || '',
        error: errorMessage,
      };
    }
  }

  /**
   * Verifica configuração do Git
   */
  private async checkGitConfig(gitRoot?: string): Promise<{ valid: boolean; remote?: string; branch?: string }> {
    const root = gitRoot || this.projectRoot;
    
    try {
      // Verificar remote
      const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', {
        cwd: root,
        timeout: 5000,
      });
      
      // Verificar branch atual
      const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: root,
        timeout: 5000,
      });
      
      return {
        valid: true,
        remote: remoteUrl.trim(),
        branch: currentBranch.trim(),
      };
    } catch (error) {
      logger.error('Erro ao verificar configuração do Git', {
        gitRoot: root,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return { valid: false };
    }
  }

  /**
   * Encontra o diretório raiz do repositório Git
   */
  private findGitRoot(startPath: string): string | null {
    let currentPath = path.resolve(startPath);
    const rootPath = path.parse(currentPath).root;
    const searchedPaths: string[] = [];
    
    logger.info('Iniciando busca por repositório Git', {
      startPath,
      resolvedPath: currentPath,
      rootPath,
    });
    
    // Verificar se o diretório inicial existe
    if (!fs.existsSync(currentPath)) {
      logger.error('Diretório inicial não existe', { currentPath });
      return null;
    }
    
    while (currentPath !== rootPath) {
      searchedPaths.push(currentPath);
      const gitDir = path.join(currentPath, '.git');
      
      logger.debug('Verificando diretório', {
        currentPath,
        gitDir,
        exists: fs.existsSync(gitDir),
      });
      
      if (fs.existsSync(gitDir)) {
        // Verificar se é realmente um diretório Git (pode ser um arquivo worktree)
        const gitStat = fs.statSync(gitDir);
        if (gitStat.isDirectory() || gitStat.isFile()) {
          logger.info('Repositório Git encontrado', {
            gitRoot: currentPath,
            gitDir,
            isDirectory: gitStat.isDirectory(),
            isFile: gitStat.isFile(),
            searchedPaths: searchedPaths.length,
          });
          return currentPath;
        }
      }
      
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        // Evitar loop infinito
        break;
      }
      currentPath = parentPath;
    }
    
    // Verificar também a raiz do sistema
    searchedPaths.push(rootPath);
    const rootGitDir = path.join(rootPath, '.git');
    if (fs.existsSync(rootGitDir)) {
      logger.info('Repositório Git encontrado na raiz do sistema', { gitRoot: rootPath });
      return rootPath;
    }
    
    logger.error('Repositório Git não encontrado em nenhum diretório pesquisado', {
      startPath,
      searchedPaths,
      totalPaths: searchedPaths.length,
    });
    
    return null;
  }

  /**
   * Executa git pull na branch especificada
   */
  private async gitPull(branch: string = 'main'): Promise<CommandResult> {
    // Tentar encontrar o repositório Git usando git rev-parse primeiro (mais confiável)
    // git rev-parse funciona mesmo se executado de qualquer subdiretório do repositório
    let gitRoot: string | null = null;
    
    // Lista de diretórios para tentar git rev-parse (em ordem de prioridade)
    // Começar pelo diretório atual (__dirname) que é onde o código está rodando
    const currentDir = __dirname;
    const directoriesToTry = [
      currentDir,           // Diretório atual do código (mais provável de funcionar)
      this.backendPath,     // Diretório do backend
      this.projectRoot,     // Diretório raiz do projeto
    ];
    
    logger.info('Tentando encontrar repositório Git usando git rev-parse', {
      directoriesToTry,
      currentDir,
      backendPath: this.backendPath,
      projectRoot: this.projectRoot,
    });
    
    for (const dir of directoriesToTry) {
      if (!fs.existsSync(dir)) {
        logger.debug('Diretório não existe, pulando', { dir });
        continue;
      }
      
      try {
        // Tentar usar git rev-parse para encontrar o top-level do repositório
        // Isso funciona mesmo se executado de qualquer subdiretório do repositório clonado
        const { stdout: gitTopLevel } = await execAsync('git rev-parse --show-toplevel', {
          cwd: dir,
          timeout: 5000,
        });
        
        if (gitTopLevel && gitTopLevel.trim()) {
          gitRoot = gitTopLevel.trim();
          logger.info('Repositório Git encontrado usando git rev-parse', {
            gitRoot,
            triedFrom: dir,
            projectRoot: this.projectRoot,
            backendPath: this.backendPath,
          });
          break;
        }
      } catch (error) {
        logger.debug('git rev-parse falhou neste diretório', {
          dir,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
    
    // Se git rev-parse não funcionou, tentar busca manual
    if (!gitRoot) {
      const gitDir = path.join(this.projectRoot, '.git');
      
      if (fs.existsSync(gitDir)) {
        gitRoot = this.projectRoot;
        logger.info('Repositório Git encontrado no projectRoot', { gitRoot });
      } else {
        logger.warn('Diretório .git não encontrado no projectRoot, procurando em diretórios pais', {
          projectRoot: this.projectRoot,
          gitDir,
        });
        
        const foundGitRoot = this.findGitRoot(this.projectRoot);
        if (foundGitRoot) {
          gitRoot = foundGitRoot;
          logger.info('Repositório Git encontrado em diretório pai', { gitRoot });
        } else {
          logger.error('Diretório .git não encontrado', {
            projectRoot: this.projectRoot,
            backendPath: this.backendPath,
            searchedFrom: this.projectRoot,
          });
          return {
            success: false,
            stdout: '',
            stderr: `Diretório .git não encontrado. Procurado em ${this.projectRoot} e diretórios pais. Certifique-se de que o repositório Git está configurado corretamente em produção. O repositório de produção deve ser um clone Git válido.`,
            error: 'Repositório Git não encontrado',
          };
        }
      }
    }
    
    if (!gitRoot) {
      logger.error('Não foi possível determinar o diretório raiz do Git', {
        projectRoot: this.projectRoot,
        backendPath: this.backendPath,
      });
      return {
        success: false,
        stdout: '',
        stderr: 'Não foi possível determinar o diretório raiz do repositório Git. Verifique se o repositório está configurado corretamente.',
        error: 'Repositório Git não encontrado',
      };
    }

    // Verificar configuração do Git
    const gitConfig = await this.checkGitConfig(gitRoot);
    if (!gitConfig.valid) {
      logger.error('Configuração do Git inválida', { gitRoot });
      return {
        success: false,
        stdout: '',
        stderr: 'Configuração do Git inválida. Verifique se o repositório está configurado corretamente.',
        error: 'Configuração do Git inválida',
      };
    }

    logger.info('Configuração do Git verificada', {
      gitRoot,
      remote: gitConfig.remote,
      currentBranch: gitConfig.branch,
      targetBranch: branch,
    });

    // Tentar fazer fetch primeiro para atualizar referências remotas
    logger.info('Executando git fetch antes do pull');
    const fetchResult = await this.executeCommand('git fetch origin', gitRoot, 'Git Fetch');
    
    if (!fetchResult.success) {
      logger.warn('Git fetch falhou, mas continuando com pull', {
        error: fetchResult.error || fetchResult.stderr,
      });
    }

    // Executar git pull com flags para garantir que todos os arquivos sejam baixados
    // --no-rebase: evita problemas com branches
    // Garantir que todos os arquivos sejam baixados, incluindo novos diretórios
    const command = `git pull origin ${branch} --no-rebase`;
    const pullResult = await this.executeCommand(command, gitRoot, 'Git Pull');
    
    // Após git pull, verificar se pasta scripts existe e criar se necessário
    if (pullResult.success) {
      const scriptsDir = path.join(gitRoot, 'scripts');
      if (!fs.existsSync(scriptsDir)) {
        logger.info('Pasta scripts não encontrada após git pull, criando...', {
          scriptsDir,
        });
        try {
          fs.mkdirSync(scriptsDir, { recursive: true });
          logger.info('Pasta scripts criada');
        } catch (error) {
          logger.warn('Erro ao criar pasta scripts', {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }
      
      // Verificar se arquivos da pasta scripts foram baixados
      const expectedScripts = [
        'install-elasticsearch.sh',
        'setup.sh',
        'README.md'
      ];
      
      for (const scriptFile of expectedScripts) {
        const scriptPath = path.join(scriptsDir, scriptFile);
        if (!fs.existsSync(scriptPath)) {
          logger.warn(`Script ${scriptFile} não encontrado após git pull`, {
            scriptPath,
          });
        }
      }
    }
    
    // Se pull falhar, tentar verificar se há mudanças locais não commitadas
    if (!pullResult.success) {
      try {
        const { stdout: status } = await execAsync('git status --porcelain', {
          cwd: gitRoot,
          timeout: 5000,
        });
        
        if (status.trim()) {
          logger.warn('Há mudanças locais não commitadas', { status: status.trim() });
          // Tentar fazer stash e pull
          logger.info('Tentando fazer stash das mudanças locais');
          await execAsync('git stash', { cwd: gitRoot, timeout: 10000 });
          const pullAfterStash = await this.executeCommand(command, gitRoot, 'Git Pull (após stash)');
          if (pullAfterStash.success) {
            logger.info('Git pull bem-sucedido após stash');
            return pullAfterStash;
          }
        }
      } catch (error) {
        logger.error('Erro ao verificar status do Git', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
    
    return pullResult;
  }

  /**
   * Verifica e instala Elasticsearch se necessário
   * Retorna sucesso mesmo se já estiver instalado
   * O script verifica internamente se já está instalado
   */
  private async setupElasticsearch(): Promise<CommandResult> {
    const scriptsDir = path.join(this.projectRoot, 'scripts');
    const setupScriptPath = path.join(scriptsDir, 'install-elasticsearch.sh');
    
    logger.info('Iniciando verificação/instalação do Elasticsearch', {
      scriptPath: setupScriptPath,
      projectRoot: this.projectRoot,
      scriptsDir,
      scriptExists: fs.existsSync(setupScriptPath),
      scriptsDirExists: fs.existsSync(scriptsDir),
    });
    
    // Verificar se a pasta scripts existe, se não, criar
    if (!fs.existsSync(scriptsDir)) {
      logger.info('Pasta scripts não encontrada, criando...', {
        scriptsDir,
      });
      try {
        fs.mkdirSync(scriptsDir, { recursive: true });
        logger.info('Pasta scripts criada com sucesso');
      } catch (error) {
        logger.error('Erro ao criar pasta scripts', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
    
    // Verificar se o script existe
    if (!fs.existsSync(setupScriptPath)) {
      logger.warn('Script de instalação do Elasticsearch não encontrado após git pull', {
        scriptPath: setupScriptPath,
        projectRoot: this.projectRoot,
      });
      
      // Tentar baixar o script diretamente do repositório
      logger.info('Tentando baixar script do repositório...');
      try {
        const https = await import('https');
        const fsPromises = await import('fs/promises');
        
        const scriptUrl = 'https://raw.githubusercontent.com/Luminous-Telecom/BackNet-ERP/main/scripts/install-elasticsearch.sh';
        const response = await new Promise<Buffer>((resolve, reject) => {
          https.get(scriptUrl, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
          }).on('error', reject);
        });
        
        await fsPromises.writeFile(setupScriptPath, response, { mode: 0o755 });
        logger.info('Script baixado do repositório com sucesso', {
          scriptPath: setupScriptPath,
        });
      } catch (downloadError) {
        logger.error('Falha ao baixar script do repositório', {
          error: downloadError instanceof Error ? downloadError.message : 'Erro desconhecido',
        });
        return {
          success: false,
          stdout: '',
          stderr: `Script de instalação não encontrado e não foi possível baixar. Execute manualmente: sudo apt update && sudo apt install -y elasticsearch`,
          error: 'Script não encontrado e download falhou',
        };
      }
    }

    // Verificar se o script tem permissão de execução
    try {
      const stats = fs.statSync(setupScriptPath);
      if (!(stats.mode & parseInt('111', 8))) {
        logger.info('Adicionando permissão de execução ao script');
        fs.chmodSync(setupScriptPath, '755');
      }
    } catch (error) {
      logger.warn('Erro ao verificar/adicionar permissão de execução', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }

    // Verificar se está rodando como root (não precisa sudo)
    let command: string;
    let needsSudo = false;
    
    try {
      const { stdout: whoami } = await execAsync('whoami', { timeout: 2000 });
      const isRoot = whoami.trim() === 'root';
      
      if (isRoot) {
        logger.info('Processo rodando como root, executando script sem sudo');
        command = `bash "${setupScriptPath}"`;
        needsSudo = false;
      } else {
        logger.info('Processo não é root, verificando se sudo está disponível sem senha');
        // Verificar se sudo está disponível sem senha
        try {
          await execAsync('sudo -n true', { timeout: 2000 });
          logger.info('Sudo disponível sem senha, executando script com sudo');
          command = `sudo bash "${setupScriptPath}"`;
          needsSudo = true;
        } catch (sudoError) {
          logger.error('Sudo requer senha ou não está configurado. Instalação do Elasticsearch falhará.', {
            error: sudoError instanceof Error ? sudoError.message : 'Erro desconhecido',
          });
          // Tentar mesmo assim (pode funcionar se o script se reexecutar com sudo)
          command = `sudo bash "${setupScriptPath}"`;
          needsSudo = true;
        }
      }
    } catch (error) {
      // Se não conseguir verificar, tentar com sudo
      logger.warn('Não foi possível verificar usuário, tentando com sudo', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      command = `sudo bash "${setupScriptPath}"`;
      needsSudo = true;
    }
    
    // Executar script de instalação
    // O script verifica internamente se já está instalado e sai se estiver
    logger.info('Executando script de instalação do Elasticsearch', {
      scriptPath: setupScriptPath,
      command,
    });
    
    const result = await this.executeCommand(command, this.projectRoot, 'Elasticsearch Setup');
    
    // Log detalhado do resultado
    if (result.success) {
      logger.info('Script de instalação do Elasticsearch executado com sucesso', {
        stdout: result.stdout.substring(0, 500), // Primeiros 500 chars
        hasStderr: !!result.stderr,
      });
    } else {
      logger.error('Falha ao executar script de instalação do Elasticsearch', {
        error: result.error,
        stderr: result.stderr.substring(0, 1000), // Primeiros 1000 chars
        stdout: result.stdout.substring(0, 500),
      });
    }
    
    return result;
  }

  /**
   * Adiciona variáveis do Elasticsearch ao .env do backend se não existirem
   */
  private async configureElasticsearchEnv(): Promise<CommandResult> {
    const envPath = path.join(this.backendPath, '.env');
    
    try {
      logger.info('Verificando arquivo .env para configuração do Elasticsearch', {
        envPath,
        backendPath: this.backendPath,
        envExists: fs.existsSync(envPath),
      });

      // Verificar se o arquivo .env existe
      if (!fs.existsSync(envPath)) {
        logger.warn('Arquivo .env não encontrado, pulando configuração do Elasticsearch', {
          envPath,
          backendPath: this.backendPath,
        });
        return {
          success: true,
          stdout: 'Arquivo .env não encontrado, pulando configuração',
          stderr: '',
        };
      }

      // Ler conteúdo do .env
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      logger.debug('Conteúdo do .env lido', {
        contentLength: envContent.length,
        hasElasticsearchNode: envContent.includes('ELASTICSEARCH_NODE'),
      });
      
      // Verificar se as variáveis já existem
      if (envContent.includes('ELASTICSEARCH_NODE')) {
        logger.info('Variáveis do Elasticsearch já configuradas no .env');
        return {
          success: true,
          stdout: 'Variáveis do Elasticsearch já configuradas',
          stderr: '',
        };
      }

      // Adicionar variáveis do Elasticsearch
      const elasticsearchConfig = `

# Configurações do Elasticsearch (Auditoria)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=backnet-auditoria
`;

      // Verificar se o arquivo termina com quebra de linha
      const needsNewline = !envContent.endsWith('\n');
      const configToAdd = needsNewline ? elasticsearchConfig : elasticsearchConfig.substring(1);

      fs.appendFileSync(envPath, configToAdd, 'utf8');
      
      // Verificar se foi adicionado corretamente
      const updatedContent = fs.readFileSync(envPath, 'utf8');
      const wasAdded = updatedContent.includes('ELASTICSEARCH_NODE');
      
      if (!wasAdded) {
        throw new Error('Falha ao adicionar variáveis do Elasticsearch ao .env');
      }
      
      logger.info('Variáveis do Elasticsearch adicionadas ao .env com sucesso', {
        envPath,
        fileSize: updatedContent.length,
      });

      return {
        success: true,
        stdout: `Variáveis do Elasticsearch adicionadas ao .env em ${envPath}`,
        stderr: '',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao configurar variáveis do Elasticsearch no .env', {
        envPath,
        backendPath: this.backendPath,
        error: errorMessage,
        stack: errorStack,
      });
      
      return {
        success: false,
        stdout: '',
        stderr: `Erro ao adicionar variáveis ao .env: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Instala dependências npm
   */
  private async npmInstall(): Promise<CommandResult> {
    const command = 'npm install';
    return this.executeCommand(command, this.backendPath, 'NPM Install');
  }

  /**
   * Executa o build da aplicação
   */
  private async build(): Promise<CommandResult> {
    // Verificar se o diretório src existe antes de tentar fazer build
    const srcPath = path.join(this.backendPath, 'src');
    if (!fs.existsSync(srcPath)) {
      logger.warn('Diretório src não encontrado, pulando build (já está compilado?)', {
        backendPath: this.backendPath,
        srcPath,
      });
      return {
        success: true,
        stdout: 'Build pulado: código já está compilado (diretório src não encontrado)',
        stderr: '',
      };
    }

    const command = 'npm run build';
    return this.executeCommand(command, this.backendPath, 'Build');
  }

  /**
   * Executa as migrations do banco de dados
   */
  private async migrate(): Promise<CommandResult> {
    const command = 'npm run migrate';
    return this.executeCommand(command, this.backendPath, 'Migrations');
  }

  /**
   * Limpa a versão no package.json removendo commit hash (mantém apenas SemVer)
   * Segue padrão Semantic Versioning: MAIOR.MENOR.CORREÇÃO (ex: 1.0.0)
   */
  private async updateVersion(): Promise<CommandResult> {
    try {
      // Ler package.json
      const packageJsonPath = path.join(this.backendPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        logger.warn('package.json não encontrado para atualizar versão');
        return {
          success: true,
          stdout: 'package.json não encontrado, versão não atualizada',
          stderr: '',
        };
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const oldVersion = packageJson.version;
      
      // Extrair apenas a versão SemVer (remover qualquer sufixo após hífen)
      // Ex: "1.0.0-19a35e97" -> "1.0.0"
      // Ex: "1.0.0" -> "1.0.0"
      const baseVersion = packageJson.version.split('-')[0];
      
      // Validar formato SemVer básico (MAIOR.MENOR.CORREÇÃO)
      const semverPattern = /^\d+\.\d+\.\d+$/;
      if (!semverPattern.test(baseVersion)) {
        logger.warn('Versão no package.json não segue formato SemVer', {
          version: baseVersion,
        });
        return {
          success: true,
          stdout: `Versão não segue SemVer (${baseVersion}), mantendo como está`,
          stderr: '',
        };
      }

      // Atualizar versão apenas se houver sufixo para remover
      if (packageJson.version !== baseVersion) {
        packageJson.version = baseVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
        logger.info('Versão limpa no package.json (SemVer sem hash)', {
          oldVersion,
          newVersion: baseVersion,
        });
        return {
          success: true,
          stdout: `Versão atualizada para SemVer: ${baseVersion}`,
          stderr: '',
        };
      } else {
        logger.debug('Versão já está em formato SemVer', { version: baseVersion });
        return {
          success: true,
          stdout: `Versão já está em formato SemVer: ${baseVersion}`,
          stderr: '',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.warn('Erro ao atualizar versão no package.json', {
        error: errorMessage,
      });
      // Não falhar o processo se a atualização de versão falhar
      return {
        success: true,
        stdout: 'Erro ao atualizar versão, mas processo continua',
        stderr: errorMessage,
      };
    }
  }

  /**
   * Verifica se o processo PM2 existe
   */
  private async checkPM2Process(): Promise<{ exists: boolean; processInfo?: string }> {
    try {
      const { stdout } = await execAsync(`pm2 list`, {
        cwd: this.projectRoot,
        maxBuffer: 1024 * 1024, // 1MB
      });
      
      // Verificar se o processo está na lista
      const processExists = stdout.includes(this.pm2ProcessName);
      
      return {
        exists: processExists,
        processInfo: processExists ? stdout : undefined,
      };
    } catch (error) {
      logger.error('Erro ao verificar processos PM2', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return { exists: false };
    }
  }

  /**
   * Reinicia o processo no PM2
   * Usa restart com --update-env para recarregar variáveis de ambiente do .env
   */
  private async pm2Reload(): Promise<CommandResult> {
    // Verificar se o processo existe antes de tentar reload
    const processCheck = await this.checkPM2Process();
    
    if (!processCheck.exists) {
      logger.warn('Processo PM2 não encontrado, tentando restart', {
        processName: this.pm2ProcessName,
      });
      
      // Se não existe, tentar restart (pode ser que o processo não esteja rodando)
      const restartCommand = `pm2 restart ${this.pm2ProcessName} --update-env`;
      const restartResult = await this.executeCommand(restartCommand, this.projectRoot, 'PM2 Restart');
      
      if (!restartResult.success) {
        // Se restart também falhar, tentar start usando ecosystem.config.js
        logger.warn('PM2 restart falhou, tentando start com ecosystem.config.js');
        
        // Verificar se ecosystem.config.js existe
        const ecosystemPath = path.join(this.projectRoot, 'ecosystem.config.js');
        if (!fs.existsSync(ecosystemPath)) {
          logger.error('ecosystem.config.js não encontrado', { 
            path: ecosystemPath,
            projectRoot: this.projectRoot,
          });
          return {
            success: false,
            stdout: '',
            stderr: `ecosystem.config.js não encontrado em ${ecosystemPath}. Verifique se o arquivo existe no diretório raiz do projeto.`,
            error: 'ecosystem.config.js não encontrado',
          };
        }
        
        // Tentar start com ecosystem.config.js usando --only
        logger.info('Tentando PM2 start com --only', { processName: this.pm2ProcessName });
        const startCommand = `pm2 start ecosystem.config.js --only ${this.pm2ProcessName} --update-env`;
        const startResult = await this.executeCommand(startCommand, this.projectRoot, 'PM2 Start');
        
        // Se start com --only falhar, tentar start sem filtro (inicia todos os processos)
        if (!startResult.success) {
          logger.warn('PM2 start com --only falhou, tentando start sem filtro', {
            error: startResult.error || startResult.stderr,
          });
          const startAllCommand = `pm2 start ecosystem.config.js --update-env`;
          const startAllResult = await this.executeCommand(startAllCommand, this.projectRoot, 'PM2 Start (todos)');
          
          // Se ainda falhar, tentar start direto do script
          if (!startAllResult.success) {
            logger.warn('PM2 start com ecosystem.config.js falhou, tentando start direto do script');
            const directStartCommand = `pm2 start ${path.join(this.backendPath, 'dist', 'index.js')} --name ${this.pm2ProcessName} --cwd ${this.backendPath} --update-env`;
            return this.executeCommand(directStartCommand, this.projectRoot, 'PM2 Start (direto)');
          }
          
          return startAllResult;
        }
        
        return startResult;
      }
      
      return restartResult;
    }

    // Se o processo existe, usar restart com --update-env para recarregar variáveis de ambiente
    // O reload não recarrega variáveis de ambiente do .env, então usamos restart
    logger.info('Reiniciando PM2 com --update-env para recarregar variáveis de ambiente');
    const command = `pm2 restart ${this.pm2ProcessName} --update-env`;
    const restartResult = await this.executeCommand(command, this.projectRoot, 'PM2 Restart (com --update-env)');
    
    // Se restart falhar, tentar reload como fallback (mas sem recarregar env)
    if (!restartResult.success) {
      logger.warn('PM2 restart com --update-env falhou, tentando reload como fallback');
      const reloadCommand = `pm2 reload ${this.pm2ProcessName}`;
      return this.executeCommand(reloadCommand, this.projectRoot, 'PM2 Reload (fallback)');
    }
    
    return restartResult;
  }

  /**
   * Aguarda o backend estar pronto após PM2 reload
   * Faz requisições ao endpoint /health até receber resposta 200
   */
  private async waitForBackendReady(maxAttempts: number = 30, delayMs: number = 1000): Promise<boolean> {
    logger.info('Aguardando backend estar pronto após PM2 reload', {
      maxAttempts,
      delayMs,
      healthUrl: `${this.backendUrl}/health`,
    });

    for (let i = 0; i < maxAttempts; i++) {
      // Tentar ambos os endpoints de health check
      const healthEndpoints = [`${this.backendUrl}/health`, `${this.backendUrl}/api/health`];
      let healthCheckSuccess = false;
      
      for (const healthUrl of healthEndpoints) {
        try {
          // Tentar fazer uma requisição simples ao health check do backend
          const response = await axios.get(healthUrl, {
            timeout: 2000,
            validateStatus: (status) => status === 200,
          });

          // Aceitar tanto 'ok' quanto 'OK' como status válido
          if (response.status === 200 && (response.data?.status === 'ok' || response.data?.status === 'OK')) {
            logger.info('Backend está pronto após PM2 reload', {
              attempts: i + 1,
              maxAttempts,
              responseTime: `${(i + 1) * delayMs}ms`,
              healthUrl,
            });
            return true;
          }
        } catch (error) {
          // Continuar tentando o próximo endpoint
          continue;
        }
      }
      
      // Se nenhum endpoint respondeu, aguardar antes de tentar novamente
      if (i < maxAttempts - 1) {
        // Não logar nas primeiras tentativas para não poluir os logs
        if (i === 0 || i === 4 || i === 9) {
          logger.debug('Backend ainda não está pronto, aguardando...', {
            attempt: i + 1,
            maxAttempts,
          });
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.warn('Backend não respondeu após múltiplas tentativas', {
      maxAttempts,
      totalWaitTime: `${maxAttempts * delayMs}ms`,
      healthUrl: `${this.backendUrl}/health`,
    });
    return false;
  }

  /**
   * Verifica se os comandos necessários estão disponíveis
   */
  private async verifyCommands(): Promise<{ success: boolean; missing: string[] }> {
    const commands = ['git', 'npm', 'pm2'];
    const missing: string[] = [];

    for (const cmd of commands) {
      try {
        await execAsync(`which ${cmd}`, { timeout: 5000 });
      } catch {
        missing.push(cmd);
      }
    }

    if (missing.length > 0) {
      logger.error('Comandos necessários não encontrados', { missing });
    }

    return { success: missing.length === 0, missing };
  }

  /**
   * Executa o processo completo de atualização
   * Retorna o resultado ANTES de reiniciar o PM2 para que o frontend possa exibir feedback
   */
  async executeUpdate(branch: string = 'main'): Promise<UpdateResult> {
    // Verificar se os comandos necessários estão disponíveis
    const commandCheck = await this.verifyCommands();
    if (!commandCheck.success) {
      return {
        success: false,
        message: `Comandos necessários não encontrados: ${commandCheck.missing.join(', ')}`,
        steps: {
          elasticsearch: { success: false, stdout: '', stderr: '' },
          gitPull: { success: false, stdout: '', stderr: `Comandos faltando: ${commandCheck.missing.join(', ')}` },
          npmInstall: { success: false, stdout: '', stderr: '' },
          build: { success: false, stdout: '', stderr: '' },
          migrate: { success: false, stdout: '', stderr: '' },
        },
      };
    }

    const steps = {
      elasticsearch: { success: false, stdout: '', stderr: '' } as CommandResult,
      gitPull: await this.gitPull(branch),
      npmInstall: { success: false, stdout: '', stderr: '' } as CommandResult,
      build: { success: false, stdout: '', stderr: '' } as CommandResult,
      migrate: { success: false, stdout: '', stderr: '' } as CommandResult,
    };

    // Passo 0: Verificar/Instalar Elasticsearch (apenas se não estiver instalado)
    logger.info('Verificando Elasticsearch...');
    steps.elasticsearch = await this.setupElasticsearch();
    if (!steps.elasticsearch.success) {
      // Não falhar o processo se a instalação do Elasticsearch falhar
      // Pode ser que já esteja instalado ou que não seja necessário
      logger.warn('Falha ao verificar/instalar Elasticsearch, mas continuando o processo', {
        error: steps.elasticsearch.error || steps.elasticsearch.stderr,
      });
    } else {
      logger.info('Elasticsearch verificado/instalado com sucesso', {
        output: steps.elasticsearch.stdout,
      });
    }

    // Passo 1: Git Pull (PRIMEIRO, para ter o código mais recente)
    if (!steps.gitPull.success) {
      return {
        success: false,
        message: `Falha ao executar git pull: ${steps.gitPull.error || steps.gitPull.stderr}`,
        steps,
      };
    }

    // Passo 1.5: Configurar variáveis do Elasticsearch no .env (DEPOIS do git pull)
    // Isso garante que qualquer correção no método seja aplicada
    logger.info('Configurando variáveis do Elasticsearch no .env...');
    const envConfigResult = await this.configureElasticsearchEnv();
    if (!envConfigResult.success) {
      logger.warn('Falha ao configurar variáveis do Elasticsearch no .env, mas continuando o processo', {
        error: envConfigResult.error || envConfigResult.stderr,
      });
    } else {
      logger.info('Variáveis do Elasticsearch configuradas no .env', {
        output: envConfigResult.stdout,
        envPath: path.join(this.backendPath, '.env'),
      });
    }

    // Passo 1.5: Limpar versão no package.json removendo commit hash (manter apenas SemVer)
    // Nota: A versão já deve estar em formato SemVer correto após git pull
    // Este passo apenas garante que não há sufixos indesejados
    logger.info('Verificando versão no package.json (formato SemVer)');
    const updateVersionResult = await this.updateVersion();
    if (!updateVersionResult.success) {
      logger.warn('Falha ao verificar versão, mas continuando o processo', {
        error: updateVersionResult.error || updateVersionResult.stderr,
      });
    } else {
      logger.info('Versão verificada com sucesso', {
        versionInfo: updateVersionResult.stdout,
      });
    }

    // Passo 2: NPM Install
    steps.npmInstall = await this.npmInstall();
    if (!steps.npmInstall.success) {
      return {
        success: false,
        message: `Falha ao instalar dependências: ${steps.npmInstall.error || steps.npmInstall.stderr}`,
        steps,
      };
    }

    // Passo 3: Build
    steps.build = await this.build();
    if (!steps.build.success) {
      return {
        success: false,
        message: `Falha ao executar build: ${steps.build.error || steps.build.stderr}`,
        steps,
      };
    }

    // Passo 4: Migrations (CRÍTICO - se falhar, para tudo)
    steps.migrate = await this.migrate();
    if (!steps.migrate.success) {
      return {
        success: false,
        message: `Falha ao executar migrations: ${steps.migrate.error || steps.migrate.stderr}. O processo foi interrompido por segurança.`,
        steps,
      };
    }

    // Se chegou até aqui, tudo deu certo
    // Retorna sucesso ANTES de reiniciar o PM2
    return {
      success: true,
      message: 'Atualização concluída com sucesso. A aplicação será reiniciada em breve.',
      steps,
    };
  }

  /**
   * Reinicia o PM2 e aguarda o backend estar pronto
   * Este método aguarda o PM2 reload completar E o backend estar pronto antes de retornar
   */
  async reloadPM2(): Promise<CommandResult> {
    // Executar PM2 reload
    const reloadResult = await this.pm2Reload();
    
    // Se o reload foi bem-sucedido, aguardar o backend estar pronto
    if (reloadResult.success) {
      logger.info('PM2 reload executado com sucesso, aguardando backend estar pronto...');
      const isReady = await this.waitForBackendReady();
      
      if (!isReady) {
        logger.warn('Backend pode não estar completamente pronto após PM2 reload', {
          stdout: reloadResult.stdout,
          stderr: reloadResult.stderr,
        });
        // Retornar sucesso parcial com aviso
        return {
          ...reloadResult,
          stderr: reloadResult.stderr + '\nAviso: Backend pode não estar completamente pronto após múltiplas tentativas de health check',
        };
      }
      
      logger.info('PM2 reload concluído e backend está pronto para receber requisições');
    }
    
    return reloadResult;
  }
}

