/**
 * Garante que um valor seja convertido para string
 * Evita problemas de [object Object] em formulários
 */
export const ensureString = (value: any): string => {
  const originalValue = value;
  const originalType = typeof value;
  
  let result: string;
  
  if (value === null || value === undefined) {
    result = '';
  } else if (typeof value === 'string') {
    result = value;
  } else if (typeof value === 'number') {
    result = String(value);
  } else if (typeof value === 'boolean') {
    result = String(value);
  } else if (typeof value === 'object') {
    result = JSON.stringify(value);
    console.warn('⚠️ ensureString: Objeto detectado e convertido:', {
      valorOriginal: originalValue,
      tipoOriginal: originalType,
      resultado: result
    });
  } else {
    result = String(value);
  }
  
  console.log('ensureString:', {
    entrada: originalValue,
    tipoEntrada: originalType,
    saida: result,
    tipoSaida: typeof result
  });
  
  return result;
};

/**
 * Garante que um array de valores seja convertido para array de strings
 */
export const ensureStringArray = (values: any[]): string[] => {
  return values.map(ensureString);
};

