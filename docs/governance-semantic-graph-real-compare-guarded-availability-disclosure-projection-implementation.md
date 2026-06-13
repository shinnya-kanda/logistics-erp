# Governance Semantic Graph Real Compare Guarded Availability Disclosure Projection Implementation

Phase B77-62 documentation.

このドキュメントは、B77-60 Guarded Availability Disclosure Design と B77-61 Guarded Availability Disclosure Type Design を前提に、validation disclosure metadata / Inspector metadata から guarded availability display bundle を生成する pure disclosure projection implementation の境界を整理する。

B77-62 では UI wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、fixture payload import、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-62 is pure disclosure projection implementation.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.ts` を追加する。
- input は `RealCompareValidationDisclosureMetadata` と `RealCompareValidationInspectorMetadata` に限定する。
- output は `RealCompareGuardedAvailabilityDisplayBundle` に限定する。
- validation disclosure status を guarded availability badge status に投影する。
- projection reasons を disclosure reason messages に投影する。
- badge / disclosure / Inspector metadata の read-only invariant を維持する。

Out of scope:

- UI integration
- source option integration
- feature flag integration
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- fixture payload import
- real data connection
- production enablement

Implementation files:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.ts
docs/governance-semantic-graph-real-compare-guarded-availability-disclosure-projection-implementation.md
```

Allowed boundary:

- `import type` from validation projection and guarded disclosure type files
- pure file-local helper functions
- exported display bundle projection function
- status label / description mapping
- read-only metadata construction

Not allowed:

- route import
- adapter import
- UI import
- source option import
- feature flag import
- fixture payload import
- fetch
- DB / Supabase access
- mutation
- execution action

## 2. Projection Rules

The projection builds a display bundle from already-projected validation metadata.

Output bundle:

- badge metadata
- disclosure metadata
- Inspector metadata

### Badge Metadata

Badge metadata is compact state display only.

Projection rules:

- `badge.status` is mapped from `disclosureMetadata.projection.disclosureStatus`.
- `badge.label` is a short state name.
- `badge.description` is read-only state explanation.
- `badge.isReadOnly` is always `true`.

Badge metadata does not create source visibility, enablement, action controls, or execution authority.

### Disclosure Metadata

Disclosure metadata carries readable explanatory text.

Projection rules:

- `disclosure.status` equals `badge.status`.
- `disclosure.headline` comes from `disclosureMetadata.projection.headline`.
- `disclosure.description` comes from `disclosureMetadata.projection.description`.
- `disclosure.reasons` is derived from `disclosureMetadata.projection.reasons[].message`.
- `disclosure.isReadOnly` is always `true`.
- `disclosure.isActionable` is always `false`.
- `disclosure.isExecutionAllowed` is always `false`.

Disclosure metadata explains guarded availability only. It does not execute fallback logic.

### Inspector Metadata

Inspector metadata summarizes the display bundle for future Inspector surfaces.

Projection rules:

- `inspector.status` equals `badge.status`.
- `inspector.totalReasons` equals `disclosure.reasons.length`.
- `inspector.readOnly` remains `true`.

Inspector metadata is an observability summary. Reason counts are not task counts or workflow priority.

### Status Mapping

Status mapping:

| Validation disclosure status | Guarded availability badge status |
| --- | --- |
| `passed` | `passed` |
| `warning` | `warning` |
| `blocked` | `blocked` |
| `unavailable` | `unavailable` |
| `not_evaluated` | `guarded` |

Mapping interpretation:

- `passed` remains a read-only candidate state.
- `warning` remains a guarded caution state.
- `blocked` remains a fallback-required state.
- `unavailable` remains a `fallback_unavailable` explanation state.
- `not_evaluated` falls closed to `guarded`.

### Read-only Invariants

Required output invariants:

```text
badge.isReadOnly = true
disclosure.isReadOnly = true
disclosure.isActionable = false
disclosure.isExecutionAllowed = false
inspector.readOnly = true
```

## 3. Read-only Contract

The disclosure projection is observability metadata only.

Read-only contract:

- projection does not fetch.
- projection does not call an API.
- projection does not call a route.
- projection does not connect to DB / Supabase.
- projection does not import adapters.
- projection does not import fixture payloads.
- projection does not render UI.
- projection does not expose source options.
- projection does not change feature flags.
- projection does not mutate inventory data.
- projection does not create execution controls.

Interpretation:

- A display bundle can explain readiness.
- A display bundle cannot authorize source visibility.
- A badge can show guarded state.
- A badge cannot enable `real_compare_readonly`.
- A disclosure can explain unavailable conditions.
- A disclosure cannot retry the source.
- Inspector metadata can summarize reason counts.
- Inspector metadata cannot repair, rebuild, sync, approve, correct, or execute workflows.

## 4. Non-goals

B77-62 does not include:

- No UI integration.
- No source option integration.
- No feature flag change.
- No real compare enablement.
- No fetch.
- No API invocation.
- No DB access.
- No Supabase client.
- No route implementation.
- No route change.
- No adapter integration.
- No fixture payload import.
- No graph adapter fixture import.
- No mutation.
- No correction.
- No rebuild.
- No repair.
- No replay.
- No sync.
- No auto-fix.
- No workflow approval.
- No execution workflow.
- No package install.

変更禁止:

- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphMockData.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityRealCompareValidationProjection.ts`
- `inventoryIntegrityRealCompareValidationProjection.test.ts`
- `inventoryIntegrityRealCompareValidationFixtureMapping.ts`
- `inventoryIntegrityRealCompareValidationFixtureEvaluator.ts`
- `inventoryIntegrityRealCompareValidationFixtureEvaluator.test.ts`
- `api/inventory-integrity/compare-readonly/route.ts`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- Edge Functions
- DB schema
- `services/api`

追加禁止:

- `fetch`
- `createClient`
- mutation implementation
- `POST` implementation
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

## 5. Future Candidate

Candidate future phases:

- Guarded Availability Disclosure Projection Tests
  - Add pure tests for status mapping, labels, reasons, and read-only invariants.
  - Keep tests metadata-only and action-free.
- Guarded Availability Inspector Metadata Tests
  - Verify reason counts and read-only Inspector metadata.
  - Keep counts explanatory, not operational tasks.
- Read-only Disclosure Wiring Design
  - Design where display bundle may appear in Graph UI.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.

Recommended order:

1. Guarded Availability Disclosure Projection Tests.
2. Guarded Availability Inspector Metadata Tests.
3. Read-only Disclosure Wiring Design.
4. Later guarded read-only fetch design only after projection tests and wiring design are accepted.

This document describes a pure disclosure projection implementation. It does not expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
