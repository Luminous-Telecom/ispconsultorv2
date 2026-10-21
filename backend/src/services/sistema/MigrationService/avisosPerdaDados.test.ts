const { avisosDePerdaSaoSoIndiceUnico } = require('../../../../scripts/db-push') as {
  avisosDePerdaSaoSoIndiceUnico: (saida: string) => boolean;
};

const SAIDA_INDICE = `
⚠️  There might be data loss when applying the changes:

  • A unique constraint covering the columns \`[servidor_whatsapp_id,tipo]\` on the table \`comunicacao_mensagens_whatsapp\` will be added. If there are existing duplicate values, this will fail.

  • A unique constraint covering the columns \`[servidor_whatsapp_id,nome,idioma]\` on the table \`comunicacao_templates_whatsapp\` will be added. If there are existing duplicate values, this will fail.

Error: Use the --accept-data-loss flag to ignore the data loss warnings like prisma db push --accept-data-loss
`;

describe('avisosDePerdaSaoSoIndiceUnico', () => {
  it('aceita quando todos os avisos são só de índice único', () => {
    expect(avisosDePerdaSaoSoIndiceUnico(SAIDA_INDICE)).toBe(true);
  });

  it('recusa quando há remoção de coluna junto do índice', () => {
    const saida = `${SAIDA_INDICE}\n  • You are about to drop the column \`tipo\` on the \`comunicacao_mensagens_whatsapp\` table, which still contains 4 non-null values.`;
    expect(avisosDePerdaSaoSoIndiceUnico(saida)).toBe(false);
  });

  it('recusa saída sem o pedido do Prisma e sem avisos', () => {
    expect(avisosDePerdaSaoSoIndiceUnico('Error: P1001 Can\'t reach database server')).toBe(false);
    expect(avisosDePerdaSaoSoIndiceUnico('Error: Use the --accept-data-loss flag')).toBe(false);
  });
});
