import { RpkiRoa } from './RpkiRoa';
import { RpkiValidationLog } from './RpkiValidationLog';
import { RpkiAlert } from './RpkiAlert';
import { RpkiSyncSession } from './RpkiSyncSession';
import { RpkiCa } from './RpkiCa';
import { RpkiCaParent } from './RpkiCaParent';
import { RpkiRepository } from './RpkiRepository';
import { RpkiCaResource } from './RpkiCaResource';
import { RpkiAspa } from './RpkiAspa';
import { RpkiPublishedObject } from './RpkiPublishedObject';

RpkiRoa.hasMany(RpkiValidationLog, {
  foreignKey: 'matched_roa_id',
  as: 'validation_logs',
});

RpkiValidationLog.belongsTo(RpkiRoa, {
  foreignKey: 'matched_roa_id',
  as: 'matched_roa',
});

RpkiRoa.hasMany(RpkiAlert, {
  foreignKey: 'roa_id',
  as: 'alerts',
});

RpkiAlert.belongsTo(RpkiRoa, {
  foreignKey: 'roa_id',
  as: 'roa',
});

RpkiCa.hasMany(RpkiCaParent, {
  foreignKey: 'ca_id',
  as: 'parents',
});

RpkiCaParent.belongsTo(RpkiCa, {
  foreignKey: 'ca_id',
  as: 'ca',
});

RpkiCa.hasMany(RpkiRepository, {
  foreignKey: 'ca_id',
  as: 'repositories',
});

RpkiRepository.belongsTo(RpkiCa, {
  foreignKey: 'ca_id',
  as: 'ca',
});

RpkiCa.hasMany(RpkiCaResource, {
  foreignKey: 'ca_id',
  as: 'resources',
});

RpkiCaResource.belongsTo(RpkiCa, {
  foreignKey: 'ca_id',
  as: 'ca',
});

RpkiCa.hasMany(RpkiRoa, {
  foreignKey: 'ca_id',
  as: 'roas',
});

RpkiRoa.belongsTo(RpkiCa, {
  foreignKey: 'ca_id',
  as: 'ca',
});

RpkiCa.hasMany(RpkiAspa, {
  foreignKey: 'ca_id',
  as: 'aspas',
});

RpkiAspa.belongsTo(RpkiCa, {
  foreignKey: 'ca_id',
  as: 'ca',
});

RpkiCa.hasMany(RpkiPublishedObject, {
  foreignKey: 'ca_id',
  as: 'published_objects',
});

RpkiPublishedObject.belongsTo(RpkiCa, {
  foreignKey: 'ca_id',
  as: 'ca',
});

RpkiRepository.hasMany(RpkiPublishedObject, {
  foreignKey: 'repository_id',
  as: 'published_objects',
});

RpkiPublishedObject.belongsTo(RpkiRepository, {
  foreignKey: 'repository_id',
  as: 'repository',
});

export {
  RpkiRoa,
  RpkiValidationLog,
  RpkiAlert,
  RpkiSyncSession,
  RpkiCa,
  RpkiCaParent,
  RpkiRepository,
  RpkiCaResource,
  RpkiAspa,
  RpkiPublishedObject,
};

