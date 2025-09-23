import { useState, useCallback } from 'react';
import { CepService, CepData } from '../services/cepService';
import { useNotification } from './useNotification';

export const useCep = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);
  const { success, error } = useNotification();

  const buscarCep = useCallback(async (cep: string): Promise<CepData | null> => {
    if (!CepService.validarCep(cep)) {
      error('CEP inválido. Digite um CEP com 8 dígitos.');
      return null;
    }

    setIsLoading(true);
    setCepData(null);

    try {
      // Tentar primeiro com ViaCEP
      const data = await CepService.buscarCep(cep);
      setCepData(data);
      success('CEP encontrado com sucesso!');
      return data;
    } catch (viaCepError) {
      try {
        // Fallback para API própria
        const data = await CepService.buscarCepApi(cep);
        setCepData(data);
        success('CEP encontrado com sucesso!');
        return data;
      } catch (apiError) {
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
