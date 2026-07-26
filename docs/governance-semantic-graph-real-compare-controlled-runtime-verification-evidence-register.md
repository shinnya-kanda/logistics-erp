# Governance Semantic Graph Real Compare Controlled Runtime Verification Evidence Register

Phase B85-03 documentation.

このドキュメントは、B85-02 Controlled Runtime Verification Observation Workbook を前提に、Observation Workbook から参照されるすべての Evidence を一元管理する Evidence Register を design-only で定義する。

B85-03 は Controlled Runtime Verification Evidence Register only である。runtime connection、runtime verification execution、runtime enablement execution、runtime spike execution、implementation change、test addition、route change、fetch adapter change、validation change、graph adapter change、projection change、presentation change、UI change、feature flag change、source option change、`real_compare_readonly` enablement、API execution、DB / Supabase access、adapter integration、mutation、logging implementation、telemetry implementation、production rollout、feature flag switching は行わない。

この Evidence Register は Evidence 管理台帳であり、Runtime Verification 実施や Runtime Enablement を意味しない。Evidence が登録、分類、検証、または承認されたとしても、それは証跡管理上の記録であり、Runtime Verification 完了、Runtime Enablement 承認、または Production Release 承認ではない。

## 1. Scope

B85-03 is Controlled Runtime Verification Evidence Register only.

Scope:

- Evidence 管理台帳を整理する。
- Observation Workbook から参照される Evidence の識別、分類、所有、保管参照、関連、検証、ライフサイクル、集計を整理する。
- Verification Review に向けた Evidence Traceability を design-only で整理する。
- Evidence Register から Traceability Matrix へ進むための台帳形式を固定する。
- B85-04 Controlled Runtime Verification Traceability Matrix へ進む前に、evidence register の設計境界を固定する。

Scope constraints:

- Controlled Runtime Verification Evidence Register only.
- Evidence 管理台帳 only.
- Runtime execution is out of scope.
- Runtime enablement is out of scope.
- Production rollout is out of scope.

Out of scope:

- implementation
- tests追加
- runtime execution
- runtime verification execution
- runtime spike execution
- runtime enablement execution
- adapter integration
- UI wiring
- feature flag enablement
- production rollout
- mutation
- logging implementation
- telemetry implementation
- DB / Supabase connection
- API execution

Scope interpretation:

- Evidence Register means a future register template for identifying, managing, and tracing evidence.
- Evidence Register does not collect evidence in B85-03.
- Evidence Register does not implement evidence storage, logging, telemetry, or database persistence.
- Evidence Register does not connect route, transport, validation, graph, presentation, or UI behavior.
- Evidence Register does not authorize Runtime Enablement.

## 2. Register Objective

Register objectives:

- evidence consistency
- evidence identification
- evidence traceability
- evidence integrity
- governance transparency
- audit readiness

### evidence consistency

Objective:

- Keep evidence records comparable across Repository, Build, Test, Route, Fetch Adapter, Validation, Graph Adapter, Presentation, UI, Safety, and Governance.
- Preserve common fields for ID, name, type, source, status, owner, storage reference, relationship, validation, and lifecycle.

Expected posture:

- Evidence consistency is a register structure property.
- Evidence consistency does not mean evidence has been collected or verified at runtime.

### evidence identification

Objective:

- Provide stable Evidence ID and Evidence Name placeholders.
- Prevent ambiguous evidence references from entering Observation Workbook, Review Workbook, or Governance materials.

Expected posture:

- Identification is metadata only.
- B85-03 does not generate evidence IDs through automation or persistent storage.

### evidence traceability

Objective:

- Trace Baseline to Observation, Observation to Finding, Finding to Review, and Review to Governance Approval.
- Preserve parent-child relationships and traceability method fields.

Expected posture:

- Traceability is document-level structure.
- Traceability does not create audit log implementation, workflow automation, or runtime collection.

### evidence integrity

Objective:

- Preserve evidence completeness, ownership, validation status, and lifecycle state.
- Keep rejected, pending, partial, archived, or missing evidence visible.

Expected posture:

- Integrity is review metadata.
- B85-03 does not implement integrity checks, storage controls, or immutable records.

### governance transparency

Objective:

- Make evidence owner, reviewer, custodian, approval requirement, and validation status visible.
- Keep governance evidence separate from runtime execution or enablement authority.

Expected posture:

- Governance transparency is approval clarity.
- Evidence ownership does not transfer feature flag, source option, DB, UI, adapter, or mutation authority.

### audit readiness

Objective:

- Make future evidence records understandable for audit-style follow-up.
- Preserve which evidence existed, where it was referenced, who owned it, who reviewed it, and what validation state it had.

Expected posture:

- Audit readiness is documentation readiness.
- It is not audit log, logging, telemetry, persistent storage, or production rollout.

Evidence Register is a management ledger for Evidence. It does not mean Runtime Verification was performed or Runtime Enablement is approved.

## 3. Register Structure

Register sections:

- Register Header
- Evidence Inventory
- Evidence Classification
- Evidence Ownership
- Evidence Storage
- Evidence Relationships
- Evidence Validation
- Evidence Lifecycle
- Register Summary

| Section | Purpose | Inputs | Outputs | Owner | Completion Condition |
| --- | --- | --- | --- | --- | --- |
| Register Header | Identify the register and accountable placeholders | B85-02 Observation Workbook, repository candidate, branch candidate, commit SHA candidate, maintainer and reviewer placeholders | Register header record | Register Maintainer | Register ID, version, repository, branch, SHA, date, maintainer, and reviewer placeholders are filled |
| Evidence Inventory | List all evidence categories and statuses | Observation Workbook Evidence Mapping, B85-01 Evidence Baseline, B84 evidence references | Evidence inventory table | Evidence Maintainer | Repository through Governance evidence has ID, name, type, source, and status |
| Evidence Classification | Define evidence classes and usage | B82 evidence model, B83 verification plan, B85 observation workbook | Evidence classification table | Evidence Maintainer with Governance Reviewer | Each classification has description, usage, required flag, and retention |
| Evidence Ownership | Record owner, reviewer, custodian, and approval requirement | Evidence Inventory, role assignments, governance ownership | Evidence ownership table | Governance Reviewer | Each evidence category has owner, reviewer, custodian, and approval requirement |
| Evidence Storage | Record storage reference metadata | Evidence Inventory, evidence mapping, retention requirements | Evidence storage table | Evidence Custodian | Each evidence category has storage location, reference, access level, and retention period |
| Evidence Relationships | Trace parent-child evidence relationships | Baseline, Observation, Finding, Review, Governance Approval references | Evidence relationship table | Traceability Owner | Each relationship has parent, child, and traceability method |
| Evidence Validation | Record validation state and method | Evidence Inventory, reviewer notes, observation findings | Evidence validation table | Evidence Reviewer | Each evidence category has validation status, method, reviewer, and validation date placeholder |
| Evidence Lifecycle | Define lifecycle states and transition criteria | Evidence model, register policy, governance review needs | Evidence lifecycle table | Evidence Maintainer | Created, Collected, Reviewed, Approved, and Archived have entry criteria, exit criteria, and owner |
| Register Summary | Summarize register completeness and issues | Inventory, classification, ownership, storage, relationships, validation, lifecycle | Register summary | Register Maintainer with Governance Reviewer | Total evidence, verified evidence, pending evidence, outstanding issues, and recommendations are recorded |

Structure interpretation:

- Each section is a register record area, not a runtime procedure.
- Completion of a section does not authorize Runtime Verification execution, Runtime Enablement, or Production Release.
- Missing, rejected, unowned, inaccessible, or unvalidated evidence must remain visible.

## 4. Register Header

Use placeholders only. Do not record real names in this design document.

| Field | Placeholder |
| --- | --- |
| Register ID | `[evidence-register-id-placeholder]` |
| Register Version | `[register-version-placeholder]` |
| Repository | `[repository-placeholder]` |
| Branch | `[branch-placeholder]` |
| Commit SHA | `[commit-sha-placeholder]` |
| Date | `[YYYY-MM-DD]` |
| Maintainer | `[evidence-register-maintainer-placeholder]` |
| Reviewer | `[evidence-register-reviewer-placeholder]` |

Header rules:

- Register ID identifies this evidence register template instance.
- Register Version identifies the fixed register revision for later comparison.
- Branch and Commit SHA are repository evidence references, not execution approval by themselves.
- Maintainer owns register completeness only.
- Reviewer evaluates register completeness and traceability only.

## 5. Evidence Inventory

Evidence Inventory lists the evidence categories referenced by the Observation Workbook and later review materials.

| Evidence | Evidence ID | Evidence Name | Evidence Type | Source | Status |
| --- | --- | --- | --- | --- | --- |
| Repository | `repo-evidence-[id]` | `[repository-evidence-name-placeholder]` | `[Source Evidence / Review Evidence]` | `[baseline / observation-workbook / repository-review]` | `[pending / available / verified / rejected / archived]` |
| Build | `build-evidence-[id]` | `[build-evidence-name-placeholder]` | `[Build Evidence]` | `[baseline / observation-workbook / build-review]` | `[pending / available / verified / rejected / archived]` |
| Test | `test-evidence-[id]` | `[test-evidence-name-or-not-scoped-placeholder]` | `[Build Evidence / Review Evidence]` | `[baseline / observation-workbook / not-scoped-note]` | `[pending / available / verified / rejected / archived / not-scoped]` |
| Route | `route-evidence-[id]` | `[route-evidence-name-placeholder]` | `[Verification Evidence / Observation Evidence]` | `[observation-workbook / verification-plan]` | `[pending / available / verified / rejected / archived]` |
| Fetch Adapter | `fetch-adapter-evidence-[id]` | `[fetch-adapter-evidence-name-placeholder]` | `[Verification Evidence / Observation Evidence]` | `[observation-workbook / verification-plan]` | `[pending / available / verified / rejected / archived]` |
| Validation | `validation-evidence-[id]` | `[validation-evidence-name-placeholder]` | `[Verification Evidence / Observation Evidence]` | `[observation-workbook / verification-plan]` | `[pending / available / verified / rejected / archived]` |
| Graph Adapter | `graph-adapter-evidence-[id]` | `[graph-adapter-evidence-name-placeholder]` | `[Verification Evidence / Observation Evidence]` | `[observation-workbook / verification-plan]` | `[pending / available / verified / rejected / archived]` |
| Presentation | `presentation-evidence-[id]` | `[presentation-evidence-name-placeholder]` | `[Verification Evidence / Observation Evidence]` | `[observation-workbook / verification-plan]` | `[pending / available / verified / rejected / archived]` |
| UI | `ui-evidence-[id]` | `[ui-evidence-name-placeholder]` | `[Verification Evidence / Observation Evidence]` | `[observation-workbook / verification-plan]` | `[pending / available / verified / rejected / archived]` |
| Safety | `safety-evidence-[id]` | `[safety-evidence-name-placeholder]` | `[Governance Evidence / Review Evidence]` | `[baseline / observation-workbook / governance-review]` | `[pending / available / verified / rejected / archived]` |
| Governance | `governance-evidence-[id]` | `[governance-evidence-name-placeholder]` | `[Governance Evidence / Review Evidence]` | `[approval-package / governance-review-package]` | `[pending / available / verified / rejected / archived]` |

Evidence inventory rules:

- Evidence ID must be stable within the register.
- Status must remain pending or rejected when evidence is not reviewable.
- Safety and Governance evidence cannot be silently downgraded to optional.
- Inventory records do not collect or create evidence.

## 6. Evidence Classification

Evidence Classification defines evidence classes used by the register.

| Classification | Description | Usage | Required | Retention |
| --- | --- | --- | --- | --- |
| Source Evidence | Evidence identifying repository, branch, commit, source option posture, and baseline references | Supports baseline and source traceability | `[yes / conditional / no]` | `[retention-period-placeholder]` |
| Build Evidence | Evidence identifying build and scoped test readiness | Supports technical readiness review | `[yes / conditional / no]` | `[retention-period-placeholder]` |
| Verification Evidence | Evidence tied to verification targets and layer-specific expectations | Supports later verification review | `[yes / conditional / no]` | `[retention-period-placeholder]` |
| Observation Evidence | Evidence referenced by Observation Workbook records | Supports Observation to Finding traceability | `[yes / conditional / no]` | `[retention-period-placeholder]` |
| Review Evidence | Evidence reviewed by Technical, Architecture, and Governance Reviewers | Supports review decision transparency | `[yes / conditional / no]` | `[retention-period-placeholder]` |
| Governance Evidence | Evidence supporting governance approval, safety posture, and non-enablement interpretation | Supports governance decision traceability | `[yes / conditional / no]` | `[retention-period-placeholder]` |

Classification rules:

- Required evidence must not be omitted from Register Summary.
- Conditional evidence must preserve condition reason and owner.
- Retention is a policy placeholder and does not implement storage retention.
- Classification does not grant runtime authority.

## 7. Evidence Ownership

Evidence Ownership records accountability for evidence records.

| Evidence | Evidence Owner | Reviewer | Custodian | Approval Required |
| --- | --- | --- | --- | --- |
| Repository | `[repository-evidence-owner-placeholder]` | `[technical-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Build | `[build-evidence-owner-placeholder]` | `[technical-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Test | `[test-evidence-owner-placeholder]` | `[technical-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional / not-scoped]` |
| Route | `[route-evidence-owner-placeholder]` | `[route-boundary-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Fetch Adapter | `[fetch-adapter-evidence-owner-placeholder]` | `[fetch-boundary-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Validation | `[validation-evidence-owner-placeholder]` | `[validation-layer-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Graph Adapter | `[graph-adapter-evidence-owner-placeholder]` | `[graph-boundary-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Presentation | `[presentation-evidence-owner-placeholder]` | `[presentation-boundary-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| UI | `[ui-evidence-owner-placeholder]` | `[ui-boundary-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes / no / conditional]` |
| Safety | `[safety-evidence-owner-placeholder]` | `[governance-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes]` |
| Governance | `[governance-evidence-owner-placeholder]` | `[governance-reviewer-placeholder]` | `[evidence-custodian-placeholder]` | `[yes]` |

Ownership rules:

- Evidence Owner owns record completeness only.
- Reviewer owns review judgment only.
- Custodian owns evidence reference maintenance only.
- Approval Required does not implement approval workflow.
- No owner receives runtime operation, feature flag, source option, DB, adapter, UI, or mutation authority.

## 8. Evidence Storage

Evidence Storage records where evidence is referenced. B85-03 does not implement storage.

| Evidence | Storage Location | Reference | Access Level | Retention Period |
| --- | --- | --- | --- | --- |
| Repository | `[repository-storage-location-placeholder]` | `[repository-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Build | `[build-storage-location-placeholder]` | `[build-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Test | `[test-storage-location-placeholder]` | `[test-reference-placeholder]` | `[restricted / internal / review-only / unavailable / not-scoped]` | `[retention-period-placeholder]` |
| Route | `[route-storage-location-placeholder]` | `[route-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Fetch Adapter | `[fetch-adapter-storage-location-placeholder]` | `[fetch-adapter-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Validation | `[validation-storage-location-placeholder]` | `[validation-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Graph Adapter | `[graph-adapter-storage-location-placeholder]` | `[graph-adapter-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Presentation | `[presentation-storage-location-placeholder]` | `[presentation-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| UI | `[ui-storage-location-placeholder]` | `[ui-reference-placeholder]` | `[restricted / internal / review-only / unavailable]` | `[retention-period-placeholder]` |
| Safety | `[safety-storage-location-placeholder]` | `[safety-reference-placeholder]` | `[restricted / review-only]` | `[retention-period-placeholder]` |
| Governance | `[governance-storage-location-placeholder]` | `[governance-reference-placeholder]` | `[restricted / review-only]` | `[retention-period-placeholder]` |

Storage rules:

- Storage Location is a reference placeholder only.
- Access Level is review metadata and does not implement access control.
- Retention Period is a policy placeholder and does not implement retention behavior.
- Unavailable storage must remain visible in Register Summary.

## 9. Evidence Relationships

Evidence Relationships define traceability between evidence records and review artifacts.

| Relationship | Parent | Child | Traceability Method |
| --- | --- | --- | --- |
| Baseline to Observation | `[baseline-evidence-reference-placeholder]` | `[observation-evidence-reference-placeholder]` | `[baseline-id / observation-id / evidence-id mapping]` |
| Observation to Finding | `[observation-evidence-reference-placeholder]` | `[finding-evidence-reference-placeholder]` | `[observation-reference / finding-id / evidence-id mapping]` |
| Finding to Review | `[finding-evidence-reference-placeholder]` | `[review-evidence-reference-placeholder]` | `[finding-id / reviewer-note / review-status mapping]` |
| Review to Governance Approval | `[review-evidence-reference-placeholder]` | `[governance-approval-evidence-reference-placeholder]` | `[review-id / governance-decision / approval-id mapping]` |
| Safety to Governance Approval | `[safety-evidence-reference-placeholder]` | `[governance-approval-evidence-reference-placeholder]` | `[safety-evidence-id / governance-review / approval-id mapping]` |
| Evidence Register to Traceability Matrix | `[evidence-register-reference-placeholder]` | `[traceability-matrix-reference-placeholder]` | `[register-id / matrix-row-id / evidence-id mapping]` |

Relationship rules:

- Parent and Child references must preserve direction.
- Missing parent evidence makes child traceability incomplete.
- Relationship mapping is metadata only and does not implement graph storage.
- Relationships do not authorize runtime execution or feature flag changes.

## 10. Evidence Validation

Evidence Validation records review status for evidence records. B85-03 does not validate runtime behavior.

Validation Status candidates:

- Pending
- Verified
- Rejected
- Archived

| Evidence | Validation Status | Validation Method | Reviewer | Validation Date |
| --- | --- | --- | --- | --- |
| Repository | `[Pending / Verified / Rejected / Archived]` | `[repository-validation-method-placeholder]` | `[technical-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Build | `[Pending / Verified / Rejected / Archived]` | `[build-validation-method-placeholder]` | `[technical-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Test | `[Pending / Verified / Rejected / Archived / not-scoped]` | `[test-validation-method-placeholder]` | `[technical-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Route | `[Pending / Verified / Rejected / Archived]` | `[route-validation-method-placeholder]` | `[route-boundary-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Fetch Adapter | `[Pending / Verified / Rejected / Archived]` | `[fetch-adapter-validation-method-placeholder]` | `[fetch-boundary-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Validation | `[Pending / Verified / Rejected / Archived]` | `[validation-validation-method-placeholder]` | `[validation-layer-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Graph Adapter | `[Pending / Verified / Rejected / Archived]` | `[graph-adapter-validation-method-placeholder]` | `[graph-boundary-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Presentation | `[Pending / Verified / Rejected / Archived]` | `[presentation-validation-method-placeholder]` | `[presentation-boundary-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| UI | `[Pending / Verified / Rejected / Archived]` | `[ui-validation-method-placeholder]` | `[ui-boundary-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Safety | `[Pending / Verified / Rejected / Archived]` | `[safety-validation-method-placeholder]` | `[governance-reviewer-placeholder]` | `[YYYY-MM-DD]` |
| Governance | `[Pending / Verified / Rejected / Archived]` | `[governance-validation-method-placeholder]` | `[governance-reviewer-placeholder]` | `[YYYY-MM-DD]` |

Validation rules:

- Pending evidence cannot be treated as Verified.
- Rejected evidence must remain visible and must be carried to review issues.
- Archived evidence must preserve reference and reason.
- Validation Method is a reviewer method placeholder and does not execute runtime verification.

## 11. Evidence Lifecycle

Evidence Lifecycle defines the review states for evidence records.

| Lifecycle State | Entry Criteria | Exit Criteria | Responsible Owner |
| --- | --- | --- | --- |
| Created | Evidence ID and name are assigned in the register | Source, owner, and classification are recorded | `[evidence-maintainer-placeholder]` |
| Collected | Evidence source and reference placeholders are available | Reviewer can evaluate completeness and relevance | `[evidence-owner-placeholder]` |
| Reviewed | Reviewer has assessed evidence status and traceability | Evidence is verified, rejected, or requires follow-up | `[evidence-reviewer-placeholder]` |
| Approved | Evidence is accepted for the recorded review scope | Evidence is included in downstream traceability or archived | `[approval-owner-placeholder]` |
| Archived | Evidence is no longer active but must remain traceable | Retention policy confirms archival reference | `[evidence-custodian-placeholder]` |

Lifecycle rules:

- Created does not mean collected.
- Collected does not mean verified.
- Reviewed does not mean approved.
- Approved does not mean Runtime Enablement.
- Archived does not remove traceability requirements.

## 12. Register Summary

| Field | Record Placeholder |
| --- | --- |
| Total Evidence | `[total-evidence-count-placeholder]` |
| Verified Evidence | `[verified-evidence-count-placeholder]` |
| Pending Evidence | `[pending-evidence-count-placeholder]` |
| Outstanding Issues | `[outstanding-issues-placeholder]` |
| Recommendations | `[register-recommendations-placeholder]` |

Register summary rules:

- Total Evidence must include every evidence category in the inventory.
- Verified Evidence must not include pending, rejected, archived, or not-scoped evidence.
- Pending Evidence must remain visible and cannot be silently excluded.
- Outstanding Issues must preserve owner, severity, and affected relationship.
- Recommendations are review guidance only and do not authorize implementation or runtime execution.

## 13. Register Completion Criteria

B85-03 is complete when:

- register header completed
- evidence inventory completed
- evidence classification completed
- evidence ownership completed
- evidence storage completed
- evidence relationships completed
- evidence validation completed
- evidence lifecycle completed
- register summary completed

Completion interpretation:

- Completion means evidence register template design is complete.
- Completion does not mean Runtime Verification has started.
- Completion does not mean evidence has been collected.
- Completion does not mean Runtime Enablement is ready.

## 14. Recommended Next Phase

Recommended next phase:

```text
B85-04 Controlled Runtime Verification Traceability Matrix
```

Purpose:

- Evidence と Observation の対応整理
- Layer 間トレーサビリティ
- Governance 追跡性の可視化

Recommended B85-04 posture:

- Traceability matrix design only.
- Runtime Verification is still not executed.
- No implementation.
- No tests追加.
- No adapter integration.
- No UI wiring.
- No feature flag enablement.
- No production rollout.
- No mutation.
- No logging implementation.
- No telemetry implementation.

## 15. Non-goals

Non-goals:

- implementation
- tests追加
- runtime execution
- runtime verification execution
- adapter integration
- UI wiring
- feature flag enablement
- production rollout
- mutation
- logging implementation
- telemetry implementation
- DB / Supabase connection
- API execution

Additional non-goals:

- No runtime connection.
- No runtime spike execution.
- No runtime enablement execution.
- No route change.
- No fetch adapter change.
- No validation change.
- No graph adapter change.
- No projection change.
- No presentation change.
- No source option change.
- No UI change.
- No `real_compare_readonly` behavior change.
- No production operation.
- No feature flag switching.
