import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  CentralAssinanteService,
  type LoginCentralAssinanteRequest,
  type RecuperarSenhaRequest,
  type TrocarSenhaRequest,
} from 'services/centralAssinanteService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';

export type TrocarSenhaFormData = TrocarSenhaRequest & { confirmarNovaSenha: string };

export function useCentralAssinanteAuth(slug: string) {
  const { success: showSuccess } = useNotificationContext();
  const { showApiError } = useApiError();

  const [loginForm, setLoginForm] = useState<LoginCentralAssinanteRequest>({ login: '', senha: '' });
  const [showRecuperarSenha, setShowRecuperarSenha] = useState(false);
  const [recuperarSenhaForm, setRecuperarSenhaForm] = useState<RecuperarSenhaRequest>({
    cnpj: '',
    email: '',
  });
  const [showTrocarSenha, setShowTrocarSenha] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [trocarSenhaForm, setTrocarSenhaForm] = useState<TrocarSenhaFormData>({
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  });

  const [centralToken, setCentralToken] = useState<string | null>(() =>
    CentralAssinanteService.getCentralToken()
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    !!CentralAssinanteService.getCentralToken()
  );

  const loginMutation = useMutation({
    mutationFn: (data: LoginCentralAssinanteRequest) => CentralAssinanteService.login(slug, data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const newToken = response.data.token;
        if (!newToken) {
          showApiError('Dados de autenticação inválidos. Tente novamente.');
          return;
        }
        CentralAssinanteService.setCentralToken(newToken);
        setCentralToken(newToken);
        setIsAuthenticated(true);
        showSuccess('Login realizado com sucesso!');
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SUBSCRIBER_LOGIN_ERROR),
  });

  const recuperarSenhaMutation = useMutation({
    mutationFn: (data: RecuperarSenhaRequest) => CentralAssinanteService.recuperarSenha(slug, data),
    onSuccess: () => {
      showSuccess('Instruções para recuperação de senha foram enviadas para seu email');
      setShowRecuperarSenha(false);
      setRecuperarSenhaForm({ cnpj: '', email: '' });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SUBSCRIBER_PASSWORD_RECOVER_ERROR),
  });

  const trocarSenhaMutation = useMutation({
    mutationFn: (data: TrocarSenhaRequest) => CentralAssinanteService.trocarSenhaMe(slug, data),
    onSuccess: () => {
      showSuccess('Senha alterada com sucesso');
      setShowTrocarSenha(false);
      setMostrarNovaSenha(false);
      setTrocarSenhaForm({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SUBSCRIBER_PASSWORD_CHANGE_ERROR),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.login || !loginForm.senha) {
      showApiError('Preencha todos os campos');
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleRecuperarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recuperarSenhaForm.cnpj || !recuperarSenhaForm.email) {
      showApiError('Preencha todos os campos');
      return;
    }
    recuperarSenhaMutation.mutate(recuperarSenhaForm);
  };

  const handleTrocarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trocarSenhaForm.senhaAtual || !trocarSenhaForm.novaSenha || !trocarSenhaForm.confirmarNovaSenha) {
      showApiError('Preencha todos os campos');
      return;
    }
    if (trocarSenhaForm.novaSenha.length < 6) {
      showApiError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (trocarSenhaForm.novaSenha !== trocarSenhaForm.confirmarNovaSenha) {
      showApiError('As senhas não coincidem');
      return;
    }
    trocarSenhaMutation.mutate({
      senhaAtual: trocarSenhaForm.senhaAtual,
      novaSenha: trocarSenhaForm.novaSenha,
    });
  };

  const handleLogout = () => {
    CentralAssinanteService.clearCentralToken();
    setCentralToken(null);
    setIsAuthenticated(false);
  };

  return {
    loginForm,
    setLoginForm,
    showRecuperarSenha,
    setShowRecuperarSenha,
    recuperarSenhaForm,
    setRecuperarSenhaForm,
    showTrocarSenha,
    setShowTrocarSenha,
    mostrarNovaSenha,
    setMostrarNovaSenha,
    trocarSenhaForm,
    setTrocarSenhaForm,
    centralToken,
    isAuthenticated,
    loginMutation,
    recuperarSenhaMutation,
    trocarSenhaMutation,
    handleLogin,
    handleRecuperarSenha,
    handleTrocarSenha,
    handleLogout,
  };
}
