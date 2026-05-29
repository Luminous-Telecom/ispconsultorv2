export function getTituloStatusColor(status: string): string {
  switch (status) {
    case 'pago':
      return 'success';
    case 'pago_atraso':
      return 'warning';
    case 'pendente':
      return 'primary';
    case 'vencido':
      return 'danger';
    case 'parcial':
      return 'info';
    case 'cancelado':
      return 'secondary';
    default:
      return 'secondary';
  }
}
