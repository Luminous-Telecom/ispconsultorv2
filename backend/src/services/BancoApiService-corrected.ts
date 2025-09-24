  /**
   * Preparar dados do carnê para API (CORRIGIDO para estrutura EFI)
   */
  private static async prepararDadosCarne(
    banco: Banco, 
    carne: Carne, 
    cliente: any, 
    config: BancoConfig
  ): Promise<any> {
    const baseUrl = banco.url_retorno || process.env.APP_URL || 'http://localhost:3001';
    
    // Calcular valor por parcela (EFI espera valor do item em centavos por parcela)
    const valorParcela = Number(carne.valor_total) / Number(carne.quantidade_parcelas);
    const valorParcelaCentavos = Math.round(valorParcela * 100);

    // Multa/Juros em basis points (ex.: 2.00% => 200)
    const fineBp = Math.round(Number(banco.percentual_multa || 0) * 100);
    const interestBp = Math.round(Number(banco.percentual_juros || 0) * 100);

    return {
      items: [{
        name: 'Serviço',
        value: valorParcelaCentavos,
        amount: 1
      }],
      customer: {
        name: cliente.nome_fantasia || cliente.razao_social,
        email: cliente.email,
        phone: cliente.telefone,
        document: cliente.cnpj,
        address: {
          street: cliente.endereco,
          number: cliente.numero,
          neighborhood: cliente.bairro,
          city: cliente.cidade,
          state: cliente.estado,
          zipcode: cliente.cep
        }
      },
      expire_at: new Date(carne.data_vencimento_primeira).toISOString().split('T')[0], // Formato YYYY-MM-DD
      repeats: Number(carne.quantidade_parcelas),
      split_items: false,
      configurations: {
        fine: fineBp,
        interest: interestBp
      },
      metadata: {
        custom_id: `carne_${carne.id}`,
        notification_url: `${baseUrl}/webhook/efi`
      }
    };
  }
