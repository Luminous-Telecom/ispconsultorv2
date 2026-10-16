/** Título quitado que pode receber o recibo de pagamento. */
export function isTituloPagoParaRecibo(status: string | null | undefined): boolean {
  return status === 'pago' || status === 'pago_atraso';
}
