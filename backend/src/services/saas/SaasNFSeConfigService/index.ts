import { SaasNFSeConfig } from '../../../models/saas/SaasNFSeConfig';
import { createNFSeConfigService } from '../../../utils/createNFSeConfigService';

const service = createNFSeConfigService<SaasNFSeConfig>(SaasNFSeConfig);

export class SaasNFSeConfigService {
  static get = service.get;
  static update = service.update;
}
