import React from 'react';
import {
  VoltarButton,
  BaixarButton,
  CopiarButton,
} from 'components/ui';
import { formatCurrency, formatDate } from 'utils/formatters';
import { FaturaVisualizar } from './centralAssinanteUtils';

interface CentralAssinanteFaturaModalProps {
  faturaVisualizar: FaturaVisualizar;
  baixandoBoletoId: number | null;
  onClose: () => void;
  copiarCodigo: (text: string, fieldName: string) => void;
  handleImprimirFatura: (tituloId: number) => void;
}

const CentralAssinanteFaturaModal: React.FC<CentralAssinanteFaturaModalProps> = ({
  faturaVisualizar,
  baixandoBoletoId,
  onClose,
  copiarCodigo,
  handleImprimirFatura,
}) => (
  <div className="modal fade show d-block central-assinante-modal-backdrop" onClick={onClose}>
    <div className="modal-dialog modal-dialog-centered central-assinante-modal-dialog" onClick={(e) => e.stopPropagation()}>
      <div className="modal-content border-0 central-assinante-modal-content">
        <div className="border-bottom border-secondary central-assinante-modal-header">
          <div className="d-flex align-items-center justify-content-center position-relative w-100">
            <VoltarButton
              type="button"
              variant="ghost"
              className="text-white text-decoration-none p-0 position-absolute start-0 central-assinante-modal-close"
              onClick={onClose}
            />
            <h6 className="mb-0 text-white fw-bold central-assinante-modal-title">
              Fatura {faturaVisualizar.numero_titulo}
            </h6>
          </div>
        </div>

        <div className="modal-body central-assinante-modal-body">
          {faturaVisualizar.descricao && (
            <div className="mb-2">
              <small className="text-white-50 d-block central-assinante-modal-description">{faturaVisualizar.descricao}</small>
            </div>
          )}

          <div className="mb-2">
            <h6 className="text-success mb-1 fw-bold central-assinante-modal-value">
              {formatCurrency(faturaVisualizar.valor_aberto || faturaVisualizar.valor_final || faturaVisualizar.valor)}
            </h6>
            <small className="text-white-50 central-assinante-modal-date">Vencimento: {formatDate(faturaVisualizar.data_vencimento)}</small>
          </div>

          {faturaVisualizar.linha_digitavel && (
            <div className="mb-2">
              <p className="small text-white-50 mb-1 central-assinante-modal-description">
                Utilize o código abaixo para realizar o pagamento ou leia o QRCode para pagar via PIX.
              </p>
              <div className="central-assinante-modal-code-wrapper">
                <div className="small text-white font-monospace text-break central-assinante-modal-code">
                  {faturaVisualizar.linha_digitavel.match(/.{1,5}/g)?.map((chunk, idx) => (
                    <span key={idx}>{chunk} </span>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-center mt-1">
                <CopiarButton
                  type="button"
                  iconOnly
                  variant="secondary"
                  size="sm"
                  onClick={() => copiarCodigo(faturaVisualizar.linha_digitavel!, 'linha')}
                />
              </div>
            </div>
          )}

          {faturaVisualizar.qrcode && (
            <div className="mb-2 text-center">
              <div className="central-assinante-modal-qr-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(faturaVisualizar.qrcode)}`}
                  alt="QR Code PIX"
                  className="img-fluid central-assinante-modal-qr-img"
                />
              </div>
              <div className="d-flex justify-content-center mt-1">
                <CopiarButton
                  type="button"
                  iconOnly
                  variant="secondary"
                  size="sm"
                  onClick={() => copiarCodigo(faturaVisualizar.qrcode!, 'pix')}
                />
              </div>
            </div>
          )}

          <div className="d-grid gap-2 mt-2">
            <BaixarButton
              variant="secondary"
              size="sm"
              className="w-100"
              onClick={() => handleImprimirFatura(faturaVisualizar.id)}
              disabled={baixandoBoletoId === faturaVisualizar.id}
              isPending={baixandoBoletoId === faturaVisualizar.id}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CentralAssinanteFaturaModal;
