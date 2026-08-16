export interface TextAuthority { acceptedIdeas: string[]; rejectedIdeas: string[]; }
export interface TextAssessment { correct: boolean; matchedIdeas: string[]; rejectedIdeasFound: string[]; coverage: number; }

function normalise(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function assessTextAnswer(input: string, authority: TextAuthority): TextAssessment {
  const text = normalise(input);
  const matchedIdeas = authority.acceptedIdeas.filter((idea) => text.includes(normalise(idea)));
  const rejectedIdeasFound = authority.rejectedIdeas.filter((idea) => text.includes(normalise(idea)));
  const coverage = matchedIdeas.length / authority.acceptedIdeas.length;
  return { correct: coverage >= 0.6 && rejectedIdeasFound.length === 0, matchedIdeas, rejectedIdeasFound, coverage };
}
