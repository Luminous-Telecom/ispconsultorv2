import Joi from 'joi';

/** Converte detalhes Joi em mapa campo → mensagens (para sendValidationError). */
export function joiErrorsToFieldMap(details: Joi.ValidationErrorItem[]): Record<string, string[]> {
  return details.reduce<Record<string, string[]>>((acc, detail) => {
    const field = detail.path.join('.') || 'general';
    if (!acc[field]) acc[field] = [];
    acc[field].push(detail.message);
    return acc;
  }, {});
}
