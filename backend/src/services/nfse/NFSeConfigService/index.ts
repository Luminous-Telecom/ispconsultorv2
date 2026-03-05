import { NFSeConfig } from '../../../models/nfse/NFSeConfig';
import { createNFSeConfigService } from '../../../utils/createNFSeConfigService';

const service = createNFSeConfigService<NFSeConfig>(NFSeConfig);

export class NFSeConfigService {
  static getConfig = service.getConfig;
  static get = service.get;
  static update = service.update;
}
