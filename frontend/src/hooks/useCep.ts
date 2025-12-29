import { useState, useCallback } from 'react';
import { CepService, CepData } from '../services/cepService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';

export const useCep = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);
  const { success, error } = useNotificationContext();

  const buscarCep = useCallback(async (cep: string): Promise<CepData | null> => {
    if (!CepService.validarCep(cep)) {
      error('CEP inválido. Digite um CEP com 8 dígitos.');
      return null;
    }

    setIsLoading(true);
    setCepData(null);

    try {
      // Tentar primeiro com ViaCEP (API externa, não precisa de autenticação)
      const data = await CepService.buscarCep(cep);
      setCepData(data);
      success('CEP encontrado com sucesso!');
      return data;
    } catch (viaCepError) {
      // Se ViaCEP falhar, tentar API própria apenas se necessário
      try {
        const data = await CepService.buscarCepApi(cep);
        setCepData(data);
        success('CEP encontrado com sucesso!');
        return data;
      } catch (apiError: unknown) {
        // Sempre tratar como erro de CEP não encontrado, não propagar para evitar logout
        // Ignorar qualquer erro de autenticação ou rede
        error('CEP não encontrado. Verifique se o CEP está correto.');
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [success, error]);

  const limparCep = useCallback(() => {
    setCepData(null);
  }, []);

  const formatarCep = useCallback((cep: string): string => {
    return CepService.formatarCep(cep);
  }, []);

  const validarCep = useCallback((cep: string): boolean => {
    return CepService.validarCep(cep);
  }, []);

  return {
    isLoading,
    cepData,
    buscarCep,
    limparCep,
    formatarCep,
    validarCep,
  };
};
