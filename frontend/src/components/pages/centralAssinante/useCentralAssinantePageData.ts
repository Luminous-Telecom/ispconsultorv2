import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CentralAssinanteService, DadosCentralAssinante } from 'services/centralAssinanteService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { ParametrosService } from 'services/parametrosService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';

interface UseCentralAssinantePageDataParams {
  slug: string;
  isAuthenticated: boolean;
  centralToken: string | null;
}

export const useCentralAssinantePageData = ({
  slug,
  isAuthenticated,
  centralToken,
}: UseCentralAssinantePageDataParams) => {
  const dadosQuery = useQuery<DadosCentralAssinante>({
    queryKey: ['central-assinante', centralToken, slug],
    queryFn: async () => {
      const response = await CentralAssinanteService.getDadosMe(slug);
      if (!response.success || !response.data) {
        throw new Error(response.message || CONTEXT_ERROR_MESSAGES.SUBSCRIBER_FETCH_ERROR);
      }
      return response.data;
    },
    enabled: !!(isAuthenticated && !!centralToken && !!slug),
    retry: false,
  });

  const empresaQuery = useQuery({
    queryKey: ['dados-empresa-public', slug],
    queryFn: () => (slug ? DadosEmpresaService.getPublicBySlug(slug) : DadosEmpresaService.getPublic()),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });

  const parametrosQuery = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 5 * 60 * 1000,
  });

  const loginFieldConfig = useMemo(() => {
    const metodoLogin = parametrosQuery.data?.data?.central_assinante_metodo_login || 'cnpj';

    if (metodoLogin === 'email') {
      return {
        label: 'Email',
        placeholder: 'Digite seu Email',
      };
    }

    return {
      label: 'CNPJ',
      placeholder: 'Digite seu CNPJ',
    };
  }, [parametrosQuery.data?.data?.central_assinante_metodo_login]);

  useEffect(() => {
    document.title = 'Central do Assinante';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Central do Assinante');
    }

    if (empresaQuery.data?.logo && empresaQuery.data.logo !== 'undefined') {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = empresaQuery.data.logo;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.type = 'image/x-icon';
        newLink.href = empresaQuery.data.logo;
        document.head.appendChild(newLink);
      }
    }

    return () => {
      document.title = 'BackNet';
      const metaDescriptionCleanup = document.querySelector('meta[name="description"]');
      if (metaDescriptionCleanup) {
        metaDescriptionCleanup.setAttribute('content', '');
      }
    };
  }, [empresaQuery.data]);

  return {
    dados: dadosQuery.data,
    isLoading: dadosQuery.isLoading,
    error: dadosQuery.error,
    empresaData: empresaQuery.data,
    parametrosData: parametrosQuery.data,
    loginFieldConfig,
  };
};
