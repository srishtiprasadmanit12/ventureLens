 # How AI/Copilot was used

## 2026-09-17 - Input and meeting-decision design

- **Request:** Explain how the pipeline should decide whether to schedule a venture meeting, identify useful information to extract from a YC page, and make the input less structured so an LLM can structure it.
- **Approach suggested:** Keep basic identity and source metadata stable, add free-form `source_material`, ask the LLM to extract Team/Product/Market/Risks plus rubric ratings and meeting questions, then keep score thresholds and the final recommendation deterministic.
- **Decision:** Accepted this split. A score of 75+ is necessary for `Take a meeting`, but weak evidence can cap the outcome at `Watch`; `Pass` represents weak thesis fit or a material visible risk.
- **Reason:** This preserves replayability and prevents the LLM from directly deciding the investment call while making the extraction step realistic and auditable.
- **YC extraction insight:** Documented founder background, batch/status, product/problem, customer or traction claims, business model, timing, links, dates, contradictions, and missing evidence as useful source material.

## 2026-09-17 - Enriched candidate input data

- **Request:** Make the startup input more useful for deciding whether to schedule a venture meeting, using a richer Glean-style record.
- **Approach:** Added `evidence.team`, `evidence.product`, `evidence.market`, `evidence.traction`, `open_questions`, and `sources` to all 10 candidates while retaining the narrative `source_material`.
- **Decision:** Used explicit unknowns and validation questions where the existing data had no verified metric. Did not add unsupported revenue, retention, customer counts, or founder claims.
- **Reason:** The LLM can now extract comparable decision inputs, while open questions and source links preserve uncertainty for deterministic scoring and memo review.

## 2026-09-17 - MVP contract aligned with enriched input

- **Request:** Update the MVP documentation to reflect the enriched startup input file.
- **Approach:** Made source URLs, notes, evidence categories, open questions, and sources part of the documented input contract; kept `source_material` as the unstructured narrative input.
- **Decision:** The LLM receives both narrative and organized evidence, but scoring remains downstream and deterministic. Evidence fields are signals to inspect, not precomputed scores.
- **Reason:** This improves traceability and decision quality without allowing the dataset or LLM to bypass the explicit scoring rubric.

## 2026-09-17 - Phased implementation plan

- **Request:** Update the MVP documentation so implementation happens in phases instead of generating all code at once.
- **Approach:** Split the build into input contract, runtime loading, fixture analysis, deterministic scoring, memo rendering, CLI artifacts, and optional real-provider integration.
- **Decision:** Require a focused test checkpoint and a worklog entry after every phase; make the real LLM provider optional and keep fixture mode as the default.
- **Reason:** Small phases reduce debugging scope, preserve the deterministic demo, and make each architectural boundary reviewable before adding the next one.

## 2026-09-17 - Phase 1 implementation

- **Request:** Implement Phase 1 only.
- **Approach:** Added Node.js ES module configuration, runtime validation for the enriched candidate contract, `loadCandidates()` for JSON file loading, and focused tests for valid input, malformed JSON, missing fields, missing evidence categories, and empty diligence questions.
- **Decision:** Required `source_url`, `notes`, all four evidence sections, `open_questions`, and `sources` because those fields are now part of the checked-in dataset and MVP contract.
- **Scope boundary:** Did not add LLM analysis, scoring, memo rendering, CLI execution, or output artifacts.
- **Validation:** `npm test` passed 6 tests; the real `data/startups.json` loaded and validated as 10 candidates.

## 2026-09-17 - Phase 0 implementation

- **Request:** Implement Phase 0 together with Phase 2.
- **Approach:** Added a regression test that loads the real checked-in dataset and asserts 10 candidates, all evidence sections, open questions, and source links.
- **Decision:** Reused the Phase 1 loader and validator instead of creating a second dataset-checking path.
- **Reason:** Phase 0 is a contract checkpoint; duplicate validation would create unnecessary drift.
- **Validation:** The Phase 0 dataset test passed as part of the 10-test suite.

## 2026-09-17 - Phase 2 implementation

- **Request:** Implement Phase 2 together with Phase 0.
- **Approach:** Added `prompts/analysis.md`, a deterministic fixture adapter in `src/llm.js`, `src/analysis.js`, runtime analysis-output validation, and tests for valid output, malformed output, and adapter failures.
- **Decision:** The fixture adapter receives the enriched candidate record and carries forward `open_questions`; it does not return a score or recommendation.
- **Reason:** This proves the LLM boundary without an API key and keeps investment judgment for the later deterministic scoring phase.
- **Issue resolved:** The malformed-output test initially expected a nested summary error, but an empty adapter result correctly fails first at the missing section object. The test was adjusted to assert that stable section-level error.
- **Validation:** `npm test` passed all 10 tests.

## 2026-09-17 - Phase 3 implementation

- **Request:** Implement deterministic scoring and recommendation thresholds.
- **Approach:** Added a pure scoring module with the documented weighted rubric and a source-backed evidence gate for meeting recommendations.
- **Decision:** Missing evidence leaves the numeric score unchanged but caps a 75+ result at `Watch`; only validated analysis reaches the scoring calculation.
- **Validation:** Added weighted-score, threshold-boundary, missing-evidence, and repeatability tests.

## 2026-09-17 - Phase 4 implementation

- **Request:** Implement Markdown memo rendering for a scored candidate.
- **Approach:** Added a pure renderer that combines candidate source links, validated analysis, and the deterministic score into a concise partner-readable memo.
- **Decision:** Memo rendering displays the evidence gate and preserves unknowns and open questions alongside source-backed claims; it does not recalculate scores or call an adapter.
- **Validation:** Added tests covering decision content, analysis sections, risks, change-of-mind questions, and source links.

## 2026-09-17 - Phase 5 implementation

- **Request:** Implement the replayable CLI and run artifacts.
- **Approach:** Added an exported pipeline runner and CLI command that processes each candidate independently and writes input, analysis, score, memo, and run metadata under a timestamped output directory.
- **Decision:** Candidate failures are recorded in `run.json` while successful candidates continue; the default mode remains fixture-based and deterministic.
- **Validation:** Added a 10-candidate end-to-end test and a candidate-isolation failure test.

## 2026-09-17 - Phase 6 implementation

- **Request:** Add an optional real LLM provider without changing the analysis, scoring, or memo contracts.
- **Approach:** Added a dependency-free OpenAI-compatible adapter using built-in `fetch`, with environment-gated provider selection and fixture fallback.
- **Decision:** The provider is used only when API key and model settings are configured; incomplete configuration fails clearly, while provider output still passes through the existing analysis validator.
- **Validation:** Added tests for fixture fallback, configuration errors, request construction, JSON parsing, and provider failures.

 