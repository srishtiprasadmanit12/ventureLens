import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCandidateList } from '../src/schemas.js';

const validCandidate = {
  name: 'Example AI',
  website: 'https://example.com',
  description: 'AI workflow software',
  source_material: 'Some imperfect source notes.',
  source_url: 'https://example.com/about',
  notes: 'Needs diligence.',
  evidence: {
    team: { background: 'Unknown', prior_experience: 'Unknown' },
    product: { target_customer: 'Businesses', core_product: 'AI tool', key_capabilities: ['Automation'] },
    market: { market_category: 'Software', competition: ['Manual work'] },
    traction: { signal: 'Early', freshness: 'Undated' }
  },
  open_questions: ['What is retention?'],
  sources: ['https://example.com/about']
};

test('accepts the enriched candidate contract', () => {
  assert.deepEqual(validateCandidateList([validCandidate]), [validCandidate]);
});

test('reports missing required fields', () => {
  assert.throws(
    () => validateCandidateList([{ name: 'Incomplete' }]),
    /website must be a non-empty string/
  );
});

test('reports missing evidence categories', () => {
  const candidate = structuredClone(validCandidate);
  delete candidate.evidence.traction;
  assert.throws(
    () => validateCandidateList([candidate]),
    /evidence\.traction must be an object/
  );
});

test('reports empty diligence questions', () => {
  const candidate = { ...validCandidate, open_questions: [] };
  assert.throws(
    () => validateCandidateList([candidate]),
    /open_questions must be a non-empty array/
  );
});
