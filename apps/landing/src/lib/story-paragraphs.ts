// The About story seam (M7 #224, spec § Settings made real): the story is
// plain multi-paragraph text — newlines are paragraphs, rich text stays
// parked. Lines trim and empty lines drop, so spacing around paragraphs in
// the Site tab's textarea never renders stray paragraphs.
export function storyParagraphs(story: string | null): string[] {
  if (story === null) return [];
  return story
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
