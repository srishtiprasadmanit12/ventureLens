# VentureAI MVP

## Goal

Build a small, replayable command-line pipeline that turns a hardcoded list of startup candidates into structured analyses and one-page investment memos.

The MVP should help a partner answer two questions quickly:

1. Is this startup worth spending more time on?
2. What evidence supports that decision?

## MVP Scope

### In scope

- Read a checked-in startup dataset from one local JSON file.
- Process 10-20 candidates in one run.
- Use one LLM call to generate a consistent Team, Product, Market, and Risks analysis for every candidate.
- Score each analysis with deterministic application code against one explicit investment thesis.
- Produce a `Pass`, `Watch`, or `Take a meeting` recommendation.
- Save the input, structured analysis, score, recommendation, and final memo.
- Preserve the public-source URLs, notes, evidence, and open questions included in the dataset.
- Continue processing when one candidate has missing or unusable data.

### Out of scope

- Product Hunt, YC, Crunchbase, Twitter/X, or Hacker News integrations.
- Automatic startup discovery or search.
- A web application or dashboard.
- A database, job queue, authentication, or deployment infrastructure.
- Background scheduling.
- Full market research or financial diligence.
- Perfect founder verification.
- Embeddings, vector search, or a multi-agent architecture.

## Input Dataset

The initial candidate set is stored in the checked-in file `data/startups.json`.
It is collected from public sources before the pipeline is run. This keeps the
demo deterministic and replayable while allowing the analysis and
recommendation pipeline to be evaluated independently of live scraping.

The MVP does not discover startups or fetch websites at runtime. Public-source
collection is an input preparation step, not part of the executable pipeline.

Example:

```json
[
  {
    "name": "Example AI",
    "website": "https://example.com",
    "description": "AI workflow software for small businesses",
    "founders": ["Jane Doe"],
    "source_url": "https://example.com/launch",
    "notes": "Public source describes an early product; customer evidence is incomplete.",
    "source_material": "The company appears to help small businesses automate a recurring workflow. The exact buyer, current usage, pricing, and evidence of retention are unclear from the initial source.",
    "evidence": {
      "team": {
        "background": "Founder background from the public source, if available.",
        "prior_experience": "Previous companies, roles, or relevant domain experience; otherwise unknown."
      },
      "product": {
        "target_customer": "Clearly identified customer or unknown.",
        "core_product": "Plain-language product description.",
        "key_capabilities": ["Capability from the source"]
      },
      "market": {
        "market_category": "Relevant category.",
        "competition": ["Named or plausible alternatives from the source"]
      },
      "traction": {
        "signal": "Public customer, usage, funding, launch, or product-development signal.",
        "freshness": "Date or recency context, if available."
      }
    },
    "open_questions": ["What evidence would validate customer demand?"],
    "sources": ["https://example.com/launch"]
  }
]
```

Required fields:

- `name`
- `website`
- `description`
- `source_material`
- `source_url`
- `notes`
- `evidence.team`
- `evidence.product`
- `evidence.market`
- `evidence.traction`
- `open_questions`
- `sources`

Optional fields:

- `founders`

The file is the sourcing boundary for the MVP. Keep `source_material` as
short, imperfect notes copied or summarized from public sources. It may contain
mixed facts, founder statements, questions, metrics, and contradictory signals.
The `evidence` object makes the most useful known signals easier to inspect,
while `open_questions` records what is still needed for diligence. Do not
pre-compute the score or recommendation in this file. This keeps the demo
deterministic while giving the LLM both narrative context and source-grounded
signals to evaluate.

## Pipeline

```text
data/startups.json
    |
    v
LLM analysis
    |
    v
Team / Product / Market / Risks
    |
    v
deterministic scoring
    |
    v
Pass / Watch / Meeting
    |
    v
Markdown memo
```

### Stage 1: LLM Analysis

Validate each input record, then send the candidate metadata, `source_material`,
`evidence`, `open_questions`, and source URLs to the LLM. The LLM checks the
provided signals, identifies facts versus assumptions, fills gaps where it can,
and returns structured decision inputs:

```json
{
  "team": {
    "summary": "...",
    "evidence": [
      {"claim": "...", "url": "...", "quote": "..."}
    ],
    "unknowns": ["..."]
  },
  "product": {
    "summary": "...",
    "evidence": []
  },
  "market": {
    "summary": "...",
    "evidence": [],
    "unknowns": ["..."],
    "assumptions": ["..."]
  },
  "risks": ["..."],
  "scoring_inputs": {
    "pain_frequency": {"rating": 0, "reason": "..."},
    "product_clarity": {"rating": 0, "reason": "..."},
    "ai_advantage": {"rating": 0, "reason": "..."},
    "market_timing": {"rating": 0, "reason": "..."},
    "team_evidence": {"rating": 0, "reason": "..."},
    "distribution_retention": {"rating": 0, "reason": "..."}
  },
  "meeting_case": {
    "why_meet": "...",
    "what_to_ask": ["...", "..."],
    "what_would_change_my_mind": ["...", "..."]
  }
}
```

The analysis prompt must require the model to distinguish facts, assumptions,
and unknowns. It may summarize the evidence already present in the input, but
it must not invent founder backgrounds, traction, market size, or customer
claims. The model should carry forward relevant `open_questions` into the
meeting case and identify which questions are answered or still unresolved.
Invalid or incomplete model output should be recorded as an error for that
candidate without stopping the rest of the run.

### Useful Public-Source Extraction

For a source such as a YC company page, the collection step should preserve the
page URL and capture unstructured excerpts about:

- Company description, product, target user, and the problem being solved.
- Founder names, roles, location, education, previous companies, and relevant
  technical or domain experience.
- YC batch, founding year, company status, and any stated launch or progress
  milestones.
- Product usage, customers, revenue, growth, waitlist, or other traction
  signals, including the date and exact wording of each claim.
- Business model, pricing hints, market category, and why the founders say the
  timing is right.
- Links to the company website, demo, product, and other public evidence.
- Missing information, conflicting claims, and questions a partner should ask.

The collector should not turn these signals into a score. Store the raw or
lightly summarized excerpts in `source_material`, organize the clearest signals
under `evidence`, and preserve the original URLs in `sources`. Store gaps and
contradictions in `open_questions`. The LLM extracts the structured analysis
and scoring inputs, and deterministic code applies the scoring rubric.

### Stage 2: Deterministic Scoring

The application calculates the score from explicit rubric values. The LLM does
not produce the final score or recommendation.

Use a simple thesis score from 0 to 100. The initial thesis is:

> Invest in early-stage B2B software companies using AI to solve a frequent, expensive workflow for a clearly identifiable business customer, where the product has a plausible path to durable distribution or workflow lock-in.

Suggested score weights:

| Dimension | Weight |
|---|---:|
| Pain and frequency of customer problem | 25 |
| Product clarity and usefulness | 20 |
| AI advantage or meaningful automation | 20 |
| Market and timing | 15 |
| Team evidence | 10 |
| Distribution or retention potential | 10 |

Each rubric dimension receives an integer rating from 0 to 10. The application
converts the ratings to the weighted total. Ratings must cite the relevant
evidence or explicitly state that the dimension is unknown. If a dimension is
unknown, the score must reflect the defined missing-data rule rather than a
model guess. A populated evidence field is not proof by itself; the source and
quality of the signal still need to be considered.

### Stage 3: Recommendation

Recommendation thresholds are applied in deterministic code:

- `Take a meeting`: 75-100
- `Watch`: 50-74
- `Pass`: 0-49

A threshold alone should not hide uncertainty. Each recommendation must include:

- The main reason for the call.
- The strongest supporting evidence.
- Two or three things that could change the decision.

The practical meeting rule is: schedule a meeting when the score is at least
75 and there is a credible, evidence-backed reason to learn more. A high score
with weak evidence should remain `Watch` until the missing evidence is
resolved. `Watch` means the company is promising but the next action is
evidence collection rather than a meeting. `Pass` means the thesis fit is weak
or a material risk is already visible. The memo must show the reason,
uncertainty, and questions behind every call.

### Stage 4: Markdown Memo

Render the structured analysis, deterministic score, recommendation, risks, and
evidence into one Markdown memo per candidate. Memo rendering must not make
additional LLM calls.

## Output

Each run writes to a timestamped directory under `output/`:

```text
output/
  2026-09-17T120000Z/
    run.json
    candidates/
      example-ai/
        input.json
        analysis.json
        score.json
        memo.md
```

`run.json` should include:

- Run timestamp.
- Input file path and hash.
- Thesis version.
- Model/configuration used.
- Candidate count.
- Per-candidate status and error, if any.

The final `memo.md` should be readable in about 60 seconds and follow this format:

```markdown
# Example AI

**Recommendation:** Take a meeting
**Score:** 78/100
**One-line view:** ...

## Product
...

## Team
...

## Market and timing
...

## Risks and open questions
- ...

## Why this call
...

## What would change my mind
1. ...
2. ...
3. ...

## Evidence
- [Claim](source URL): "short quote"
```

## Suggested Implementation

### Technology

- Node.js 20 or later.
- Plain JavaScript using ES modules.
- `npm` for scripts and dependency management.
- Node's built-in `node:test` module for focused tests.
- One LLM SDK or HTTP client, isolated behind the analysis adapter.

Keep the code modular but small:

```text
src/
  cli.js              # command entry point
  input.js            # load and validate startups.json
  analysis.js         # LLM prompt and structured model output
  scoring.js          # deterministic score and recommendation
  memo.js             # render markdown memo
  schemas.js          # input/output validation schemas
  llm.js              # provider adapter and fixture mode

data/
  startups.json

output/

prompts/
  analysis.md

test/
  input.test.js
  scoring.test.js
  memo.test.js
  pipeline.test.js

package.json
.env.example
```

A single command should run the complete pipeline:

```bash
npm install
npm run pipeline -- --input data/startups.json --output output
```

The implementation should use runtime schemas for input and model output,
explicit LLM error handling, and deterministic scoring functions with no
network access. Keep the LLM call behind one function so it can be replaced
with a fixture during tests. The scoring and memo stages must work from saved
analysis data.

Recommended `package.json` scripts:

```json
{
  "type": "module",
  "scripts": {
    "pipeline": "node src/cli.js",
    "test": "node --test"
  }
}
```

The default test mode must not require an API key. A fixture LLM adapter should
be used for tests and local demonstrations; the real provider is enabled only
when the required environment variables are configured.

## Phased Implementation Plan

Implement the MVP in small, reviewable phases. Do not generate the complete
pipeline in one step. At the end of each phase, run its focused validation and
stop to review the result before starting the next phase.

### Phase 0: Confirm the Input Contract

**Goal:** Make the checked-in dataset the stable boundary for the application.

**Work:**

- Validate `data/startups.json` as JSON.
- Validate the 10-record shape and required fields.
- Confirm every record has source URLs, evidence categories, open questions,
  and narrative `source_material`.
- Add or update input-contract tests only.

**Checkpoint:** Invalid JSON, missing fields, and malformed evidence fail with
clear messages; the current dataset passes.

### Phase 1: Add Runtime Schemas and Input Loading

**Goal:** Load validated candidates from Node.js code.

**Work:**

- Add `package.json` and the Node.js test script.
- Add `src/schemas.js` for candidate validation.
- Add `src/input.js` for file reading and JSON parsing.
- Add focused tests for valid and invalid candidate records.

**Checkpoint:** `npm test` passes, and no LLM or output-directory code exists
yet.

### Phase 2: Add Fixture Analysis

**Goal:** Prove the LLM output contract without requiring an API key.

**Work:**

- Add the analysis output schema.
- Add `prompts/analysis.md` describing the source-grounding rules.
- Add `src/llm.js` with a deterministic fixture adapter.
- Add `src/analysis.js` to pass candidate metadata, evidence, questions, and
  source material to the adapter.
- Test valid output, malformed output, and per-candidate analysis errors.

**Checkpoint:** One candidate produces validated Team, Product, Market, Risks,
scoring inputs, and meeting questions using fixture data only.

### Phase 3: Add Deterministic Scoring

**Goal:** Separate investment judgment from the LLM.

**Work:**

- Add `src/scoring.js` with the documented weights and thresholds.
- Calculate the score only from validated scoring inputs.
- Apply the evidence gate for `Take a meeting`.
- Test boundary scores, missing evidence, and repeatability.

**Checkpoint:** The same analysis always produces the same score and
recommendation, and the scoring module has no network or LLM dependency.

### Phase 4: Add Markdown Memo Rendering

**Goal:** Make one candidate's result readable to a partner.

**Work:**

- Add `src/memo.js`.
- Render the recommendation, score, evidence gate, analysis sections, risks,
  open questions, and source links.
- Test that required decision content appears in the Markdown output.

**Checkpoint:** A fixture analysis and score produce a complete memo without
making another LLM call.

### Phase 5: Add the CLI and Run Artifacts

**Goal:** Connect the already-tested stages into one replayable command.

**Work:**

- Add `src/cli.js`.
- Process candidates independently so one failure does not stop the run.
- Write `input.json`, `analysis.json`, `score.json`, `memo.md`, and `run.json`.
- Add an end-to-end fixture test for the full 10-candidate dataset.

**Checkpoint:** The documented `npm run pipeline` command processes all valid
candidates and records errors without hiding successful results.

### Phase 6: Add an Optional Real LLM Provider

**Goal:** Replace fixture analysis only when credentials are configured.

**Work:**

- Add one provider adapter behind the existing `llm.js` interface.
- Keep fixture mode as the default for tests and local demonstrations.
- Add environment-variable documentation and provider error handling.
- Do not change scoring, recommendation, or memo contracts.

**Checkpoint:** Provider output passes the same runtime schema as fixture output;
the pipeline remains runnable without an API key.

### Phase Completion Rule

After every phase:

1. Run only the tests for the phase just completed.
2. Fix failures before adding the next phase.
3. Record the request, approach, decision, validation result, and any issue in
   `AI_WORKLOG.md`.
4. Keep the change small enough to review as one diff.

The MVP is considered implementation-complete only after Phase 5. Phase 6 is
an optional provider integration and must not be required to review the
replayable demo.

## Testing

The MVP only needs focused tests for the highest-risk behavior:

- Invalid input records are reported clearly.
- A failed LLM analysis does not stop the entire run.
- Model output is rejected or marked invalid when a required analysis section is malformed.
- Scores and recommendations are unchanged when the same analysis is rerun.
- Recommendation thresholds map scores correctly.
- Memo rendering includes the recommendation, deterministic score, risks, and evidence links from the input dataset.
- A fixture-based end-to-end run produces deterministic output without requiring an API call.

## Acceptance Criteria

The MVP is complete when:

- A reviewer can clone the repository and run one documented command.
- The command processes the committed hardcoded startup file.
- At least 10 sample candidates produce output, including a useful result when some data is missing.
- Every candidate has a structured analysis, score, recommendation, and markdown memo.
- Memos are understandable without reading the source code.
- Important claims have URLs and short supporting quotes, or are labeled unknown/assumption.
- The thesis and scoring rubric are visible in the repository.
- The committed sample output can be reviewed without rerunning the pipeline.
- The README explains setup, configuration, the command, output locations, and known limitations.

## Demo Path

For the walkthrough, show one startup end to end:

1. Open its record in `data/startups.json`.
2. Run the single pipeline command.
3. Open the startup record in `data/startups.json` and show the public-source URLs and notes.
4. Open `analysis.json` and show the score breakdown and unknowns.
5. Open `memo.md` and show the recommendation and what would change the decision.

## Deliberate Tradeoffs

This MVP favors traceability and repeatability over broad coverage. A checked-in
source file removes live sourcing from the critical path, allowing the
implementation to prove the analysis and recommendation workflow first. The
next useful increment would be adding a source-ingestion script that produces
the same `data/startups.json` contract without changing the analysis, scoring,
or memo stages.
