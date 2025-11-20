'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const mensagemPadrao = `<figure class="table" style="width:100%px;">

    <table style="background-color:#f5f5f5;font-family:Arial, sans-serif;margin-bottom:0;margin-top:0;padding:20px;" cellspacing="0" cellpadding="0">

        <tbody>

            <tr>

                <td style="text-align:center;">

                    <figure class="table" style="width:90%px;">

                        <table style="background-color:#2563EB;border-radius:10px 10px 0 0;color:#ffffff;margin-bottom:0;margin-top:0;padding:20px;text-align:center;" max-width="600px" cellspacing="0" cellpadding="0">

                            <tbody>

                                <tr>

                                    <td>

                                        <p>

                                            #empresa.logo#

                                        </p>

                                        <p style="font-size:14px;margin:5px 0;">

                                            <a style="color:#ffffff;text-decoration:none;" href="https://luminoustelecom.com.br/central/login.hhvm"><strong>Central Assinante</strong></a> | #empresa.telefone#

                                        </p>

                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </figure>

                    <figure class="table" style="width:90%px;">

                        <table style="background-color:#ffffff;border-radius:0 0 10px 10px;margin-bottom:0;margin-top:0;padding:20px;text-align:left;" max-width="600px" cellspacing="0" cellpadding="0">

                            <tbody>

                                <tr>

                                    <td>

                                        <h2 style="color:#111827;font-size:20px;margin:0;">

                                            <strong>Fatura</strong>

                                        </h2>

                                        <p style="color:#6b7280;font-size:14px;margin:5px 0 15px;">

                                            Vencimento: #titulo.vencimento#<strong>%</strong>

                                        </p>

                                        <p style="color:#111827;font-size:14px;margin:0;">

                                            <strong>CLIENTE:</strong> #cliente.razao_social#

                                        </p>

                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </figure>

                    <figure class="table" style="width:90%px;">

                        <table style="background-color:#ffffff;border-collapse:collapse;border-color:#d1d5db;border-radius:10px;border-style:solid;margin-bottom:20px;margin-top:20px;text-align:center;" max-width="600px" cellspacing="0" cellpadding="0">

                            <thead>

                                <tr style="background-color:#2563EB;color:#ffffff;">

                                    <th style="border-right:1px solid #d1d5db;font-size:16px;padding:12px;">

                                        PLANO

                                    </th>

                                    <th style="font-size:16px;padding:12px;">

                                        VALOR

                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                <tr>

                                    <td style="border-color:#d1d5db;color:#111827;padding:12px;">

                                        #contrato.plano#

                                    </td>

                                    <td style="border-color:#d1d5db;color:#111827;font-size:16px;padding:12px;">

                                        R$ #titulo.valor#

                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </figure>

                    <figure class="table" style="width:90%px;">

                        <table style="background-color:#ffffff;border-radius:10px;margin-bottom:0;margin-top:0;padding:20px;text-align:center;" max-width="600px" cellspacing="0" cellpadding="0">

                            <tbody>

                                <tr>

                                    <td style="color:#6b7280;font-size:14px;padding-bottom:15px;">

                                        Caso prefira pagar via PIX, utilize o QR Code ou copie o código abaixo:

                                    </td>

                                </tr>

                                <tr>

                                    <td style="background-color:#E5E7EB;border-radius:5px;color:#111827;font-size:12px;padding:15px;word-break:break-word;">

                                        #titulo.codigo_pix#

                                    </td>

                                </tr>

                                <tr>

                                    <td style="color:#6b7280;font-size:12px;padding-top:15px;">

                                        Para pagamento via PIX, copie e cole o código acima no aplicativo do seu banco.

                                    </td>

                                </tr>

                                <tr>

                                    <td style="color:#6b7280;font-size:14px;padding-top:20px;">

                                        Linha digitável do boleto:&nbsp;<br>

                                        <br>

                                        &nbsp;

                                    </td>

                                </tr>

                                <tr>

                                    <td style="background-color:#E5E7EB;border-radius:5px;color:#111827;font-size:12px;padding:15px;word-break:break-word;">

                                        #titulo.codigo_barras#

                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </figure>

                    <p>

                        <br>

                        &nbsp;

                    </p>

                    <figure class="table" style="width:90%px;">

                        <table style="background-color:#ffffff;border-color:#d1d5db;border-radius:10px;border-style:solid;margin-bottom:0;margin-top:0;padding:20px;text-align:center;" max-width="600px" cellspacing="0" cellpadding="0">

                            <tbody>

                                <tr>

                                    <td style="color:#2563EB;font-size:14px;padding-bottom:10px;">

                                        <strong>Pague com Pix, é rápido e seguro!</strong>

                                    </td>

                                </tr>

                                <tr>

                                    <td style="color:#6b7280;font-size:12px;">

                                        O pagamento via Pix pode ser feito 24h por dia, 7 dias por semana, com processamento instantâneo. Caso já tenha efetuado o pagamento, desconsidere este aviso.

                                    </td>

                                </tr>

                                <tr>

                                    <td style="color:#6b7280;font-size:12px;padding-top:20px;">

                                        Agradecemos a sua atenção,<br>

                                        #empresa.nome_fantasia#

                                    </td>

                                </tr>

                                <tr>

                                    <td style="border-top:1px solid #d1d5db;color:#9ca3af;font-size:10px;padding-top:15px;">

                                        Este e-mail foi enviado de um endereço automático e não recebe respostas. Por favor, não responda a este e-mail.

                                    </td>

                                </tr>

                            </tbody>

                        </table>

                    </figure>

                </td>

            </tr>

        </tbody>

    </table>

</figure>`;

    // Lista de TODOS os tipos de mensagens de email
    const tiposMensagens = [
      '10_dias_antes_vencimento',
      '05_dias_antes_vencimento',
      'mesmo_dia_vencimento',
      '05_dias_depois_vencimento',
      '10_dias_depois_vencimento',
      '15_dias_depois_vencimento',
      '20_dias_depois_vencimento',
      '30_dias_depois_vencimento'
    ];

    // Inserir ou atualizar TODAS as mensagens de email com o conteúdo padrão
    for (const tipo of tiposMensagens) {
      await queryInterface.sequelize.query(`
        INSERT INTO mensagens_email 
          (tipo, tipo_envio, mensagem_padrao, ativo, created_at, updated_at)
        VALUES 
          (:tipo, 'pdf', :mensagemPadrao, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          mensagem_padrao = :mensagemPadrao,
          updated_at = CURRENT_TIMESTAMP
      `, {
        replacements: { 
          tipo,
          mensagemPadrao
        }
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Não há como reverter essa alteração sem saber o conteúdo anterior
    // Por isso deixamos vazio
  }
};

