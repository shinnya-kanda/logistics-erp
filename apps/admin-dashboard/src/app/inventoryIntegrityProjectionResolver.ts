import type {
  InventoryIntegrityProjectionRegistry,
  InventoryIntegrityReadOnlySource,
  ProjectionAdapterBoundary,
  ProjectionDefinition,
  ProjectionResolution,
  ProjectionResolutionTarget,
} from "./inventoryIntegrityTypes";

// Pure projection resolver scaffold for Inventory Integrity read-only boundaries.
// Resolver means identity resolution only; it must not orchestrate fetch, execution, mutation, or workflow.

export const defaultInventoryIntegrityProjectionTarget: ProjectionResolutionTarget = {
  projectionKind: "inventory_integrity_projection",
};

function matchesResolutionTarget(
  definition: ProjectionDefinition,
  target: ProjectionResolutionTarget,
): boolean {
  return (
    definition.identity.definitionId === target.definitionId ||
    definition.identity.projectionName === target.projectionName ||
    definition.identity.projectionKind === target.projectionKind
  );
}

export function resolveProjectionDefinition(
  registry: InventoryIntegrityProjectionRegistry,
  target: ProjectionResolutionTarget,
): ProjectionDefinition | undefined {
  return registry.definitions.find((definition) => matchesResolutionTarget(definition, target));
}

export function resolveProjectionSource(
  source: InventoryIntegrityReadOnlySource,
  definition: ProjectionDefinition,
): InventoryIntegrityReadOnlySource | undefined {
  if (source.metadata.sourceId !== definition.source.sourceId) {
    return undefined;
  }

  if (source.metadata.sourceKind !== definition.source.sourceKind) {
    return undefined;
  }

  return source;
}

export function resolveProjectionAdapter(
  definition: ProjectionDefinition,
): ProjectionAdapterBoundary {
  return definition.adapter;
}

export function resolveInventoryIntegrityProjection(
  source: InventoryIntegrityReadOnlySource,
  target: ProjectionResolutionTarget = defaultInventoryIntegrityProjectionTarget,
): ProjectionResolution | undefined {
  const definition = resolveProjectionDefinition(source.registry, target);

  if (!definition) {
    return undefined;
  }

  const resolvedSource = resolveProjectionSource(source, definition);

  if (!resolvedSource) {
    return undefined;
  }

  const adapter = resolveProjectionAdapter(definition);

  return {
    registry: source.registry,
    definition,
    source: resolvedSource,
    adapter,
    semanticBoundary: "reasoning_visualization_only",
    executionBoundary:
      "resolver は projection resolution boundary であり、orchestration、fetch、Supabase 接続、compare execution、rebuild、replay、correction、mutation、workflow は実行しません。",
  };
}
