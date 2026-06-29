import { IXC_EVENTO_ABERTURA } from '../externos/IxcOssChamadoService/constants';
import type { IxcOssMensagem } from '../externos/IxcOssChamadoService/types';

const PREFIXO_RX = /^([^:]+):\s([\s\S]*)$/;

export function extractOperadorFromMensagem(mensagem: string): { operador: string; texto: string } {
  const texto = String(mensagem ?? '').trim();
  const match = texto.match(PREFIXO_RX);
  if (!match) {
    return { operador: '', texto };
  }
  return {
    operador: match[1].trim(),
    texto: match[2].trim() || texto,
  };
}

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
    const { operador, texto } = extractOperadorFromMensagem(String(mensagem.mensagem ?? ''));
    const operadorNome =
      operador || (mensagem.id_evento === IXC_EVENTO_ABERTURA ? abertura : '');

    return {
      ...mensagem,
      operador_nome: operadorNome,
      mensagem: operadorNome && texto ? `${operadorNome}: ${texto}` : String(mensagem.mensagem ?? ''),
    };
  });
}
