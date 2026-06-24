import { IXC_EVENTO_ABERTURA } from '../externos/IxcOssChamadoService/constants';
import type { IxcOssMensagem } from '../externos/IxcOssChamadoService/types';

const PREFIXO_RX = /^([^:]+):\s/;

export function prefixarMensagemOperador(
  operadorNome: string,
  mensagem: string | number | null | undefined
): string {
  const texto = String(mensagem ?? '').trim();
  if (!texto) return '';
  const operador = operadorNome.trim();
  if (!operador || PREFIXO_RX.test(texto)) return texto;
  return `${operador}: ${texto}`;
}

export function mapMensagensIxcOperadorBacknet(
  mensagens: IxcOssMensagem[],
  operadorAbertura = ''
): IxcOssMensagem[] {
  const abertura = operadorAbertura.trim();

  return mensagens.map((mensagem) => {
    const texto = String(mensagem.mensagem ?? '').trim();
    const match = texto.match(/^([^:]+):\s([\s\S]*)$/);
    const operador =
      match?.[1]?.trim() ||
      (mensagem.id_evento === IXC_EVENTO_ABERTURA ? abertura : '');

    return {
      ...mensagem,
      operador_nome: operador,
      mensagem: match ? texto : operador ? `${operador}: ${texto}` : texto,
    };
  });
}
