import type { TranslationKeys } from 'contexts/I18nContext';
import type { ButtonSize, ButtonVariant } from '../Button';

export type SystemButtonAction =
  | 'novo'
  | 'editar'
  | 'deletar'
  | 'salvar'
  | 'cancelar'
  | 'fechar'
  | 'confirmar'
  | 'confirmarPagamento'
  | 'confirmarCancelamento'
  | 'sincronizar'
  | 'auditar'
  | 'recarregar'
  | 'copiar'
  | 'imprimir'
  | 'imprimirNF'
  | 'exportar'
  | 'importar'
  | 'visualizar'
  | 'baixar'
  | 'gerar'
  | 'gerarToken'
  | 'gerarNFSeAvulsa'
  | 'buscar'
  | 'filtrar'
  | 'limpar'
  | 'voltar'
  | 'proximo'
  | 'anterior'
  | 'finalizar'
  | 'enviar'
  | 'receber'
  | 'estornar'
  | 'viaWhatsApp'
  | 'viaEmail'
  | 'testarConexao'
  | 'selecionar'
  | 'adicionar'
  | 'remover'
  | 'selecionados'
  | 'abertos'
  | 'recibo'
  | 'pagar'
  | 'duplicar'
  | 'inserir'
  | 'nfse'
  | 'criarTitulo'
  | 'atualizarSistema'
  | 'validar'
  | 'instalarAgente'
  | 'tentarNovamente'
  | 'abrirCentralAssinante'
  | 'entrar'
  | 'enviarSenha'
  | 'alterarSenha'
  | 'copiarCodigoBarras'
  | 'copiarPix'
  | 'aplicar'
  | 'aplicarSelecao'
  | 'extrairSeiAnatel'
  | 'extrairDominiosPdf'
  | 'extrairPlanilhaUrl'
  | 'validarCnpj'
  | 'validarCep'
  | 'ocultarFiltros'
  | 'mostrarFiltros'
  | 'sair'
  | 'gerarRequisicaoCaFilha';

export interface SystemButtonStyleConfig {
  variant: ButtonVariant;
  defaultSize: ButtonSize;
  defaultType?: 'button' | 'submit';
  className?: string;
  i18nKey: keyof TranslationKeys;
}

const toolbarOutline: Pick<SystemButtonStyleConfig, 'variant' | 'className'> = {
  variant: 'outline-primary',
  className: 'table-toolbar-btn',
};

export const SYSTEM_BUTTON_CONFIG: Record<SystemButtonAction, SystemButtonStyleConfig> = {
  novo: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.new' },
  editar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.edit' },
  deletar: { variant: 'danger', defaultSize: 'sm', i18nKey: 'buttons.delete' },
  salvar: { variant: 'primary', defaultSize: 'sm', defaultType: 'submit', i18nKey: 'buttons.save' },
  cancelar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.cancel' },
  fechar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.close' },
  confirmar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.confirm' },
  confirmarPagamento: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.confirmPayment' },
  confirmarCancelamento: { variant: 'danger', defaultSize: 'sm', i18nKey: 'buttons.confirmCancellation' },
  sincronizar: { defaultSize: 'sm', i18nKey: 'buttons.sync', ...toolbarOutline },
  auditar: { defaultSize: 'sm', i18nKey: 'buttons.audit', ...toolbarOutline },
  recarregar: { defaultSize: 'sm', i18nKey: 'buttons.reload', ...toolbarOutline },
  copiar: { variant: 'outline-secondary', defaultSize: 'sm', i18nKey: 'buttons.copy' },
  imprimir: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.print' },
  imprimirNF: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.printNF' },
  exportar: { defaultSize: 'sm', i18nKey: 'buttons.export', ...toolbarOutline },
  importar: { defaultSize: 'sm', i18nKey: 'buttons.import', ...toolbarOutline },
  visualizar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.view' },
  baixar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.download' },
  gerar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.generate' },
  gerarToken: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.generateToken' },
  gerarNFSeAvulsa: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.generateNFSeAvulsa' },
  buscar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.search' },
  filtrar: { variant: 'outline-secondary', defaultSize: 'sm', i18nKey: 'buttons.filter' },
  limpar: { variant: 'outline-secondary', defaultSize: 'sm', i18nKey: 'buttons.clear' },
  voltar: { variant: 'secondary', defaultSize: 'sm', i18nKey: 'buttons.back' },
  proximo: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.next' },
  anterior: { variant: 'secondary', defaultSize: 'sm', i18nKey: 'buttons.previous' },
  finalizar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.finish' },
  enviar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.send' },
  receber: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.receive' },
  estornar: { variant: 'danger', defaultSize: 'sm', i18nKey: 'buttons.reverse' },
  viaWhatsApp: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.viaWhatsApp' },
  viaEmail: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.viaEmail' },
  testarConexao: { variant: 'outline-primary', defaultSize: 'sm', i18nKey: 'buttons.testConnection' },
  selecionar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.select' },
  adicionar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.add' },
  remover: { variant: 'danger', defaultSize: 'sm', i18nKey: 'buttons.remove' },
  selecionados: { variant: 'outline-secondary', defaultSize: 'sm', i18nKey: 'buttons.selected' },
  abertos: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.open' },
  recibo: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.receipt' },
  pagar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'actions.pay' },
  duplicar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'actions.duplicate' },
  inserir: { variant: 'primary', defaultSize: 'sm', i18nKey: 'actions.insert' },
  nfse: { variant: 'primary', defaultSize: 'sm', i18nKey: 'actions.nfse' },
  criarTitulo: { variant: 'primary', defaultSize: 'sm', defaultType: 'submit', i18nKey: 'titulo.createTitle' },
  atualizarSistema: { variant: 'primary', defaultSize: 'sm', i18nKey: 'updates.updateSystem' },
  validar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.validate' },
  instalarAgente: { variant: 'primary', defaultSize: 'sm', i18nKey: 'agent.install' },
  tentarNovamente: { variant: 'outline-primary', defaultSize: 'sm', i18nKey: 'messages.tryAgain' },
  abrirCentralAssinante: { variant: 'secondary', defaultSize: 'sm', i18nKey: 'central.openPortal' },
  entrar: { variant: 'primary', defaultSize: 'md', i18nKey: 'login.enter' },
  enviarSenha: { variant: 'primary', defaultSize: 'md', defaultType: 'submit', i18nKey: 'central.sendPassword' },
  alterarSenha: { variant: 'primary', defaultSize: 'md', defaultType: 'submit', i18nKey: 'central.changePassword' },
  copiarCodigoBarras: { variant: 'secondary', defaultSize: 'sm', i18nKey: 'central.copyBarcode' },
  copiarPix: { variant: 'secondary', defaultSize: 'sm', i18nKey: 'central.copyPix' },
  aplicar: { variant: 'primary', defaultSize: 'sm', i18nKey: 'buttons.apply' },
  aplicarSelecao: { variant: 'primary', defaultSize: 'sm', i18nKey: 'blockdomi.colunasAplicar' },
  extrairSeiAnatel: { variant: 'primary', defaultSize: 'sm', i18nKey: 'blockdomi.extractSeiFromAnatelPdf' },
  extrairDominiosPdf: { variant: 'primary', defaultSize: 'sm', i18nKey: 'blockdomi.extractDomainsFromPdf' },
  extrairPlanilhaUrl: { variant: 'secondary', defaultSize: 'sm', i18nKey: 'blockdomi.extractFromPlanilhaUrl' },
  validarCnpj: { variant: 'outline-primary', defaultSize: 'sm', i18nKey: 'params.validateCpfCnpj' },
  validarCep: { variant: 'outline-primary', defaultSize: 'sm', i18nKey: 'params.validateCep' },
  ocultarFiltros: { variant: 'outline-primary', defaultSize: 'sm', i18nKey: 'ui.hideFilters' },
  mostrarFiltros: { variant: 'outline-primary', defaultSize: 'sm', i18nKey: 'ui.showFilters' },
  sair: { variant: 'primary', defaultSize: 'sm', i18nKey: 'central.logout' },
  gerarRequisicaoCaFilha: { variant: 'primary', defaultSize: 'sm', i18nKey: 'rpki.generateChildCaRequest' },
};

type TranslateFn = (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;

export function getSystemButtonBulkProps(action: SystemButtonAction, t: TranslateFn, entity?: string) {
  const config = SYSTEM_BUTTON_CONFIG[action];
  const label =
    action === 'novo' && entity ? t('buttons.createEntity', { entity }) : t(config.i18nKey);
  return { label, variant: getBulkActionVariant(action) };
}

export type BulkBtnVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

const BULK_VARIANTS = new Set<BulkBtnVariant>([
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
]);

export function toBulkVariant(variant: ButtonVariant): BulkBtnVariant {
  if (variant === 'ghost') return 'primary';
  if (variant.startsWith('outline-')) {
    const base = variant.slice('outline-'.length);
    return BULK_VARIANTS.has(base as BulkBtnVariant) ? (base as BulkBtnVariant) : 'primary';
  }
  return BULK_VARIANTS.has(variant as BulkBtnVariant) ? (variant as BulkBtnVariant) : 'primary';
}

export function getBulkActionVariant(action: SystemButtonAction): BulkBtnVariant {
  return toBulkVariant(SYSTEM_BUTTON_CONFIG[action].variant);
}

/** Nome do componente exportado (PascalCase + Button). */
export const SYSTEM_BUTTON_EXPORT_NAMES: Record<SystemButtonAction, string> = {
  novo: 'NovoButton',
  editar: 'EditarButton',
  deletar: 'DeletarButton',
  salvar: 'SalvarButton',
  cancelar: 'CancelarButton',
  fechar: 'FecharButton',
  confirmar: 'ConfirmarButton',
  confirmarPagamento: 'ConfirmarPagamentoButton',
  confirmarCancelamento: 'ConfirmarCancelamentoButton',
  sincronizar: 'SincronizarButton',
  auditar: 'AuditarButton',
  recarregar: 'RecarregarButton',
  copiar: 'CopiarButton',
  imprimir: 'ImprimirButton',
  imprimirNF: 'ImprimirNFButton',
  exportar: 'ExportarButton',
  importar: 'ImportarButton',
  visualizar: 'VisualizarButton',
  baixar: 'BaixarButton',
  gerar: 'GerarButton',
  gerarToken: 'GerarTokenButton',
  gerarNFSeAvulsa: 'GerarNFSeAvulsaButton',
  buscar: 'BuscarButton',
  filtrar: 'FiltrarButton',
  limpar: 'LimparButton',
  voltar: 'VoltarButton',
  proximo: 'ProximoButton',
  anterior: 'AnteriorButton',
  finalizar: 'FinalizarButton',
  enviar: 'EnviarButton',
  receber: 'ReceberButton',
  estornar: 'EstornarButton',
  viaWhatsApp: 'ViaWhatsAppButton',
  viaEmail: 'ViaEmailButton',
  testarConexao: 'TestarConexaoButton',
  selecionar: 'SelecionarButton',
  adicionar: 'AdicionarButton',
  remover: 'RemoverButton',
  selecionados: 'SelecionadosButton',
  abertos: 'AbertosButton',
  recibo: 'ReciboButton',
  pagar: 'PagarButton',
  duplicar: 'DuplicarButton',
  inserir: 'InserirButton',
  nfse: 'NfseButton',
  criarTitulo: 'CriarTituloButton',
  atualizarSistema: 'AtualizarSistemaButton',
  validar: 'ValidarButton',
  instalarAgente: 'InstalarAgenteButton',
  tentarNovamente: 'TentarNovamenteButton',
  abrirCentralAssinante: 'AbrirCentralAssinanteButton',
  entrar: 'EntrarButton',
  enviarSenha: 'EnviarSenhaButton',
  alterarSenha: 'AlterarSenhaButton',
  copiarCodigoBarras: 'CopiarCodigoBarrasButton',
  copiarPix: 'CopiarPixButton',
  aplicar: 'AplicarButton',
  aplicarSelecao: 'AplicarSelecaoButton',
  extrairSeiAnatel: 'ExtrairSeiAnatelButton',
  extrairDominiosPdf: 'ExtrairDominiosPdfButton',
  extrairPlanilhaUrl: 'ExtrairPlanilhaUrlButton',
  validarCnpj: 'ValidarCnpjButton',
  validarCep: 'ValidarCepButton',
  ocultarFiltros: 'OcultarFiltrosButton',
  mostrarFiltros: 'MostrarFiltrosButton',
  sair: 'SairButton',
  gerarRequisicaoCaFilha: 'GerarRequisicaoCaFilhaButton',
};
