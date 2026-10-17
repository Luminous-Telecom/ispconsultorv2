const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function cnpj() {
  const base = '114447770001';
  const n = base.split('').map(Number);
  const calc = (len) => {
    let pos = len - 7;
    let sum = 0;
    for (let i = len; i >= 1; i -= 1) {
      sum += n[len - i] * pos;
      pos -= 1;
      if (pos < 2) pos = 9;
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  n.push(calc(12));
  n.push(calc(13));
  const s = n.join('');
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

function cpf() {
  const n = '529982247'.split('').map(Number);
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += n[i] * (len + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  n.push(calc(9));
  n.push(calc(10));
  const s = n.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

async function main() {
  const existente = await prisma.cadastros_usuarios.findUnique({
    where: { email: 'admin@ispconsultor.com.br' },
  });
  if (existente) {
    console.log('instalacao ja possui administrador');
    return;
  }

  const empresa = await prisma.sistema_tenants.create({
    data: {
      razao_social: 'ISP Consultor',
      nome_fantasia: 'ISP Consultor',
      cnpj: cnpj(),
      cep: '00000-000',
      endereco: 'A definir',
      numero: 'S/N',
      bairro: 'Centro',
      cidade: 'A definir',
      estado: 'SP',
      email: 'admin@ispconsultor.com.br',
      responsavel_nome: 'Administrador',
      responsavel_cpf: cpf(),
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.cadastros_usuarios.create({
    data: {
      nome: 'Administrador',
      email: 'admin@ispconsultor.com.br',
      password_hash: passwordHash,
      role: 'admin',
      ativo: true,
      precisa_trocar_senha: true,
      empresa_id: empresa.id,
    },
  });

  await prisma.sistema_parametros.create({
    data: { empresa_id: empresa.id },
  });

  console.log('instalacao criada');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
