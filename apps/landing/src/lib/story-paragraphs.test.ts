// The About story seam (M7 #224): the Site tab stores the story as plain
// text and newlines mean paragraphs (the spec's ruling — rich text stays
// parked). Pinned so the splitting law (trim + drop empties) survives.
import { describe, expect, it } from 'vitest';
import { storyParagraphs } from './story-paragraphs';

describe('storyParagraphs (M7 #224 — newlines are paragraphs)', () => {
  it('a single-line story is one paragraph (today’s placeholder default)', () => {
    expect(storyParagraphs('Our studio story is coming soon.')).toEqual([
      'Our studio story is coming soon.',
    ]);
  });

  it('newlines split paragraphs; each paragraph trims', () => {
    expect(storyParagraphs('Line one.\n  Line two.  \nLine three.')).toEqual([
      'Line one.',
      'Line two.',
      'Line three.',
    ]);
  });

  it('blank lines between paragraphs drop (double newlines are spacing, not paragraphs)', () => {
    expect(storyParagraphs('Line one.\r\n\r\nLine two.')).toEqual(['Line one.', 'Line two.']);
  });

  it('a null or whitespace-only story renders no paragraphs', () => {
    expect(storyParagraphs(null)).toEqual([]);
    expect(storyParagraphs('  \n  \n')).toEqual([]);
  });
});
