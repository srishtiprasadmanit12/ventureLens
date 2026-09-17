import { readFile } from 'node:fs/promises';
import { validateCandidateList } from './schemas.js';

export async function loadCandidates(inputPath) {
  let raw;
  try {
    raw = await readFile(inputPath, 'utf8');
  } catch (error) {
    throw new Error(`could not read input file ${inputPath}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON in ${inputPath}: ${error.message}`);
  }

  return validateCandidateList(parsed);
}
