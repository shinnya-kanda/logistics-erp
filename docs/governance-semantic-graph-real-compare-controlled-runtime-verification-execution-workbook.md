# Governance Semantic Graph Real Compare Controlled Runtime Verification Execution Workbook

Phase B84-03 documentation.

このドキュメントは、B84-02 Controlled Runtime Preflight Checklist を前提に、Controlled Runtime Verification を将来実施する場合の記録テンプレートを Verification Execution Workbook として design-only で整理する。

B84-03 は Controlled Runtime Verification Execution Workbook only である。runtime connection、runtime verification execution、runtime enablement execution、runtime spike execution、implementation change、test addition、route change、fetch adapter change、validation change、graph adapter change、projection change、presentation change、UI change、feature flag change、source option change、`real_compare_readonly` enablement、API execution、DB / Supabase access、adapter integration、mutation、logging implementation、telemetry implementation、production rollout、feature flag switching は行わない。

この Workbook は「Verification の実施内容を記録するテンプレート」であり、Verification 実施そのものではない。

## 1. Scope

B84-03 is Controlled Runtime Verification Execution Workbook only.

Scope:

- Verification 実施記録テンプレートを整理する。
- Preflight Checklist の確認項目を、Execution Workbook の記録欄へ変換する。
- Evidence Recording、Review、Decision に必要な記録欄を整理する。
- Route、Fetch Adapter、Validation、Graph Adapter、Presentation、UI の layer 別 verification record template を整理する。
- Stop Record、Recovery Record、Final Review、Decision Summary を記録欄として整理する。
- B84-04 Controlled Runtime Verification Review Workbook へ進む前に、execution workbook の設計境界を固定する。

Scope constraints:

- Controlled Runtime Verification Execution Workbook only.
- Verification 実施記録テンプレート only.
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

- Workbook means a recording template for a later explicitly approved verification phase.
- Workbook does not run verification.
- Workbook does not define runtime commands.
- Workbook does not connect route, transport, validation, graph, presentation, or UI behavior.
- Workbook does not authorize Runtime Enablement.

## 2. Workbook Objective

Workbook objectives:

- execution record consistency
- evidence traceability
- reviewer consistency
- decision consistency
- stop documentation
- audit readiness

### execution record consistency

Objective:

- Keep each later verification record comparable across layers.
- Preserve shared fields for scope, target, observation, expected result, actual result, evidence, reviewer, and decision.

Expected posture:

- Consistency is a template property.
- Consistency does not mean verification has started or passed.

### evidence traceability

Objective:

- Link each verification observation to evidence records and review results.
- Preserve evidence ID, source, recorder, reviewer, status, and storage location placeholders.

Expected posture:

- Traceability is document-level structure.
- B84-03 does not collect runtime evidence, implement storage, or add telemetry.

### reviewer consistency

Objective:

- Provide common comment fields for Technical Reviewer, Architecture Reviewer, and Governance Reviewer.
- Keep reviewer recommendation separate from Final Decision Owner decision.

Expected posture:

- Reviewer comments are review inputs.
- Reviewer comments do not change feature flags, source options, route, adapters, validation, projection, presentation, or UI.

### decision consistency

Objective:

- Classify verification outcome as Pass, Conditional Pass, Rework Required, or Stop.
- Preserve the distinction between verification completion and runtime enablement.

Expected posture:

- Pass means Verification completed for the recorded scope only.
- Pass does not mean Runtime Enablement.

### stop documentation

Objective:

- Provide fields for Immediate Stop and Controlled Stop records.
- Keep stop triggers, severity, detection time, Stop Authority, action taken, recovery requirement, and resume decision visible.

Expected posture:

- Stop documentation is a record template.
- Stop documentation does not implement stop automation or recovery workflow.

### audit readiness

Objective:

- Make future workbook records reviewable for audit-style traceability.
- Preserve who recorded, who reviewed, what evidence was referenced, what decision was made, and what caveats remained.

Expected posture:

- Audit readiness is documentation readiness.
- It is not audit log, logging, telemetry, persistent storage, or production rollout.

## 3. Workbook Structure

Workbook sections:

- Workbook Header
- Execution Information
- Verification Records
- Evidence Records
- Reviewer Comments
- Stop Records
- Recovery Records
- Final Review
- Decision Summary

| Section | Purpose | Inputs | Outputs | Owner | Completion Condition |
| --- | --- | --- | --- | --- | --- |
| Workbook Header | Identify the workbook and accountable placeholders | Preflight Checklist, branch candidate, commit SHA candidate, role placeholders | Header record | Execution Coordinator | Workbook ID, verification ID, version, repository, branch, SHA, and role placeholders are filled |
| Execution Information | Record scope and execution status for later verification | Final Preflight decision, scope, target, environment classification | Execution information record | Technical Operator with Execution Coordinator | Scope, target, environment, preconditions, time fields, and status are recorded |
| Verification Records | Record layer-by-layer verification observations | Layer verification readiness checklist, verification plan, observation matrix | Route through UI verification records | Technical Operator with Technical Reviewer | Every target layer has observation, result, evidence reference, reviewer, and review result |
| Evidence Records | Record evidence inventory and traceability | Evidence checklist, evidence model, review package design | Evidence table | Evidence Recorder | Required evidence items have ID, source, recorder, reviewer, status, and storage location placeholders |
| Reviewer Comments | Record reviewer findings and recommendation | Verification records, evidence records, risks, stop records | Reviewer comment records | Technical Reviewer, Architecture Reviewer, Governance Reviewer | Each reviewer has summary, findings, risks, recommendation, and sign-off placeholder |
| Stop Records | Record Immediate Stop and Controlled Stop events | Stop readiness checklist, stop conditions, detection record | Stop record table | Stop Authority | Every stop event has trigger, severity, detection time, authority, action taken, recovery requirement, and resume decision |
| Recovery Records | Record recovery review evidence after a stop | Stop records, recovery prerequisite, safety state evidence | Recovery record table | Stop Authority with Governance Reviewer | Recovery ID, trigger, recovery action record, verification after recovery, reviewer, and result are recorded |
| Final Review | Record overall workbook review | Verification records, evidence records, reviewer comments, stop/recovery records | Final review record | Final Decision Owner | Summary, outstanding issues, evidence completeness, reviewer agreement, and final recommendation are recorded |
| Decision Summary | Record final verification decision | Final review, evidence references, reviewer recommendations | Decision summary | Final Decision Owner | Pass, Conditional Pass, Rework Required, or Stop is recorded with owner, evidence reference, and next action |

Structure interpretation:

- Each section is a record area, not a runtime procedure.
- Completion of a section does not authorize downstream runtime enablement.
- Missing evidence remains visible and cannot be silently treated as pass.

## 4. Workbook Header

Use placeholders only. Do not record real names in this design document.

| Field | Placeholder |
| --- | --- |
| Workbook ID | `[workbook-id-placeholder]` |
| Verification ID | `[verification-id-placeholder]` |
| Version | `[version-placeholder]` |
| Date | `[YYYY-MM-DD]` |
| Repository | `[repository-placeholder]` |
| Branch | `[branch-placeholder]` |
| Commit SHA | `[commit-sha-placeholder]` |
| Operator | `[technical-operator-placeholder]` |
| Reviewer | `[primary-reviewer-placeholder]` |
| Stop Authority | `[stop-authority-placeholder]` |
| Final Decision Owner | `[final-decision-owner-placeholder]` |

Header rules:

- Workbook ID identifies this record template instance.
- Verification ID identifies the later verification event candidate.
- Branch and Commit SHA are repository evidence references, not execution approval by themselves.
- Operator, Reviewer, Stop Authority, and Final Decision Owner placeholders preserve accountability without recording real names.

## 5. Execution Information

| Field | Placeholder / Candidate Values |
| --- | --- |
| Verification Scope | `[controlled-runtime-verification-scope-placeholder]` |
| Verification Target | `[route / fetch-adapter / validation / graph-adapter / presentation / ui / full-layer-sequence]` |
| Environment Classification | `[non-production / controlled-review / unavailable / not-classified]` |
| Preconditions Confirmed | `[yes / no / partial / not-reviewed]` |
| Start Time | `[start-time-placeholder]` |
| End Time | `[end-time-placeholder]` |
| Execution Status | `[Not Started / In Progress / Completed / Stopped / Cancelled]` |

Execution Status candidates:

- Not Started
- In Progress
- Completed
- Stopped
- Cancelled

Execution information rules:

- `Not Started` is the default workbook design posture.
- `In Progress`, `Completed`, `Stopped`, and `Cancelled` are future record values only.
- B84-03 does not set an actual start time or end time.
- Environment Classification is a review field and does not perform environment access.

## 6. Verification Records

Layer verification records are templates for later evidence recording. B84-03 does not execute any layer.

### Route

| Field | Record Placeholder |
| --- | --- |
| Verification Target | GET-only contract, response shape, error shape, auth boundary, mutation absence, source ownership boundary |
| Observation | `[route-observation-placeholder]` |
| Expected Result | Route remains read-only contract source and validation input candidate only |
| Actual Result | `[route-actual-result-placeholder]` |
| Pass / Fail / Inconclusive | `[pass / fail / inconclusive]` |
| Evidence Reference | `[route-evidence-id-placeholder]` |
| Reviewer | `[route-boundary-reviewer-placeholder]` |
| Review Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

### Fetch Adapter

| Field | Record Placeholder |
| --- | --- |
| Verification Target | Transport-only boundary, HTTP/error boundary, raw response preservation, validation non-ownership, UI non-ownership |
| Observation | `[fetch-adapter-observation-placeholder]` |
| Expected Result | Fetch Adapter remains transport-only and preserves read-only payload semantics |
| Actual Result | `[fetch-adapter-actual-result-placeholder]` |
| Pass / Fail / Inconclusive | `[pass / fail / inconclusive]` |
| Evidence Reference | `[adapter-evidence-id-placeholder]` |
| Reviewer | `[fetch-boundary-reviewer-placeholder]` |
| Review Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

### Validation

| Field | Record Placeholder |
| --- | --- |
| Verification Target | Input classification, success/failure, missing/invalid handling, side-effect absence, adapter responsibility separation |
| Observation | `[validation-observation-placeholder]` |
| Expected Result | Unsafe or ambiguous input remains fail-closed before graph normalization |
| Actual Result | `[validation-actual-result-placeholder]` |
| Pass / Fail / Inconclusive | `[pass / fail / inconclusive]` |
| Evidence Reference | `[validation-evidence-id-placeholder]` |
| Reviewer | `[validation-layer-reviewer-placeholder]` |
| Review Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

### Graph Adapter

| Field | Record Placeholder |
| --- | --- |
| Verification Target | Normalization boundary, canonical graph candidate, fallback, provenance, mutation absence |
| Observation | `[graph-adapter-observation-placeholder]` |
| Expected Result | Graph output remains display candidate data with warnings and provenance visible |
| Actual Result | `[graph-adapter-actual-result-placeholder]` |
| Pass / Fail / Inconclusive | `[pass / fail / inconclusive]` |
| Evidence Reference | `[graph-adapter-evidence-id-placeholder]` |
| Reviewer | `[graph-boundary-reviewer-placeholder]` |
| Review Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

### Presentation

| Field | Record Placeholder |
| --- | --- |
| Verification Target | Disclosure metadata, badge metadata, inspector metadata, fallback ownership, operator wording, non-live wording |
| Observation | `[presentation-observation-placeholder]` |
| Expected Result | Presentation remains explanatory, non-actionable, non-live, and non-executing |
| Actual Result | `[presentation-actual-result-placeholder]` |
| Pass / Fail / Inconclusive | `[pass / fail / inconclusive]` |
| Evidence Reference | `[presentation-evidence-id-placeholder]` |
| Reviewer | `[presentation-boundary-reviewer-placeholder]` |
| Review Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

### UI

| Field | Record Placeholder |
| --- | --- |
| Verification Target | Read-only rendering, guarded state, disabled state, error/fallback display, source disclosure, no write interaction, no hidden enablement |
| Observation | `[ui-observation-placeholder]` |
| Expected Result | UI remains display-only, guarded, disabled, non-live, and without write or enablement controls |
| Actual Result | `[ui-actual-result-placeholder]` |
| Pass / Fail / Inconclusive | `[pass / fail / inconclusive]` |
| Evidence Reference | `[ui-evidence-id-placeholder]` |
| Reviewer | `[ui-boundary-reviewer-placeholder]` |
| Review Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

Verification record rules:

- `pass` is valid only when required evidence is complete and safety constraints are preserved.
- `fail` means the layer cannot be accepted for the recorded scope.
- `inconclusive` blocks final pass until evidence is completed or reviewed as a non-safety caveat.
- Any mutation, execution, enablement, or production signal is Stop.

## 7. Evidence Records

| Evidence | Evidence ID | Description | Source | Recorder | Reviewer | Status | Storage Location |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Repository | `repo-evidence-[id]` | Branch, commit SHA, working tree, diff scope | `[repository-state-source]` | `[evidence-recorder]` | `[technical-reviewer]` | `[pending / complete / incomplete / rejected]` | `[repository-evidence-location]` |
| Build | `build-evidence-[id]` | Build result for admin dashboard package | `[build-result-source]` | `[evidence-recorder]` | `[technical-reviewer]` | `[pending / complete / incomplete / rejected]` | `[build-evidence-location]` |
| Test | `test-evidence-[id]` | Required test result or not-scoped reason | `[test-result-source-or-not-scoped-note]` | `[evidence-recorder]` | `[technical-reviewer]` | `[pending / complete / incomplete / rejected]` | `[test-evidence-location]` |
| Route | `route-evidence-[id]` | GET-only and read-only route contract evidence | `[route-evidence-source]` | `[evidence-recorder]` | `[route-boundary-reviewer]` | `[pending / complete / incomplete / rejected]` | `[route-evidence-location]` |
| Adapter | `adapter-evidence-[id]` | Fetch and graph adapter boundary evidence | `[adapter-evidence-source]` | `[evidence-recorder]` | `[technical-reviewer]` | `[pending / complete / incomplete / rejected]` | `[adapter-evidence-location]` |
| Validation | `validation-evidence-[id]` | Classification, fail-closed, side-effect absence evidence | `[validation-evidence-source]` | `[evidence-recorder]` | `[validation-layer-reviewer]` | `[pending / complete / incomplete / rejected]` | `[validation-evidence-location]` |
| Presentation | `presentation-evidence-[id]` | Display-candidate and non-actionable wording evidence | `[presentation-evidence-source]` | `[evidence-recorder]` | `[presentation-boundary-reviewer]` | `[pending / complete / incomplete / rejected]` | `[presentation-evidence-location]` |
| UI | `ui-evidence-[id]` | Read-only, guarded, disabled, non-live UI evidence | `[ui-evidence-source]` | `[evidence-recorder]` | `[ui-boundary-reviewer]` | `[pending / complete / incomplete / rejected]` | `[ui-evidence-location]` |
| Safety | `safety-evidence-[id]` | Feature flags false, guarded, disabled, non-live, no mutation evidence | `[safety-evidence-source]` | `[evidence-recorder]` | `[governance-reviewer]` | `[pending / complete / incomplete / rejected]` | `[safety-evidence-location]` |
| Review | `review-evidence-[id]` | Reviewer decisions, comments, and final review references | `[review-evidence-source]` | `[evidence-recorder]` | `[final-decision-owner]` | `[pending / complete / incomplete / rejected]` | `[review-evidence-location]` |

Evidence status rules:

- `pending` means record slot exists but evidence has not been reviewed.
- `complete` means evidence is available and reviewable.
- `incomplete` means evidence gap remains visible.
- `rejected` means reviewer did not accept the evidence for the recorded scope.

Evidence record interpretation:

- Storage Location is a placeholder for a future review package location.
- B84-03 does not implement evidence storage.
- Evidence IDs are workbook identifiers, not database keys.

## 8. Reviewer Comments

### Technical Reviewer

| Field | Placeholder |
| --- | --- |
| Review Summary | `[technical-review-summary-placeholder]` |
| Findings | `[technical-findings-placeholder]` |
| Risks | `[technical-risks-placeholder]` |
| Recommendation | `[technical-recommendation-placeholder]` |
| Sign-off Placeholder | `[technical-reviewer-sign-off-placeholder]` |

### Architecture Reviewer

| Field | Placeholder |
| --- | --- |
| Review Summary | `[architecture-review-summary-placeholder]` |
| Findings | `[architecture-findings-placeholder]` |
| Risks | `[architecture-risks-placeholder]` |
| Recommendation | `[architecture-recommendation-placeholder]` |
| Sign-off Placeholder | `[architecture-reviewer-sign-off-placeholder]` |

### Governance Reviewer

| Field | Placeholder |
| --- | --- |
| Review Summary | `[governance-review-summary-placeholder]` |
| Findings | `[governance-findings-placeholder]` |
| Risks | `[governance-risks-placeholder]` |
| Recommendation | `[governance-recommendation-placeholder]` |
| Sign-off Placeholder | `[governance-reviewer-sign-off-placeholder]` |

Reviewer comment rules:

- Reviewers record findings and recommendations only.
- Reviewers do not approve Runtime Enablement.
- Governance Reviewer can block pass when safety evidence is incomplete or unsafe.

## 9. Stop Records

### Immediate Stop

| Field | Record Placeholder |
| --- | --- |
| Stop ID | `[immediate-stop-id-placeholder]` |
| Trigger | `[mutation-detection / post-write-detection / feature-flag-unexpected-enablement / production-connection / unauthorized-exposure / other-critical-trigger]` |
| Severity | `[critical]` |
| Detection Time | `[detection-time-placeholder]` |
| Stop Authority | `[stop-authority-placeholder]` |
| Action Taken | `[stop-recorded-and-progression-blocked-placeholder]` |
| Recovery Required | `[yes / no / not-reviewed]` |
| Resume Decision | `[resume-denied / resume-approved-by-final-decision-owner / not-reviewed]` |

Immediate Stop interpretation:

- Immediate Stop blocks progression.
- Immediate Stop cannot be downgraded to Conditional Pass.
- Immediate Stop does not trigger repair, retry, or runtime workflow.

### Controlled Stop

| Field | Record Placeholder |
| --- | --- |
| Stop ID | `[controlled-stop-id-placeholder]` |
| Trigger | `[evidence-insufficient / reviewer-missing / inconclusive / unexpected-non-mutating-behavior / other-controlled-trigger]` |
| Severity | `[high / medium / low]` |
| Detection Time | `[detection-time-placeholder]` |
| Stop Authority | `[stop-authority-placeholder]` |
| Action Taken | `[stage-progression-blocked-placeholder]` |
| Recovery Required | `[yes / no / not-reviewed]` |
| Resume Decision | `[resume-denied / resume-approved-by-final-decision-owner / not-reviewed]` |

Controlled Stop interpretation:

- Controlled Stop blocks affected layer progression.
- Controlled Stop may become Rework Required or Stop when unresolved.
- Controlled Stop cannot be resolved through runtime execution in B84-03.

## 10. Recovery Records

Recovery records define record fields only. They do not define recovery procedures, repair steps, retry behavior, rollback commands, or automation.

| Field | Record Placeholder |
| --- | --- |
| Recovery ID | `[recovery-id-placeholder]` |
| Trigger | `[recovery-trigger-placeholder]` |
| Recovery Action | `[recovery-action-record-placeholder]` |
| Verification After Recovery | `[verification-after-recovery-record-placeholder]` |
| Reviewer | `[recovery-reviewer-placeholder]` |
| Result | `[accepted / rejected / needs-follow-up / not-reviewed]` |

Recovery record rules:

- Recovery Action records what was reviewed in a future phase; it is not an instruction here.
- Verification After Recovery records whether safe state was reconfirmed in a future phase.
- Resume requires Final Decision Owner review.
- Safety state after recovery must preserve disabled, guarded, non-live, no-mutation posture.

## 11. Final Review

| Field | Record Placeholder |
| --- | --- |
| Overall Summary | `[overall-summary-placeholder]` |
| Outstanding Issues | `[outstanding-issues-placeholder]` |
| Evidence Completeness | `[complete / incomplete / rejected / not-reviewed]` |
| Reviewer Agreement | `[agreed / partially-agreed / disagreed / not-reviewed]` |
| Final Recommendation | `[pass / conditional-pass / rework-required / stop / not-reviewed]` |

Final review rules:

- Overall Summary must not hide stop or inconclusive items.
- Outstanding Issues must identify owner and decision impact in a later review.
- Evidence Completeness must remain incomplete when evidence is missing.
- Reviewer Agreement does not override safety blockers.
- Final Recommendation is verification review metadata only.

## 12. Decision Summary

### Pass

Decision Owner:

- `[final-decision-owner-placeholder]`

Evidence Reference:

- `[complete-evidence-reference-placeholder]`

Next Action:

- Mark the recorded Verification scope as complete for review purposes.
- Proceed to B84-04 Controlled Runtime Verification Review Workbook design.

Interpretation:

- Pass means Verification completed for the recorded scope only.
- Pass does not mean Runtime Enablement.
- Pass does not change feature flags, source options, route, adapters, validation, projection, presentation, or UI.

### Conditional Pass

Decision Owner:

- `[final-decision-owner-placeholder]` with `[governance-reviewer-placeholder]`

Evidence Reference:

- `[conditional-evidence-reference-placeholder]`

Next Action:

- Proceed only with explicit non-safety caveats recorded.
- Carry caveats into B84-04 review.

Interpretation:

- Conditional Pass cannot accept safety risk.
- Conditional Pass cannot hide incomplete evidence.
- Conditional Pass does not authorize Runtime Enablement.

### Rework Required

Decision Owner:

- `[final-decision-owner-placeholder]`

Evidence Reference:

- `[rework-evidence-reference-placeholder]`

Next Action:

- Return to design clarification, evidence completion, or workbook correction.
- Do not proceed as pass until rework is reviewed.

Interpretation:

- Rework Required does not trigger implementation.
- Rework Required does not authorize runtime execution to fill gaps.
- Rework Required preserves guarded, disabled, non-live state.

### Stop

Decision Owner:

- `[stop-authority-placeholder]` with `[final-decision-owner-placeholder]`

Evidence Reference:

- `[stop-evidence-reference-placeholder]`

Next Action:

- Stop the recorded verification chain.
- Preserve stop record and recovery requirement.
- Do not proceed until Final Decision Owner reviews resume eligibility in a later explicitly scoped phase.

Interpretation:

- Stop blocks progression.
- Stop does not trigger repair, retry, approval workflow, or runtime workflow.
- Stop preserves Runtime Enablement as Not Ready.

Decision summary rules:

- Pass is verification completion only.
- Pass is not Runtime Enablement approval.
- Any decision that implies enablement, production rollout, mutation, or feature flag change is invalid for this workbook.

## 13. Workbook Completion Criteria

B84-03 is complete when:

- execution information completed
- verification records completed
- evidence records completed
- reviewer comments completed
- stop records completed
- recovery records completed
- final review completed
- decision summary completed

Completion interpretation:

- Completion means workbook template design is complete.
- Completion does not mean Runtime Verification has started.
- Completion does not mean Runtime Verification passed.
- Completion does not mean Runtime Enablement is ready.

## 14. Recommended Next Phase

Recommended next phase:

```text
B84-04 Controlled Runtime Verification Review Workbook
```

Purpose:

- Verification Workbook のレビュー記録
- Reviewer 間の合意形成
- Evidence レビュー
- Decision レビュー

Recommended B84-04 posture:

- Review workbook design only.
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
