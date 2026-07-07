import type { PlanoModuloId } from './planoModulos';

export type SaasPlanoLimiteGrupo = 'cadastros' | 'equipamentos' | 'rpki' | 'ixc_provedor' | 'ordens_servico';

export interface SaasPlanoLimiteDef {
  formKey: string;
  recursosKey: string;
  modulo: PlanoModuloId;
  grupo: SaasPlanoLimiteGrupo;
  label: string;
  listLabelShort: string;
}

export const SAAS_PLANO_LIMITE_DEFS: SaasPlanoLimiteDef[] = [
  { formKey: 'limite_clientes', recursosKey: 'cadastros_limite_clientes', modulo: 'cadastros', grupo: 'cadastros', label: 'Clientes', listLabelShort: 'Clientes' },
  { formKey: 'limite_bancos', recursosKey: 'cadastros_limite_bancos', modulo: 'cadastros', grupo: 'cadastros', label: 'Bancos', listLabelShort: 'Bancos' },
  { formKey: 'limite_contratos', recursosKey: 'cadastros_limite_contratos', modulo: 'cadastros', grupo: 'cadastros', label: 'Contratos', listLabelShort: 'Contratos' },
  { formKey: 'limite_planos', recursosKey: 'cadastros_limite_planos', modulo: 'cadastros', grupo: 'cadastros', label: 'Planos', listLabelShort: 'Planos' },
  { formKey: 'limite_modelos_documento', recursosKey: 'cadastros_limite_modelos_documento', modulo: 'cadastros', grupo: 'cadastros', label: 'Modelos de documentos', listLabelShort: 'Mod. doc.' },
  { formKey: 'limite_integracoes', recursosKey: 'ixc_provedor_limite_integracoes', modulo: 'ixc_provedor', grupo: 'ixc_provedor', label: 'Integrações IXC', listLabelShort: 'IXC' },
  { formKey: 'limite_ordens_servico', recursosKey: 'ordens_servico_limite_ordens_servico', modulo: 'ordens_servico', grupo: 'ordens_servico', label: 'Ordens de serviço', listLabelShort: 'O.S.' },
  { formKey: 'limite_equipamentos', recursosKey: 'equipamentos_limite_equipamentos', modulo: 'equipamentos', grupo: 'equipamentos', label: 'Equipamentos', listLabelShort: 'Equip.' },
  { formKey: 'limite_tuneis', recursosKey: 'equipamentos_limite_tuneis', modulo: 'equipamentos', grupo: 'equipamentos', label: 'Túneis', listLabelShort: 'Túneis' },
  { formKey: 'limite_backups', recursosKey: 'equipamentos_limite_backups', modulo: 'equipamentos', grupo: 'equipamentos', label: 'Backups por equipamento', listLabelShort: 'Backups' },
  { formKey: 'limite_cas', recursosKey: 'rpki_limite_cas', modulo: 'rpki', grupo: 'rpki', label: 'CAs', listLabelShort: 'CAs' },
  { formKey: 'limite_cas_pai', recursosKey: 'rpki_limite_cas_pai', modulo: 'rpki', grupo: 'rpki', label: 'CAs-pai', listLabelShort: 'CAs-pai' },
  { formKey: 'limite_repositorios', recursosKey: 'rpki_limite_repositorios', modulo: 'rpki', grupo: 'rpki', label: 'Repositórios', listLabelShort: 'Repos.' },
  { formKey: 'limite_roas', recursosKey: 'rpki_limite_roas', modulo: 'rpki', grupo: 'rpki', label: 'ROAs', listLabelShort: 'ROAs' },
  { formKey: 'limite_aspas', recursosKey: 'rpki_limite_aspas', modulo: 'rpki', grupo: 'rpki', label: 'ASPAs', listLabelShort: 'ASPAs' },
];

export const SAAS_PLANO_LIMITE_DEFS_BY_RECURSOS_KEY = Object.fromEntries(
  SAAS_PLANO_LIMITE_DEFS.map((def) => [def.recursosKey, def])
) as Record<string, SaasPlanoLimiteDef>;

export type SaasPlanoLimiteRecursoId = (typeof SAAS_PLANO_LIMITE_DEFS)[number]['recursosKey'];
