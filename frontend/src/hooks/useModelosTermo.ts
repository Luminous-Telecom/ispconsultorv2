import { useQuery } from '@tanstack/react-query';
import ModeloTermoService from '../services/modeloTermoService';

export const useModelosTermo = () => {
  return useQuery({
    queryKey: ['modelos-termo'],
    queryFn: async () => {
      const response = await ModeloTermoService.list();
      return response.data;
    }
  });
};
