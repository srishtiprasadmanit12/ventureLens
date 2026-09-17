import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadCandidates } from '../src/input.js';

const validCandidate = {
  name: 'Example AI',
  website: 'https://example.com',
  description: 'AI workflow software for small businesses',
  source_material: 'The company automates a recurring workflow.',
  source_url: 'https://example.com/about',
  notes: 'Customer evidence is incomplete.',
  evidence: {
    team: { background: 'Unknown', prior_experience: 'Unknown' },
    product: { target_customer: 'Small businesses', core_product: 'Workflow software', key_capabilities: ['Automation'] },
    market: { market_category: 'Business software', competition: ['Manual process'] },
    traction: { signal: 'Early product', freshness: 'Undated' }
  },
  open_questions: ['What is retention?'],
  sources: ['https://example.com/about']
};

test('loads and validates a candidate dataset', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ventureai-input-'));
  const file = path.join(directory, 'startups.json');
  await writeFile(file, JSON.stringify([validCandidate]));

  try {
    assert.deepEqual(await loadCandidates(file), [validCandidate]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports malformed JSON with the input path', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ventureai-input-'));
  const file = path.join(directory, 'broken.json');
  await writeFile(file, '{broken');

  try {
    await assert.rejects(loadCandidates(file), new RegExp(`invalid JSON in ${file}`));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
