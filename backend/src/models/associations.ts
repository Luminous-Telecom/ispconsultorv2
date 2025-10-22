import { ModeloContrato } from './ModeloContrato';
import ModeloContratoConteudo from './ModeloContratoConteudo';
import ModeloTermoAdesao from './ModeloTermoAdesao';
import ModeloContratoPermanencia from './ModeloContratoPermanencia';

// Definir associações
ModeloContrato.hasOne(ModeloContratoConteudo, {
  foreignKey: 'modelo_contrato_id',
  as: 'modeloContratoConteudo',
});

ModeloContrato.hasOne(ModeloTermoAdesao, {
  foreignKey: 'modelo_contrato_id',
  as: 'modeloTermoAdesao',
});

ModeloContrato.hasOne(ModeloContratoPermanencia, {
  foreignKey: 'modelo_contrato_id',
  as: 'modeloContratoPermanencia',
});

ModeloContratoConteudo.belongsTo(ModeloContrato, {
  foreignKey: 'modelo_contrato_id',
  as: 'modeloContrato',
});

ModeloTermoAdesao.belongsTo(ModeloContrato, {
  foreignKey: 'modelo_contrato_id',
  as: 'modeloContrato',
});

ModeloContratoPermanencia.belongsTo(ModeloContrato, {
  foreignKey: 'modelo_contrato_id',
  as: 'modeloContrato',
});

export {
  ModeloContrato,
  ModeloContratoConteudo,
  ModeloTermoAdesao,
  ModeloContratoPermanencia,
};
