// B77-70 type-only contract for future read-only Graph UI metadata.
// No projection function, wiring helper, renderer, React component, UI integration,
// source option integration, feature flag change, fetch, route call, adapter integration,
// DB access, mutation, or execution action.

export type RealCompareReadOnlyDisclosureUiMetadata = {
  readonly status: string;
  readonly headline: string;
  readonly description: string;
  readonly reasons: readonly string[];
  readonly isReadOnly: true;
  readonly isActionable: false;
  readonly isExecutionAllowed: false;
};

export type RealCompareReadOnlyBadgeUiMetadata = {
  readonly status: string;
  readonly label: string;
  readonly description: string;
  readonly isReadOnly: true;
};

export type RealCompareReadOnlyInspectorUiMetadata = {
  readonly status: string;
  readonly headline: string;
  readonly description: string;
  readonly reasons: readonly string[];
  readonly totalReasons: number;
  readonly readOnly: true;
};

export type RealCompareReadOnlyUiMetadataBundle = {
  readonly disclosure: RealCompareReadOnlyDisclosureUiMetadata;
  readonly badge: RealCompareReadOnlyBadgeUiMetadata;
  readonly inspector: RealCompareReadOnlyInspectorUiMetadata;
  readonly isReadOnly: true;
  readonly isLiveData: false;
};
