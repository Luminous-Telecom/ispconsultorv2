import Joi from 'joi';
import { joiErrorsToFieldMap } from './validationUtils';

describe('joiErrorsToFieldMap', () => {
  it('agrupa mensagens pelo campo e usa general quando não há path', () => {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      nome: Joi.string().min(2).required(),
    });
    const { error } = schema.validate({}, { abortEarly: false });
    const map = joiErrorsToFieldMap(error?.details ?? []);
    expect(map.email?.length).toBeGreaterThan(0);
    expect(map.nome?.length).toBeGreaterThan(0);

    const geral = joiErrorsToFieldMap([
      { message: 'falhou', path: [], type: 'any.custom' } as Joi.ValidationErrorItem,
    ]);
    expect(geral.general).toEqual(['falhou']);
  });
});
