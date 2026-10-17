export class SaasTituloBoletoService {
  static async gerarBoleto(_tituloId: number) {
    return { success: false, message: 'Título não encontrado' };
  }
}
