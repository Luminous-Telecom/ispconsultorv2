import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DadosEmpresaService } from 'services/dadosEmpresaService';

export const useCompanyName = () => {
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
  });

  const companyName = useMemo(
    () => dadosEmpresa?.nome_fantasia || dadosEmpresa?.razao_social || '',
    [dadosEmpresa]
  );

  useEffect(() => {
    document.title = companyName || 'BackNet';
  }, [companyName]);

  return companyName;
};
