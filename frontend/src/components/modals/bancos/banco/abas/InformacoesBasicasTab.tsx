import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormField, AtivoInativoField, EntityIdField, EntitySelectField } from 'components/ui';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import { BancoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';
import { ServidorEmail, ServidorEmailService } from 'services/servidorEmailService';
import { ServidorWhatsApp, ServidorWhatsAppService } from 'services/servidorWhatsAppService';
import ServidorEmailListModal from 'components/modals/parametros/servidor-email/ServidorEmailListModal';
import ServidorWhatsappListModal from 'components/modals/parametros/servidor-whatsapp/ServidorWhatsappListModal';

function nomeServidorEmail(item: Pick<ServidorEmail, 'descricao' | 'email_remetente' | 'host'>): string {
  return item.descricao || item.email_remetente || item.host;
}

function nomeServidorWhatsapp(item: Pick<ServidorWhatsApp, 'descricao' | 'instance_name'>): string {
  return item.descricao || item.instance_name || '';
}

const InformacoesBasicasTab: React.FC<BancoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isPending,
  formPrefix,
  entityId,
}) => {
  const { t } = useI18n();
  const emailEdit = useEntityRecordEdit('servidorEmail');
  const whatsappEdit = useEntityRecordEdit('servidorWhatsapp');
  const [showEmailList, setShowEmailList] = useState(false);
  const [showWhatsappList, setShowWhatsappList] = useState(false);
  const emailId = formData.servidor_email_cobranca_id;
  const whatsappId = formData.servidor_whatsapp_cobranca_id;

  const { data: emailsData } = useQuery({
    queryKey: ['servidores-email', 'opcoes-banco'],
    queryFn: () => ServidorEmailService.list({ page: 1, limit: 100, sortColumn: 'descricao', sortDirection: 'asc' }),
  });
  const { data: whatsappsData } = useQuery({
    queryKey: ['servidores-whatsapp', 'opcoes-banco'],
    queryFn: () => ServidorWhatsAppService.list({ page: 1, limit: 100, sortColumn: 'descricao', sortDirection: 'asc' }),
  });
  const { data: emailDetalhe } = useQuery({
    queryKey: ['servidor-email', emailId],
    queryFn: () => ServidorEmailService.getById(emailId as number),
    enabled: !!emailId,
  });
  const { data: whatsappDetalhe } = useQuery({
    queryKey: ['servidor-whatsapp', whatsappId],
    queryFn: () => ServidorWhatsAppService.getById(whatsappId as number),
    enabled: !!whatsappId,
  });

  const emailsEntities = useMemo(() => {
    const base = (emailsData?.data ?? []).map((item) => ({ id: item.id, nome: nomeServidorEmail(item) }));
    const atual = emailDetalhe?.data;
    if (atual?.id && !base.some((item) => item.id === atual.id)) {
      return [{ id: atual.id, nome: nomeServidorEmail(atual) }, ...base];
    }
    return base;
  }, [emailsData?.data, emailDetalhe?.data]);

  const whatsappEntities = useMemo(() => {
    const base = (whatsappsData?.data ?? []).map((item) => ({ id: item.id, nome: nomeServidorWhatsapp(item) }));
    const atual = whatsappDetalhe?.data;
    if (atual?.id && !base.some((item) => item.id === atual.id)) {
      return [{ id: atual.id, nome: nomeServidorWhatsapp(atual) }, ...base];
    }
    return base;
  }, [whatsappsData?.data, whatsappDetalhe?.data]);

  return (
    <>
      <div className="row g-2">
        <EntityIdField id={entityId} formPrefix={formPrefix} />
        <div className="col-12">
          <FormField
            name="nome"
            type="text"
            label={t('table.bankName')}
            description={t('form.bankNameHelp')}
            placeholder={t('placeholder.bankName')}
            required={true}
            size="sm"
            value={formData.nome}
            onChange={(value) => handleInputChange('nome', value)}
            error={errors.nome}
            isInvalid={!!errors.nome}
            disabled={isPending}
            formPrefix={formPrefix}
          />
        </div>

        <div className="col-12">
          <FormField
            name="tipo_banco"
            type="select"
            label={t('table.bankType')}
            description={t('form.bankTypeHelp')}
            size="sm"
            value={formData.tipo_banco}
            onChange={(value) => handleInputChange('tipo_banco', value)}
            disabled={isPending}
            formPrefix={formPrefix}
            options={[
              { value: 'efi', label: 'EFI (Código: 364)' },
              { value: 'asaas', label: 'Asaas (Código: 461)' }
            ]}
          />
        </div>

        <div className="col-12">
          <AtivoInativoField
            value={formData.ativo}
            onChange={(v) => handleInputChange('ativo', v)}
            name={formPrefix ? `${formPrefix}-ativo` : 'banco-ativo'}
            disabled={isPending}
          />
        </div>

        <div className="col-12">
          <EntitySelectField
            label={t('form.billingEmailServer')}
            helpText={t('form.billingServerHelp')}
            value={emailId ?? 0}
            disabled={isPending}
            entities={emailsEntities}
            onShowModal={() => setShowEmailList(true)}
            onEdit={() => emailEdit.open(emailId ?? 0)}
            onChange={(value) => handleInputChange('servidor_email_cobranca_id', value || null)}
          />
        </div>

        <div className="col-12">
          <EntitySelectField
            label={t('form.billingWhatsappServer')}
            helpText={t('form.billingServerHelp')}
            value={whatsappId ?? 0}
            disabled={isPending}
            entities={whatsappEntities}
            onShowModal={() => setShowWhatsappList(true)}
            onEdit={() => whatsappEdit.open(whatsappId ?? 0)}
            onChange={(value) => handleInputChange('servidor_whatsapp_cobranca_id', value || null)}
          />
        </div>

        <div className="col-12">
          <FormField
            name="descricao"
            type="textarea"
            label={t('table.description')}
            placeholder={t('placeholder.bankDescription')}
            size="sm"
            value={formData.descricao}
            onChange={(value) => handleInputChange('descricao', value)}
            disabled={isPending}
            rows={3}
            formPrefix={formPrefix}
          />
        </div>
      </div>

      <ServidorEmailListModal
        show={showEmailList}
        onClose={() => setShowEmailList(false)}
        onSelect={(item) => handleInputChange('servidor_email_cobranca_id', item.id)}
      />
      <ServidorWhatsappListModal
        show={showWhatsappList}
        onClose={() => setShowWhatsappList(false)}
        onSelect={(item) => handleInputChange('servidor_whatsapp_cobranca_id', item.id)}
      />
      {emailEdit.modal}
      {whatsappEdit.modal}
    </>
  );
};

export default InformacoesBasicasTab;
