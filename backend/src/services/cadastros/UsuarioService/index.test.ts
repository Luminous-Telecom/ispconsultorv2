jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_usuarios: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { UsuarioService } from './index';

const usuarios = prisma.cadastros_usuarios;

const row = {
  id: 2,
  nome: 'Admin',
  email: 'admin@ispconsultor.com.br',
  password_hash: '$2b$hash',
  role: 'admin',
  ativo: true,
  empresa_id: 10,
  webhook_secret: 'segredo',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UsuarioService visualização', () => {
  it('lista a empresa e omite o hash da senha, inclusive com lista vazia', async () => {
    (usuarios.count as jest.Mock).mockResolvedValue(0);
    (usuarios.findMany as jest.Mock).mockResolvedValue([]);

    const vazio = await UsuarioService.list({ empresa_id: 10 });

    expect(vazio.data).toEqual([]);
    expect(usuarios.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 10 }),
    }));

    (usuarios.count as jest.Mock).mockResolvedValue(1);
    (usuarios.findMany as jest.Mock).mockResolvedValue([row]);
    const lista = await UsuarioService.list({ empresa_id: 10 });

    expect(lista.data[0]).not.toHaveProperty('password_hash');
    expect(lista.data[0]).toMatchObject({ id: 2, email: row.email });
  });

  it('não devolve hash na visualização e retorna nulo se não existe', async () => {
    (usuarios.findUnique as jest.Mock).mockResolvedValueOnce(row).mockResolvedValueOnce(null);

    const encontrado = await UsuarioService.getById(2);
    const ausente = await UsuarioService.getById(99);

    expect(encontrado).not.toHaveProperty('password_hash');
    expect(encontrado).toMatchObject({ id: 2, empresa_id: 10 });
    expect(ausente).toBeNull();
  });
});

describe('UsuarioService cadastro e edição', () => {
  it('grava o hash e a empresa, sem devolver a senha', async () => {
    (usuarios.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 3, ...data }));

    const criado = await UsuarioService.create({
      nome: 'Operador',
      email: 'op@ispconsultor.com.br',
      password: 'senha-plana',
      empresa_id: 10,
      role: 'user',
    });

    const data = (usuarios.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.password_hash).not.toBe('senha-plana');
    expect(String(data.password_hash).startsWith('$2')).toBe(true);
    expect(criado).not.toHaveProperty('password_hash');
  });

  it('edição parcial não troca e-mail nem senha', async () => {
    (usuarios.findUnique as jest.Mock).mockResolvedValue(row);
    (usuarios.update as jest.Mock).mockResolvedValue({ ...row, nome: 'Novo nome' });

    const atualizado = await UsuarioService.update(2, { nome: 'Novo nome' });

    expect(usuarios.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nome: 'Novo nome' },
    });
    expect(atualizado).not.toHaveProperty('password_hash');
  });

  it('não grava usuário inexistente', async () => {
    (usuarios.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(UsuarioService.update(99, { nome: 'X' })).rejects.toThrow('Usuário não encontrado');
    expect(usuarios.update).not.toHaveBeenCalled();
  });
});
