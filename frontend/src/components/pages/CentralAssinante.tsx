import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CentralAssinanteService, DadosCentralAssinante, LoginCentralAssinanteRequest, RecuperarSenhaRequest, TrocarSenhaRequest } from 'services/centralAssinanteService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { ParametrosService } from 'services/parametrosService';
import { formatCurrency, formatDate } from 'utils/formatters';
import { Spinner, Button, Badge, Card, Input } from 'components/ui';
import { useNotificationContext, NotificationContainer } from 'components/notifications';
import 'styles/CentralAssinante.scss';

const CentralAssinante: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError, notifications, removeNotification, pauseNotification, resumeNotification } = useNotificationContext();
  const [activeTab, setActiveTab] = useState<'resumo' | 'contratos' | 'financeiro' | 'financeiro_pago' | 'termos'>('resumo');
  const [loginForm, setLoginForm] = useState<LoginCentralAssinanteRequest>({ login: '', senha: '' });
  const [showRecuperarSenha, setShowRecuperarSenha] = useState(false);
  const [recuperarSenhaForm, setRecuperarSenhaForm] = useState<RecuperarSenhaRequest>({ cnpj: '', email: '' });
  // Tipo local para o formulário de trocar senha (inclui confirmação)
  type TrocarSenhaForm = TrocarSenhaRequest & { confirmarNovaSenha: string };
  
  const [showTrocarSenha, setShowTrocarSenha] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [trocarSenhaForm, setTrocarSenhaForm] = useState<TrocarSenhaForm>({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
  
  const [centralToken, setCentralToken] = useState<string | null>(() => CentralAssinanteService.getCentralToken());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!CentralAssinanteService.getCentralToken());
  const [faturaVisualizar, setFaturaVisualizar] = useState<{
    id: number;
    numero_titulo: string;
    valor: number;
    valor_final: number | null;
    valor_pago?: number | null;
    valor_aberto?: number | null;
    data_vencimento: string;
    data_pagamento?: string | null;
    status: string;
    plano: string | null;
    qrcode?: string | null;
    linha_digitavel?: string | null;
    descricao?: string | null;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [baixandoBoletoId, setBaixandoBoletoId] = useState<number | null>(null);
  const [baixandoContratoId, setBaixandoContratoId] = useState<number | null>(null);
  const [baixandoTermoId, setBaixandoTermoId] = useState<number | null>(null);
  const [baixandoReciboId, setBaixandoReciboId] = useState<number | null>(null);

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: (data: LoginCentralAssinanteRequest) => CentralAssinanteService.login(slug, data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const newToken = response.data.token;

        // Validar que token existe antes de navegar
        if (!newToken) {
          showError('Dados de autenticação inválidos. Tente novamente.');
          return;
        }

        CentralAssinanteService.setCentralToken(newToken);
        setCentralToken(newToken);
        setIsAuthenticated(true);
        showSuccess('Login realizado com sucesso!');
      }
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao realizar login';
      showError(message);
    }
  });

  // Query para buscar dados (só executa se autenticado)
  const { data: dados, isLoading, error } = useQuery<DadosCentralAssinante>({
    queryKey: ['central-assinante', centralToken, slug],
    queryFn: async () => {
      const response = await CentralAssinanteService.getDadosMe(slug);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Erro ao buscar dados');
      }
      return response.data;
    },
    enabled: !!(isAuthenticated && !!centralToken && !!slug),
    retry: false,
  });

  // Query para buscar dados públicos da empresa (logo) — usa slug quando disponível
  const { data: empresaData } = useQuery({
    queryKey: ['dados-empresa-public', slug],
    queryFn: () => slug
      ? DadosEmpresaService.getPublicBySlug(slug)
      : DadosEmpresaService.getPublic(),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });

  // Query para buscar parâmetros do sistema (método de login)
  const { data: parametrosData } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 5 * 60 * 1000,
  });

  // Determinar label e placeholder baseado no método de login configurado
  const loginFieldConfig = useMemo(() => {
    const metodoLogin = parametrosData?.data?.central_assinante_metodo_login || 'cnpj';
    
    if (metodoLogin === 'email') {
      return {
        label: 'Email',
        placeholder: 'Digite seu Email'
      };
    } else {
      return {
        label: 'CNPJ',
        placeholder: 'Digite seu CNPJ'
      };
    }
  }, [parametrosData?.data?.central_assinante_metodo_login]);

  // Atualizar título da página e meta description
  useEffect(() => {
    document.title = 'Central do Assinante';

    // Atualizar meta description apenas com o nome
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Central do Assinante');
    }

    // Atualizar favicon com logo da empresa se disponível
    // Evitar valores inválidos como "undefined"
    if (empresaData?.logo && empresaData.logo !== 'undefined') {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = empresaData.logo;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.type = 'image/x-icon';
        newLink.href = empresaData.logo;
        document.head.appendChild(newLink);
      }
    }

    // Cleanup: restaurar título padrão ao desmontar
    return () => {
      document.title = 'BackNet';
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', '');
      }
    };
  }, [empresaData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.login || !loginForm.senha) {
      showError('Preencha todos os campos');
      return;
    }
    loginMutation.mutate(loginForm);
  };

  // Mutation para recuperar senha
  const recuperarSenhaMutation = useMutation({
    mutationFn: (data: RecuperarSenhaRequest) => CentralAssinanteService.recuperarSenha(slug, data),
    onSuccess: () => {
      showSuccess('Instruções para recuperação de senha foram enviadas para seu email');
      setShowRecuperarSenha(false);
      setRecuperarSenhaForm({ cnpj: '', email: '' });
    },
    onError: (error: unknown) => {
      const message = (error as { message?: string })?.message || 'Erro ao recuperar senha';
      showError(message);
    }
  });

  const handleRecuperarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recuperarSenhaForm.cnpj || !recuperarSenhaForm.email) {
      showError('Preencha todos os campos');
      return;
    }
    recuperarSenhaMutation.mutate(recuperarSenhaForm);
  };

  // Mutation para trocar senha
  const trocarSenhaMutation = useMutation({
    mutationFn: (data: TrocarSenhaRequest) => {
      return CentralAssinanteService.trocarSenhaMe(slug, data);
    },
    onSuccess: () => {
      showSuccess('Senha alterada com sucesso');
      setShowTrocarSenha(false);
      setMostrarNovaSenha(false);
      setTrocarSenhaForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    },
    onError: (error: unknown) => {
      const message = (error as { message?: string })?.message || 'Erro ao alterar senha';
      showError(message);
    }
  });

  const handleTrocarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trocarSenhaForm.senhaAtual || !trocarSenhaForm.novaSenha || !trocarSenhaForm.confirmarNovaSenha) {
      showError('Preencha todos os campos');
      return;
    }
    if (trocarSenhaForm.novaSenha.length < 6) {
      showError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (trocarSenhaForm.novaSenha !== trocarSenhaForm.confirmarNovaSenha) {
      showError('As senhas não coincidem');
      return;
    }
    trocarSenhaMutation.mutate({ senhaAtual: trocarSenhaForm.senhaAtual, novaSenha: trocarSenhaForm.novaSenha });
  };

  const handleImprimirContrato = async (contratoId: number) => {
    setBaixandoContratoId(contratoId);
    try {
      const blob = await CentralAssinanteService.baixarContrato(slug, contratoId);
      CentralAssinanteService.abrirPdf(blob, `contrato-${contratoId}.pdf`);
    } catch (error) {
      showError('Erro ao baixar contrato');
    } finally {
      setBaixandoContratoId(null);
    }
  };

  const handleImprimirTermo = async (termoId: number) => {
    setBaixandoTermoId(termoId);
    try {
      const blob = await CentralAssinanteService.baixarTermo(slug, termoId);
      CentralAssinanteService.abrirPdf(blob, `termo-${termoId}.pdf`);
    } catch (error) {
      showError('Erro ao baixar termo');
    } finally {
      setBaixandoTermoId(null);
    }
  };

  const handleImprimirFatura = async (tituloId: number) => {
    setBaixandoBoletoId(tituloId);
    try {
      const blob = await CentralAssinanteService.baixarFatura(slug, tituloId);
      CentralAssinanteService.abrirPdf(blob, `boleto-${tituloId}.pdf`);
    } catch (error) {
      showError('Erro ao baixar boleto');
    } finally {
      setBaixandoBoletoId(null);
    }
  };

  const handleImprimirRecibo = async (tituloId: number) => {
    setBaixandoReciboId(tituloId);
    try {
      const blob = await CentralAssinanteService.baixarRecibo(slug, tituloId);
      CentralAssinanteService.abrirPdf(blob, `recibo-${tituloId}.pdf`);
    } catch (error) {
      showError('Erro ao baixar recibo');
    } finally {
      setBaixandoReciboId(null);
    }
  };

  const handleVisualizarFatura = (titulo: {
    id: number;
    numero_titulo: string;
    valor: number;
    valor_final: number | null;
    valor_pago?: number | null;
    valor_aberto?: number | null;
    data_vencimento: string;
    data_pagamento?: string | null;
    status: string;
    plano: string | null;
    qrcode?: string | null;
    linha_digitavel?: string | null;
    descricao?: string | null;
  }) => {
    setFaturaVisualizar(titulo);
  };

  const copiarCodigo = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      showSuccess('Código copiado!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedField(fieldName);
        showSuccess('Código copiado!');
        setTimeout(() => setCopiedField(null), 2000);
      } catch (err) {
        showError('Erro ao copiar. Por favor, selecione o texto manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCardClick = (tipo: 'contratos' | 'faturas' | 'termos' | 'faturas_pagas' | 'faturas_a_pagar' | 'faturas_atrasadas') => {
    if (tipo === 'contratos') {
      setActiveTab('contratos');
    } else if (tipo === 'termos') {
      setActiveTab('termos');
    } else if (tipo === 'faturas_pagas') {
      setActiveTab('financeiro_pago');
    } else if (tipo === 'faturas_a_pagar' || tipo === 'faturas_atrasadas') {
      setActiveTab('financeiro');
    } else {
      setActiveTab('financeiro');
    }
  };

  const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' | 'secondary' | 'info' => {
    const statusMap: Record<string, 'success' | 'danger' | 'warning' | 'secondary' | 'info'> = {
      ativo: 'success',
      inativo: 'secondary',
      suspenso: 'danger',
      pendente: 'warning',
      pago: 'success',
      vencido: 'danger',
      cancelado: 'secondary',
      parcial: 'info',
      pago_atraso: 'success',
    };
    return statusMap[status.toLowerCase()] || 'secondary';
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      suspenso: 'Suspenso',
      pendente: 'Pendente',
      pago: 'Pago',
      vencido: 'Vencido',
      cancelado: 'Cancelado',
      parcial: 'Parcial',
      pago_atraso: 'Pago com Atraso',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  // Verificar se algum contrato tem assinatura pendente (termos não assinados)
  const temContratoComAssinaturaPendente = (): boolean => {
    if (!dados) return false;
    
    // Para cada contrato, verificar se tem algum termo pendente
    return dados.contratos.some(contrato => {
      // Verificar se há algum termo deste contrato que não está assinado
      return dados.termos.some(termo => 
        termo.contrato_id === contrato.id && termo.assinado === 'NAO'
      );
    });
  };

  // Verificar se há termos com assinatura pendente
  const temTermosComAssinaturaPendente = (): boolean => {
    if (!dados) return false;
    return dados.termos.some(termo => termo.assinado === 'NAO');
  };

  // Modal de Recuperar Senha (verificar antes do login)
  if (showRecuperarSenha) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center py-2 px-2 central-assinante-container central-assinante-login-container">
        <div className="central-assinante-login-card">
          <div className="central-assinante-card-bg">
            <Card className="border-0">
              <div className="card-header text-center border-0 border-bottom border-secondary pb-2 pt-3 central-assinante-login-header">
                <h2 className="h6 mb-1 fw-bold text-white">
                  <i className="bi bi-key text-white-50 me-2"></i>
                  Recuperar Senha
                </h2>
                <p className="text-white-50 mb-0 small">Informe seu CNPJ e Email para recuperar sua senha</p>
              </div>
              <div className="card-body pt-2 px-3 pb-3 central-assinante-login-body">
                <form onSubmit={handleRecuperarSenha}>
                  <div className="mb-2">
                    <label htmlFor="recuperar-cnpj" className="form-label small text-white-50">CNPJ</label>
                    <Input
                      type="text"
                      id="recuperar-cnpj"
                      value={recuperarSenhaForm.cnpj}
                      onChange={(e) => setRecuperarSenhaForm({ ...recuperarSenhaForm, cnpj: String(e.value) })}
                      placeholder="Digite seu CNPJ"
                      required
                      disabled={recuperarSenhaMutation.isPending}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="recuperar-email" className="form-label small text-white-50">Email</label>
                    <Input
                      type="email"
                      id="recuperar-email"
                      value={recuperarSenhaForm.email}
                      onChange={(e) => setRecuperarSenhaForm({ ...recuperarSenhaForm, email: String(e.value) })}
                      placeholder="Digite seu Email"
                      required
                      disabled={recuperarSenhaMutation.isPending}
                    />
                  </div>

                  <div className="d-grid gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={recuperarSenhaMutation.isPending}
                      isLoading={recuperarSenhaMutation.isPending}
                    >
                      Enviar Senha
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-100"
                      onClick={() => {
                        setShowRecuperarSenha(false);
                        setRecuperarSenhaForm({ cnpj: '', email: '' });
                      }}
                      disabled={recuperarSenhaMutation.isPending}
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
        {/* Notification Container */}
        <NotificationContainer
          position="bottom-right"
          notifications={notifications}
          onRemove={removeNotification}
          onPause={pauseNotification}
          onResume={resumeNotification}
          onActionClick={() => {}}
        />
      </div>
    );
  }

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center py-2 px-2 central-assinante-container central-assinante-login-container">
        <div className="central-assinante-login-card">
          <div className="central-assinante-card-bg">
            <Card className="border-0">
              <div className="card-header text-center border-0 border-bottom border-secondary pb-2 pt-3 central-assinante-login-header">
              {empresaData?.logo && (
                <div className="mb-3 central-assinante-login-logo-wrapper">
                  <img 
                    src={empresaData.logo} 
                    alt="Logo da Empresa" 
                    className="central-assinante-login-logo"
                  />
                </div>
              )}
              <h2 className="h6 mb-1 fw-bold text-white">
                <i className="bi bi-person-circle text-white-50 me-2"></i>
                Central do Assinante
              </h2>
              <p className="text-white-50 mb-0 small">Faça login para acessar seus dados</p>
            </div>
            <div className="card-body pt-2 px-3 pb-3 central-assinante-login-body">
              <form onSubmit={handleLogin}>
                <div className="mb-2">
                  <label htmlFor="login" className="form-label small text-white-50">{loginFieldConfig.label}</label>
                  <Input
                    type={loginFieldConfig.label === 'Email' ? 'email' : 'text'}
                    id="login"
                    value={loginForm.login}
                    onChange={(e) => setLoginForm({ ...loginForm, login: String(e.value) })}
                    placeholder={loginFieldConfig.placeholder}
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="senha" className="form-label small text-white-50">Senha</label>
                  <Input
                    type="password"
                    id="senha"
                    value={loginForm.senha}
                    onChange={(e) => setLoginForm({ ...loginForm, senha: String(e.value) })}
                    placeholder="Digite sua senha"
                    required
                    disabled={loginMutation.isPending}
                  />
                </div>

                <div className="d-grid mt-2 mb-1">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    ) : null}
                    Entrar
                  </button>
                </div>
                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="btn btn-link text-white-50 text-decoration-none p-0 small"
                    onClick={() => setShowRecuperarSenha(true)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            </div>
            </Card>
          </div>
        </div>
        {/* Notification Container */}
        <NotificationContainer
          position="bottom-right"
          notifications={notifications}
          onRemove={removeNotification}
          onPause={pauseNotification}
          onResume={resumeNotification}
          onActionClick={() => {}}
        />
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center central-assinante-loading">
        <Spinner size="lg" variant="primary" aria-label="Carregando..." />
        {/* Notification Container */}
        <NotificationContainer
          position="bottom-right"
          notifications={notifications}
          onRemove={removeNotification}
          onPause={pauseNotification}
          onResume={resumeNotification}
          onActionClick={() => {}}
        />
      </div>
    );
  }

  // Error
  if (error || !dados) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 central-assinante-container central-assinante-error">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-danger central-assinante-error-icon"></i>
          <h6 className="mt-2 mb-1 fw-bold text-white">Erro ao carregar dados</h6>
          <p className="text-white-50 mb-3 small">O link de acesso pode estar inválido ou expirado.</p>
          {/* Notification Container */}
          <NotificationContainer
            position="bottom-right"
            notifications={notifications}
            onRemove={removeNotification}
            onPause={pauseNotification}
            onResume={resumeNotification}
            onActionClick={() => {}}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              CentralAssinanteService.clearCentralToken();
              setCentralToken(null);
              setIsAuthenticated(false);
              navigate(`/central-assinante/${slug}`, { replace: true });
            }}
          >
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  // Conteúdo principal
  return (
    <div className="bg-dark min-vh-100 central-assinante-container">
      {/* Header */}
      <div className="text-white py-2 border-bottom border-secondary central-assinante-header">
        <div className="container-fluid px-2 px-md-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="flex-grow-1 text-center">
              <h1 className="h6 mb-1 fw-bold text-white">
                <i className="bi bi-person-circle me-1 me-md-2"></i>
                <span className="d-none d-md-inline">Central do Assinante</span>
                <span className="d-md-none">Central</span>
              </h1>
              <p className="mb-0 text-white-50 small">{dados.cliente.razao_social || dados.cliente.nome_fantasia}</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="central-assinante-header-button"
                onClick={() => setShowTrocarSenha(true)}
                title="Trocar Senha"
              >
                <i className="bi bi-key"></i>
              </button>
              <button
                type="button"
                className="central-assinante-header-button"
                onClick={() => {
                  CentralAssinanteService.clearCentralToken();
                  setCentralToken(null);
                  setIsAuthenticated(false);
                  navigate(`/central-assinante/${slug}`, { replace: true });
                }}
                title="Sair"
              >
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex central-assinante-main">
        {/* Sidebar Menu - Desktop */}
        <aside className="d-none d-md-block central-assinante-sidebar">
          <nav className="nav nav-pills flex-column p-2 central-assinante-nav">
            <button
              className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'resumo' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('resumo');
              }}
            >
              <i className="bi bi-house-door fs-5"></i>
              <small className="small mt-1 central-assinante-nav-text">Resumo</small>
            </button>
            <button
              className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'contratos' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('contratos');
              }}
            >
              <i className="bi bi-file-earmark-text fs-5 position-relative">
                <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                  <span className="central-assinante-badge-inner">
                    <Badge
                      variant={temContratoComAssinaturaPendente() ? 'danger' : 'secondary'}
                      pill
                      className="central-assinante-sidebar-badge"
                    >
                      {dados.resumo.contratos_ativos}
                    </Badge>
                  </span>
                </span>
              </i>
              <small className="small mt-1 central-assinante-nav-text">Contratos</small>
            </button>
            <button
              className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'financeiro' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('financeiro');
              }}
            >
              <i className="bi bi-wallet fs-5 position-relative">
                <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                  <span className="central-assinante-badge-inner">
                    <Badge variant={dados.resumo.titulos_atrasados > 0 ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados.resumo.titulos_a_pagar + dados.resumo.titulos_atrasados}</Badge>
                  </span>
                </span>
              </i>
              <small className="small mt-1 central-assinante-nav-text">A Pagar</small>
            </button>
            <button
              className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button central-assinante-nav-button-pago ${activeTab === 'financeiro_pago' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('financeiro_pago');
              }}
            >
              <i className="bi bi-check-circle fs-5 position-relative">
                <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                  <span className="central-assinante-badge-inner">
                    <Badge variant="secondary" pill className="central-assinante-sidebar-badge">{dados.resumo.titulos_pagos}</Badge>
                  </span>
                </span>
              </i>
              <small className="small mt-1 central-assinante-nav-text">Pago</small>
            </button>
            <button
              className={`nav-link d-flex flex-column align-items-center justify-content-center position-relative p-3 central-assinante-nav-button ${activeTab === 'termos' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('termos');
              }}
            >
              <i className="bi bi-file-check fs-5 position-relative">
                <span className="position-absolute top-0 end-0 central-assinante-badge-wrapper">
                  <span className="central-assinante-badge-inner">
                    <Badge variant={temTermosComAssinaturaPendente() ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados.resumo.total_termos}</Badge>
                  </span>
                </span>
              </i>
              <small className="small mt-1 central-assinante-nav-text">Termos</small>
            </button>
          </nav>
        </aside>

        {/* Conteúdo Principal */}
        <div className="flex-grow-1 px-2 px-md-3 py-2">
          {/* Conteúdo das Tabs */}
          <div>
          {/* Tab Resumo */}
          {activeTab === 'resumo' && (
            <div>
              {/* Cards de Resumo */}
              <div className="row g-2 g-md-3 mb-3">
                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-contratos">
                    <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('contratos')}>
                      <div className="card-body text-center central-assinante-card-body-compact">
                      <div className="central-assinante-card-icon-wrapper">
                        <i className="bi bi-file-earmark-text"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.total_contratos}</h6>
                      <small className="text-white-50 d-block central-assinante-card-label">Contratos</small>
                      <small className="text-white-50 central-assinante-card-subtitle">{dados.resumo.contratos_ativos} ativos</small>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-pagos">
                    <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_pagas')}>
                    <div className="card-body text-center central-assinante-card-body-compact">
                      <div className="central-assinante-card-icon-wrapper">
                        <i className="bi bi-check-circle"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.titulos_pagos}</h6>
                      <small className="text-white-50 d-block central-assinante-card-label">Faturas Pagas</small>
                      <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_pago)}</small>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-atrasados">
                    <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_atrasadas')}>
                    <div className="card-body text-center central-assinante-card-body-compact">
                      <div className="central-assinante-card-icon-wrapper">
                        <i className="bi bi-exclamation-triangle"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.titulos_atrasados}</h6>
                      <small className="text-white-50 d-block central-assinante-card-label">Faturas Atrasadas</small>
                      <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_atrasado)}</small>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-a-pagar">
                    <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('faturas_a_pagar')}>
                    <div className="card-body text-center central-assinante-card-body-compact">
                      <div className="central-assinante-card-icon-wrapper">
                        <i className="bi bi-clock-history"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.titulos_a_pagar}</h6>
                      <small className="text-white-50 d-block central-assinante-card-label">A Pagar</small>
                      <small className="text-white-50 central-assinante-card-subtitle">{formatCurrency(dados.resumo.valor_total_a_pagar)}</small>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="central-assinante-card-bg central-assinante-resumo-card central-assinante-card-termos">
                    <Card className="h-100 border-0" padding="none" clickable onClick={() => handleCardClick('termos')}>
                    <div className="card-body text-center central-assinante-card-body-compact">
                      <div className="central-assinante-card-icon-wrapper">
                        <i className="bi bi-file-check"></i>
                      </div>
                      <h6 className="mb-0 fw-bold text-white central-assinante-card-title">{dados.resumo.total_termos}</h6>
                      <small className="text-white-50 d-block central-assinante-card-label">Termos</small>
                      <small className="text-white-50 central-assinante-card-subtitle">{dados.resumo.termos_assinados} assinados</small>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="central-assinante-card-bg">
                <Card className="border-0" padding="none">
                <div className="border-bottom border-secondary central-assinante-info-header">
                  <h6 className="mb-0 fw-bold text-white central-assinante-info-title">
                    <i className="bi bi-person-circle text-white-50 me-1"></i>
                    Informações do Cliente
                  </h6>
                </div>
                <div className="central-assinante-info-body">
                  <div className="row g-1">
                    <div className="col-12 col-md-6">
                      <div className="central-assinante-info-field">
                        <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Razão Social</small>
                        <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.razao_social}</p>
                      </div>
                    </div>
                    {dados.cliente.nome_fantasia && (
                      <div className="col-12 col-md-6">
                        <div className="central-assinante-info-field">
                          <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Nome Fantasia</small>
                          <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.nome_fantasia}</p>
                        </div>
                      </div>
                    )}
                    {dados.cliente.cpf_cnpj && (
                      <div className="col-12 col-md-6">
                        <div className="central-assinante-info-field">
                          <small className="text-white-50 text-uppercase d-block central-assinante-info-label">CPF/CNPJ</small>
                          <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.cpf_cnpj}</p>
                        </div>
                      </div>
                    )}
                    {dados.cliente.email && (
                      <div className="col-12 col-md-6">
                        <div className="central-assinante-info-field">
                          <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Email</small>
                          <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.email}</p>
                        </div>
                      </div>
                    )}
                    {dados.cliente.telefone && (
                      <div className="col-12 col-md-6">
                        <div className="central-assinante-info-field">
                          <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Telefone</small>
                          <p className="mb-0 text-white central-assinante-info-value">{dados.cliente.telefone}</p>
                        </div>
                      </div>
                    )}
                    {dados.cliente.endereco && (
                      <div className="col-12">
                        <div className="central-assinante-info-field">
                          <small className="text-white-50 text-uppercase d-block central-assinante-info-label">Endereço</small>
                          <p className="mb-0 text-white central-assinante-info-value">
                            {dados.cliente.endereco}
                            {dados.cliente.numero && `, ${dados.cliente.numero}`}
                            {dados.cliente.complemento && ` - ${dados.cliente.complemento}`}
                            {dados.cliente.bairro && `, ${dados.cliente.bairro}`}
                            {dados.cliente.cidade && ` - ${dados.cliente.cidade}`}
                            {dados.cliente.estado && `/${dados.cliente.estado}`}
                            {dados.cliente.cep && ` - CEP: ${dados.cliente.cep}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </Card>
              </div>
            </div>
          )}

          {/* Tab Contratos */}
          {activeTab === 'contratos' && (
            <div>
              {dados.contratos.filter(c => c.status?.toLowerCase() === 'ativo').length === 0 ? (
                <div className="text-center py-3">
                  <i className="bi bi-file-earmark-text text-white-50 central-assinante-empty-icon"></i>
                  <p className="text-white-50 mt-2 small">Nenhum contrato ativo encontrado</p>
                </div>
              ) : (
                <div className="row g-2">
                  {dados.contratos.filter(c => c.status?.toLowerCase() === 'ativo').map((contrato) => (
                    <div key={contrato.id} className="col-12">
                      <div className="central-assinante-item">
                        <Card className="border-0" padding="none">
                          <div className="central-assinante-item-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-bold text-white central-assinante-item-title">
                                        <i className="bi bi-file-earmark-text text-white-50 me-2"></i>
                                  Contrato #{contrato.id}
                                </h6>
                                <p className="mb-0 text-white-50 central-assinante-item-subtitle">{contrato.plano || 'Sem plano'}</p>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <Badge variant={getStatusVariant(contrato.status)} pill>
                                  {getStatusLabel(contrato.status)}
                                </Badge>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleImprimirContrato(contrato.id)}
                                  title="Imprimir"
                                  disabled={baixandoContratoId === contrato.id}
                                  isLoading={baixandoContratoId === contrato.id}
                                  className="central-assinante-pdf-button"
                                >
                                  Imprimir
                                </Button>
                              </div>
                            </div>
                            <div className="d-flex gap-3 flex-wrap">
                              {contrato.valor_final && (
                                <div className="flex-fill central-assinante-item-min-width">
                                  <small className="text-white-50 d-block central-assinante-item-label">Valor</small>
                                  <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(contrato.valor_final)}</p>
                                </div>
                              )}
                              {contrato.data_inicio && (
                                <div className="flex-fill central-assinante-item-min-width">
                                  <small className="text-white-50 d-block central-assinante-item-label">Data de Início</small>
                                  <p className="mb-0 text-white central-assinante-item-value">{formatDate(contrato.data_inicio)}</p>
                                </div>
                              )}
                              {contrato.data_fim && (
                                <div className="flex-fill central-assinante-item-min-width">
                                  <small className="text-white-50 d-block central-assinante-item-label">Data de Fim</small>
                                  <p className="mb-0 text-white central-assinante-item-value">{formatDate(contrato.data_fim)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab A Pagar */}
          {activeTab === 'financeiro' && (
            <div>
              {(dados.titulos.a_pagar.length === 0 && dados.titulos.atrasados.length === 0) ? (
                <div className="text-center py-3">
                  <i className="bi bi-receipt text-white-50 central-assinante-empty-icon"></i>
                  <p className="text-white-50 mt-2 small">Nenhuma fatura em aberto encontrada</p>
                </div>
              ) : (
                <>
                  {/* Faturas Atrasadas */}
                  {dados.titulos.atrasados.length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-white mb-2 small text-center">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Faturas Atrasadas ({dados.titulos.atrasados.length})
                      </h6>
                      <div className="row g-2">
                        {dados.titulos.atrasados.map((titulo) => (
                          <div key={titulo.id} className="col-12">
                            <div className="central-assinante-item">
                              <Card className="border-0" padding="none">
                                <div className="central-assinante-item-body">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1 fw-bold text-white central-assinante-item-title">
                                        <i className="bi bi-receipt text-white-50 me-2"></i>
                                        {titulo.numero_titulo}
                                      </h6>
                                      {titulo.plano && (
                                        <p className="mb-0 text-white-50 central-assinante-item-subtitle">{titulo.plano}</p>
                                      )}
                                    </div>
                                    <Badge variant="danger" pill className="ms-2">
                                      {titulo.dias_atraso}d atraso
                                    </Badge>
                                  </div>
                                  <div className="d-flex gap-3">
                                    <div className="flex-fill">
                                      <small className="text-white-50 d-block central-assinante-item-label">Valor</small>
                                      <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(titulo.valor_aberto || titulo.valor_final || titulo.valor)}</p>
                                    </div>
                                    <div className="flex-fill">
                                      <small className="text-white-50 d-block central-assinante-item-label">Vencimento</small>
                                      <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_vencimento)}</p>
                                    </div>
                                  </div>
                                  <div className="d-flex gap-2 mt-3">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleVisualizarFatura(titulo)}
                                      className="flex-grow-1 central-assinante-item-button"
                                    >
                                      <i className="bi bi-eye me-1"></i>
                                      Visualizar
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleImprimirFatura(titulo.id)}
                                      className="flex-grow-1 central-assinante-item-button"
                                      disabled={baixandoBoletoId === titulo.id}
                                      isLoading={baixandoBoletoId === titulo.id}
                                    >
                                      <i className="bi bi-file-pdf me-1"></i>
                                      Baixar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* A Pagar */}
                  {dados.titulos.a_pagar.length > 0 && (
                    <div className="mb-3">
                      <div className="row g-2">
                        {dados.titulos.a_pagar.map((titulo) => (
                          <div key={titulo.id} className="col-12">
                            <div className="central-assinante-item">
                              <Card className="border-0" padding="none">
                                <div className="central-assinante-item-body">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1 fw-bold text-white" style={{ fontSize: '0.9rem' }}>
                                        <i className="bi bi-receipt text-white-50 me-2"></i>
                                        {titulo.numero_titulo}
                                      </h6>
                                      {titulo.plano && (
                                        <p className="mb-0 text-white-50" style={{ fontSize: '0.8rem' }}>{titulo.plano}</p>
                                      )}
                                    </div>
                                    <Badge variant={getStatusVariant(titulo.status)} pill className="ms-2">
                                      {getStatusLabel(titulo.status)}
                                    </Badge>
                                  </div>
                                  <div className="d-flex gap-3">
                                    <div className="flex-fill">
                                      <small className="text-white-50 d-block central-assinante-item-label">Valor</small>
                                      <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(titulo.valor_aberto || titulo.valor_final || titulo.valor)}</p>
                                    </div>
                                    <div className="flex-fill">
                                      <small className="text-white-50 d-block central-assinante-item-label">Vencimento</small>
                                      <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_vencimento)}</p>
                                    </div>
                                  </div>
                                  <div className="d-flex gap-2 mt-3">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleVisualizarFatura(titulo)}
                                      className="flex-grow-1 central-assinante-item-button"
                                    >
                                      <i className="bi bi-eye me-1"></i>
                                      Visualizar
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleImprimirFatura(titulo.id)}
                                      className="flex-grow-1 central-assinante-item-button"
                                      disabled={baixandoBoletoId === titulo.id}
                                      isLoading={baixandoBoletoId === titulo.id}
                                    >
                                      <i className="bi bi-file-pdf me-1"></i>
                                      Baixar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab Financeiro Pago */}
          {activeTab === 'financeiro_pago' && (
            <div>
              {dados.titulos.pagos.length === 0 ? (
                <div className="text-center py-3">
                  <i className="bi bi-check-circle text-white-50" style={{ fontSize: '2rem' }}></i>
                  <p className="text-white-50 mt-2 small">Nenhuma fatura paga encontrada</p>
                </div>
              ) : (
                <div className="mb-3">
                      <div className="row g-2">
                        {dados.titulos.pagos.map((titulo) => (
                          <div key={titulo.id} className="col-12">
                            <div className="central-assinante-item">
                              <Card className="border-0" padding="none">
                                <div className="central-assinante-item-body">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1 fw-bold text-white central-assinante-item-title">
                                        <i className="bi bi-receipt text-white-50 me-2"></i>
                                        {titulo.numero_titulo}
                                      </h6>
                                      {titulo.plano && (
                                        <p className="mb-0 text-white-50 central-assinante-item-subtitle">{titulo.plano}</p>
                                      )}
                                    </div>
                                    <Badge variant="success" pill className="ms-2">
                                      Pago
                                    </Badge>
                                  </div>
                                  <div className="d-flex gap-3">
                                    <div className="flex-fill">
                                      <small className="text-white-50 d-block central-assinante-item-label">Valor Pago</small>
                                      <p className="mb-0 text-white fw-semibold central-assinante-item-value-bold">{formatCurrency(titulo.valor_pago || titulo.valor_final || titulo.valor)}</p>
                                    </div>
                                    <div className="flex-fill">
                                      <small className="text-white-50 d-block central-assinante-item-label">Vencimento</small>
                                      <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_vencimento)}</p>
                                    </div>
                                    {titulo.data_pagamento && (
                                      <div className="flex-fill">
                                        <small className="text-white-50 d-block central-assinante-item-label">Pagamento</small>
                                        <p className="mb-0 text-white central-assinante-item-value">{formatDate(titulo.data_pagamento)}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="d-flex gap-2 mt-3">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleVisualizarFatura(titulo)}
                                      className="flex-grow-1 central-assinante-item-button"
                                    >
                                      <i className="bi bi-eye me-1"></i>
                                      Visualizar
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleImprimirRecibo(titulo.id)}
                                      className="flex-grow-1 central-assinante-item-button"
                                      disabled={baixandoReciboId === titulo.id}
                                      isLoading={baixandoReciboId === titulo.id}
                                    >
                                      <i className="bi bi-receipt me-1"></i>
                                      Recibo
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleImprimirFatura(titulo.id)}
                                      className="flex-grow-1 central-assinante-item-button"
                                      disabled={baixandoBoletoId === titulo.id}
                                      isLoading={baixandoBoletoId === titulo.id}
                                    >
                                      <i className="bi bi-file-pdf me-1"></i>
                                      Boleto
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                )}
            </div>
          )}

          {/* Tab Termos */}
          {activeTab === 'termos' && (
            <div>
              {dados.termos.length === 0 ? (
                <div className="text-center py-3">
                  <i className="bi bi-file-check text-white-50 central-assinante-empty-icon"></i>
                  <p className="text-white-50 mt-2 small">Nenhum termo encontrado</p>
                </div>
              ) : (
                <div className="row g-2">
                  {dados.termos.map((termo) => (
                    <div key={termo.id} className="col-12">
                      <div className="central-assinante-item">
                        <Card className="border-0" padding="none">
                          <div className="central-assinante-termo-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="mb-0 fw-bold text-white central-assinante-termo-title">{termo.titulo || termo.tipo_termo || `Termo #${termo.id}`}</h6>
                              <div className="d-flex gap-2 align-items-center">
                                <Badge variant={termo.assinado === 'SIM' ? 'success' : 'warning'} pill>
                                  {termo.assinado === 'SIM' ? 'Assinado' : 'Pendente'}
                                </Badge>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleImprimirTermo(termo.id)}
                                  title="Imprimir"
                                  disabled={baixandoTermoId === termo.id}
                                  isLoading={baixandoTermoId === termo.id}
                                  className="central-assinante-pdf-button"
                                >
                                  Imprimir
                                </Button>
                              </div>
                            </div>
                            <div className="d-flex gap-3 flex-wrap">
                              <div className="flex-fill central-assinante-item-min-width">
                                <small className="text-white-50 d-block central-assinante-item-label">Tipo</small>
                                <p className="mb-0 text-white central-assinante-item-value">{termo.tipo_termo}</p>
                              </div>
                              {termo.aceito_por && (
                                <div className="flex-fill central-assinante-item-min-width">
                                  <small className="text-white-50 d-block central-assinante-item-label">Assinado por</small>
                                  <p className="mb-0 text-white central-assinante-item-value">{termo.aceito_por}</p>
                                </div>
                              )}
                              {termo.data_aceite && (
                                <div className="flex-fill central-assinante-item-min-width">
                                  <small className="text-white-50 d-block central-assinante-item-label">Data de aceite</small>
                                  <p className="mb-0 text-white central-assinante-item-value">{formatDate(termo.data_aceite)}</p>
                                </div>
                              )}
                              <div className="flex-fill central-assinante-item-min-width">
                                <small className="text-white-50 d-block central-assinante-item-label">Data de criação</small>
                                <p className="mb-0 text-white central-assinante-item-value">{formatDate(termo.created_at)}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Tabs Mobile - Bottom Navigation */}
      <div className="d-md-none fixed-bottom border-top border-secondary shadow-lg central-assinante-mobile-nav">
        <div className="d-flex justify-content-around align-items-center py-2">
          <button
                className={`btn text-decoration-none p-2 central-assinante-mobile-button ${activeTab === 'resumo' ? 'active text-white' : 'text-white-50'}`}
            onClick={() => {
              setActiveTab('resumo');
            }}
          >
            <div className="d-flex flex-column align-items-center">
              <i className={`bi bi-house-door fs-5 ${activeTab === 'resumo' ? 'text-white' : 'text-white-50'}`}></i>
              <small className="small">Resumo</small>
            </div>
          </button>
          <button
                className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'contratos' ? 'active text-white' : 'text-white-50'}`}
            onClick={() => {
              setActiveTab('contratos');
            }}
          >
            <div className="d-flex flex-column align-items-center position-relative">
              <i className={`bi bi-file-earmark-text fs-5 position-relative ${activeTab === 'contratos' ? 'text-white' : 'text-white-50'}`}></i>
              <small className="small">Contratos</small>
              <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
                <Badge variant={temContratoComAssinaturaPendente() ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados?.resumo.contratos_ativos || 0}</Badge>
              </span>
            </div>
          </button>
          <button
                className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'financeiro' ? 'active text-white' : 'text-white-50'}`}
            onClick={() => {
              setActiveTab('financeiro');
            }}
          >
            <div className="d-flex flex-column align-items-center">
              <i className={`bi bi-wallet fs-5 ${activeTab === 'financeiro' ? 'text-white' : 'text-white-50'}`}></i>
              <small className="small">A Pagar</small>
              <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
                <Badge variant={(dados?.resumo.titulos_atrasados || 0) > 0 ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{(dados?.resumo.titulos_a_pagar || 0) + (dados?.resumo.titulos_atrasados || 0)}</Badge>
              </span>
            </div>
          </button>
          <button
                className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'financeiro_pago' ? 'active text-white' : 'text-white-50'}`}
            onClick={() => {
              setActiveTab('financeiro_pago');
            }}
          >
            <div className="d-flex flex-column align-items-center">
              <i className={`bi bi-check-circle fs-5 ${activeTab === 'financeiro_pago' ? 'text-white' : 'text-white-50'}`}></i>
              <small className="small">Pago</small>
              <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
                <Badge variant="secondary" pill className="central-assinante-sidebar-badge">{dados?.resumo.titulos_pagos || 0}</Badge>
              </span>
            </div>
          </button>
          <button
                className={`btn text-decoration-none p-2 position-relative central-assinante-mobile-button ${activeTab === 'termos' ? 'active text-white' : 'text-white-50'}`}
            onClick={() => {
              setActiveTab('termos');
            }}
          >
            <div className="d-flex flex-column align-items-center position-relative">
              <i className={`bi bi-file-check fs-5 position-relative ${activeTab === 'termos' ? 'text-white' : 'text-secondary'}`}></i>
              <small className="small">Termos</small>
              <span className="position-absolute top-0 end-0 central-assinante-mobile-badge">
                <Badge variant={temTermosComAssinaturaPendente() ? 'danger' : 'secondary'} pill className="central-assinante-sidebar-badge">{dados?.resumo.total_termos || 0}</Badge>
              </span>
            </div>
          </button>
        </div>
      </div>
      {/* Espaço para o bottom nav em mobile */}
      <div className="d-md-none central-assinante-mobile-spacer"></div>

      {/* Modal Visualizar Fatura */}
      {faturaVisualizar ? (
        <div className="modal fade show d-block central-assinante-modal-backdrop" onClick={() => setFaturaVisualizar(null)}>
          <div className="modal-dialog modal-dialog-centered central-assinante-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 central-assinante-modal-content">
              {/* Header */}
              <div className="border-bottom border-secondary central-assinante-modal-header">
                <div className="d-flex align-items-center justify-content-center position-relative w-100">
                  <button 
                    type="button" 
                    className="btn btn-link text-white text-decoration-none p-0 position-absolute start-0 central-assinante-modal-close"
                    onClick={() => setFaturaVisualizar(null)}
                  >
                    <i className="bi bi-arrow-left"></i>
                  </button>
                  <h6 className="mb-0 text-white fw-bold central-assinante-modal-title">
                    Fatura {faturaVisualizar.numero_titulo}
                  </h6>
                </div>
              </div>
              
              {/* Body */}
              <div className="modal-body central-assinante-modal-body">
                {faturaVisualizar.descricao && (
                  <div className="mb-2">
                    <small className="text-white-50 d-block central-assinante-modal-description">{faturaVisualizar.descricao}</small>
                  </div>
                )}
                
                <div className="mb-2">
                  <h6 className="text-success mb-1 fw-bold central-assinante-modal-value">
                    {formatCurrency(faturaVisualizar.valor_aberto || faturaVisualizar.valor_final || faturaVisualizar.valor)}
                  </h6>
                  <small className="text-white-50 central-assinante-modal-date">Vencimento: {formatDate(faturaVisualizar.data_vencimento)}</small>
                </div>
                
                {faturaVisualizar.linha_digitavel && (
                  <div className="mb-2">
                    <p className="small text-white-50 mb-1 central-assinante-modal-description">
                      Utilize o código abaixo para realizar o pagamento ou leia o QRCode para pagar via PIX.
                    </p>
                    <div className="central-assinante-modal-code-wrapper">
                      <div className="small text-white font-monospace text-break central-assinante-modal-code">
                        {faturaVisualizar.linha_digitavel.match(/.{1,5}/g)?.map((chunk, idx) => (
                          <span key={idx}>{chunk} </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-100"
                      onClick={() => copiarCodigo(faturaVisualizar.linha_digitavel!, 'linha')}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      {copiedField === 'linha' ? 'Copiado!' : 'Copiar Código de Barras'}
                    </Button>
                  </div>
                )}

                {faturaVisualizar.qrcode && (
                  <div className="mb-2 text-center">
                    <div className="central-assinante-modal-qr-wrapper">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(faturaVisualizar.qrcode)}`}
                        alt="QR Code PIX"
                        className="img-fluid central-assinante-modal-qr-img"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-100"
                      onClick={() => copiarCodigo(faturaVisualizar.qrcode!, 'pix')}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      {copiedField === 'pix' ? 'Copiado!' : 'Copiar Código PIX'}
                    </Button>
                  </div>
                )}

                <div className="d-grid gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-100"
                    onClick={() => handleImprimirFatura(faturaVisualizar.id)}
                    disabled={baixandoBoletoId === faturaVisualizar.id}
                    isLoading={baixandoBoletoId === faturaVisualizar.id}
                  >
                    <i className="bi bi-download me-1"></i>
                    Baixar Boleto
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Trocar Senha */}
      {showTrocarSenha ? (
        <div className="modal show d-block central-assinante-modal-backdrop" tabIndex={-1} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowTrocarSenha(false);
            setMostrarNovaSenha(false);
            setTrocarSenhaForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
          }
        }}>
          <div className="modal-dialog modal-dialog-centered central-assinante-modal-dialog central-assinante-modal-dialog-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content central-assinante-card-bg border-0 central-assinante-modal-content">
              <Card className="border-0">
                <div className="card-header text-center border-0 border-bottom border-secondary pb-2 pt-3 central-assinante-login-header">
                  <h2 className="h6 mb-1 fw-bold text-white">
                    <i className="bi bi-key text-white-50 me-2"></i>
                    Trocar Senha
                  </h2>
                  <p className="text-white-50 mb-0 small">Informe sua senha atual e a nova senha</p>
                </div>
                <div className="card-body pt-2 px-3 pb-3 central-assinante-login-body">
                  <form onSubmit={handleTrocarSenha}>
                    <div className="mb-2">
                      <label htmlFor="senha-atual" className="form-label small text-white-50">Senha Atual</label>
                      <Input
                        type="password"
                        id="senha-atual"
                        value={trocarSenhaForm.senhaAtual}
                        onChange={(e) => setTrocarSenhaForm({ ...trocarSenhaForm, senhaAtual: String(e.value) })}
                        placeholder="Digite sua senha atual"
                        required
                        disabled={trocarSenhaMutation.isPending}
                      />
                    </div>

                    <div className="mb-2">
                      <label htmlFor="nova-senha" className="form-label small text-white-50">Nova Senha</label>
                      <div className="central-assinante-input-with-toggle">
                        <Input
                          type={mostrarNovaSenha ? 'text' : 'password'}
                          id="nova-senha"
                          value={trocarSenhaForm.novaSenha}
                          onChange={(e) => setTrocarSenhaForm({ ...trocarSenhaForm, novaSenha: String(e.value) })}
                          placeholder="Digite a nova senha (mínimo 6 caracteres)"
                          required
                          disabled={trocarSenhaMutation.isPending}
                          className="central-assinante-input-with-toggle-field"
                        />
                        <button
                          type="button"
                          className="central-assinante-password-toggle"
                          onClick={() => setMostrarNovaSenha((v) => !v)}
                          disabled={trocarSenhaMutation.isPending}
                        >
                          {mostrarNovaSenha ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="confirmar-nova-senha" className="form-label small text-white-50">Confirmar Nova Senha</label>
                      <div className="central-assinante-input-with-toggle">
                        <Input
                          type={mostrarNovaSenha ? 'text' : 'password'}
                          id="confirmar-nova-senha"
                          value={trocarSenhaForm.confirmarNovaSenha}
                          onChange={(e) => setTrocarSenhaForm({ ...trocarSenhaForm, confirmarNovaSenha: String(e.value) })}
                          placeholder="Digite novamente a nova senha"
                          required
                          disabled={trocarSenhaMutation.isPending}
                          className="central-assinante-input-with-toggle-field"
                        />
                        <button
                          type="button"
                          className="central-assinante-password-toggle"
                          onClick={() => setMostrarNovaSenha((v) => !v)}
                          disabled={trocarSenhaMutation.isPending}
                        >
                          {mostrarNovaSenha ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                    </div>

                    <div className="d-grid gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        className="w-100"
                        disabled={trocarSenhaMutation.isPending}
                        isLoading={trocarSenhaMutation.isPending}
                      >
                        Alterar Senha
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-100"
                        onClick={() => {
                          setShowTrocarSenha(false);
                          setMostrarNovaSenha(false);
                          setTrocarSenhaForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
                        }}
                        disabled={trocarSenhaMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {/* Notification Container */}
      <NotificationContainer
        position="bottom-right"
        notifications={notifications}
        onRemove={removeNotification}
        onPause={pauseNotification}
        onResume={resumeNotification}
        onActionClick={() => {}}
      />
    </div>
  );
};

export default CentralAssinante;
