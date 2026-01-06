import { ModeloDocumento } from '../documentos/ModeloDocumento';
import ModeloContratoConteudo from '../contratos/ModeloContratoConteudo';
import ModeloContratoPermanencia from '../contratos/ModeloContratoPermanencia';

// Definir associações
// Nota: ModeloTermoAdesao foi removido - agora usa campo conteudo_adesao em ModeloDocumento
ModeloDocumento.hasOne(ModeloContratoConteudo, {
  foreignKey: 'modelo_documento_id',
  as: 'modeloContratoConteudo',
});

ModeloDocumento.hasOne(ModeloContratoPermanencia, {
  foreignKey: 'modelo_documento_id',
  as: 'modeloContratoPermanencia',
});

ModeloContratoConteudo.belongsTo(ModeloDocumento, {
  foreignKey: 'modelo_documento_id',
  as: 'modeloDocumento',
});

ModeloContratoPermanencia.belongsTo(ModeloDocumento, {
  foreignKey: 'modelo_documento_id',
  as: 'modeloDocumento',
});

export {
  ModeloDocumento,
  ModeloContratoConteudo,
  ModeloContratoPermanencia,
};
