# VentureAI

VentureAI is a small, replayable investment-triage pipeline.

The MVP starts from a checked-in candidate dataset collected from public
sources. It then uses an LLM for qualitative analysis, deterministic code for
scoring and recommendations, and Markdown rendering for partner-readable
memos.

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

See [MVP.md](MVP.md) for the scope, thesis, data contract, output format,
testing plan, and acceptance criteria.

## Node.js Setup

Requirements: Node.js 20 or later.

```bash
npm install
npm run pipeline -- --input data/startups.json --output output
```

Run the test suite with:

```bash
npm test
```

The default pipeline mode uses the deterministic fixture adapter and requires
no API key. To use an OpenAI-compatible provider, set these environment
variables before running the pipeline:

```bash
export VENTUREAI_LLM_API_KEY=your-key
export VENTUREAI_LLM_MODEL=your-model
export VENTUREAI_LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
npm run pipeline -- --input data/startups.json --output output
```

The endpoint is optional when the API key and model are unset; fixture mode is
used. Provider responses must contain JSON matching the validated analysis
schema. Provider failures remain isolated to the affected candidate.

The pipeline uses a checked-in dataset and does not scrape websites at runtime.
Tests and local demonstrations can use a fixture LLM adapter, so an API key is
not required for deterministic validation. See [MVP.md](MVP.md) for the
implementation structure and configuration details.

The dataset keeps basic metadata such as the company name and source URL, but
also includes deliberately imperfect `source_material`. The LLM extracts team,
product, market, risks, scoring inputs, and meeting questions from that text.
Application code then applies the score thresholds: a score of 75 or higher
with credible evidence becomes `Take a meeting`; weak evidence remains
`Watch`, and weak thesis fit or a visible material risk becomes `Pass`.
# Project explanation and setup