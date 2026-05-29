import type { RpkiCaResource } from 'services/rpkiCaService';

export function formatResourceBlocks(
  resources: RpkiCaResource[],
  resourceType: RpkiCaResource['resource_type']
): string {
  return (
    resources
      .filter((resource) => resource.resource_type === resourceType)
      .map((resource) =>
        resource.end_range ? `${resource.start_range}-${resource.end_range}` : resource.start_range
      )
      .join(', ') || '-'
  );
}
