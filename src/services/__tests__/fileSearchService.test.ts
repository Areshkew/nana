// Original: Tests/MuxyTests/Git/ (no direct Swift tests for FileSearchService)
// Description: Unit tests for fileSearchService fuzzy scoring algorithm.
// Status: Completed

import { describe, it, expect } from 'vitest'
import { fuzzyScore } from '../fileSearchService'

function q(s: string): string[] {
  return Array.from(s.toLowerCase())
}

describe('fuzzyScore', () => {
  describe('exact match', () => {
    it('scores exact match highest', () => {
      const result = fuzzyScore(q('foo'), 'foo', 'foo', false)
      expect(result).toBeGreaterThan(11000)
    })

    it('returns null when query is longer than target', () => {
      const result = fuzzyScore(q('foobar'), 'foo', 'foo', false)
      expect(result).toBeNull()
    })
  })

  describe('contiguous substring', () => {
    it('scores contiguous match in filename', () => {
      const result = fuzzyScore(q('bar'), 'foobarbaz', 'path/foobarbaz', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(5000)
    })

    it('gives bonus when match starts at beginning', () => {
      const atStart = fuzzyScore(q('foo'), 'foobarbaz', 'path/foobarbaz', false)
      const inMiddle = fuzzyScore(q('bar'), 'foobarbaz', 'path/foobarbaz', false)
      expect(atStart).not.toBeNull()
      expect(inMiddle).not.toBeNull()
      expect(atStart!).toBeGreaterThan(inMiddle!)
    })

    it('gives bonus for separator-before match', () => {
      const separated = fuzzyScore(q('bar'), 'foo_bar_baz', 'path/foo_bar_baz', false)
      const contiguous = fuzzyScore(q('oba'), 'foobarbaz', 'path/foobarbaz', false)
      expect(separated).not.toBeNull()
      expect(contiguous).not.toBeNull()
      expect(separated!).toBeGreaterThan(contiguous!)
    })
  })

  describe('fuzzy subsequence', () => {
    it('matches non-contiguous subsequence', () => {
      const result = fuzzyScore(q('fbr'), 'foobar', 'foobar', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(1000)
    })

    it('returns null when subsequence cannot be matched', () => {
      const result = fuzzyScore(q('fbz'), 'foobar', 'foobar', false)
      expect(result).toBeNull()
    })

    it('gives bonus for consecutive characters in subsequence', () => {
      const consecutive = fuzzyScore(q('fo'), 'foobar', 'foobar', false)
      const scattered = fuzzyScore(q('fo'), 'fxxoxx', 'fxxoxx', false)
      expect(consecutive).not.toBeNull()
      expect(scattered).not.toBeNull()
      expect(consecutive!).toBeGreaterThan(scattered!)
    })

    it('penalizes late first match', () => {
      const early = fuzzyScore(q('a'), 'abcdef', 'abcdef', false)
      const late = fuzzyScore(q('a'), 'bcdefa', 'bcdefa', false)
      expect(early).not.toBeNull()
      expect(late).not.toBeNull()
      expect(early!).toBeGreaterThan(late!)
    })
  })

  describe('path query preference', () => {
    it('scores against path when preferPath is true', () => {
      const fileMatch = fuzzyScore(q('foo'), 'foobarbaz', 'deep/nested/foobarbaz', false)
      const pathMatch = fuzzyScore(q('deep'), 'foobarbaz', 'deep/nested/foobarbaz', true)
      expect(fileMatch).not.toBeNull()
      expect(pathMatch).not.toBeNull()
      // Path query gets +1000 bonus
    })

    it('falls back to path match when filename does not match', () => {
      const result = fuzzyScore(q('nested'), 'foobarbaz', 'deep/nested/foobarbaz', false)
      expect(result).not.toBeNull()
      // Contiguous match in path with separator bonus, but no filename bonus
      expect(result!).toBeGreaterThan(5000)
    })
  })

  describe('empty queries', () => {
    it('returns null for empty query', () => {
      const result = fuzzyScore([], 'foo', 'foo', false)
      expect(result).toBeNull()
    })
  })

  describe('separator and boundary bonuses', () => {
    it('scores match after underscore as separator', () => {
      const result = fuzzyScore(q('bar'), 'foo_bar_baz', 'foo_bar_baz', false)
      expect(result).not.toBeNull()
      // Contiguous match with separator bonus
      expect(result!).toBeGreaterThan(5500)
    })

    it('treats hyphen as separator', () => {
      const result = fuzzyScore(q('comp'), 'my-component', 'my-component', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(0)
    })

    it('treats dot as separator', () => {
      const result = fuzzyScore(q('test'), 'test.component', 'test.component', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(0)
    })

    it('treats slash as separator', () => {
      const result = fuzzyScore(q('src'), 'src/components', 'src/components', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(0)
    })
  })

  describe('filename match bonus', () => {
    it('gives preference to filename matches', () => {
      const nameMatch = fuzzyScore(q('app'), 'App.tsx', 'src/components/App.tsx', false)
      const pathMatch = fuzzyScore(q('components'), 'App.tsx', 'src/components/App.tsx', false)
      expect(nameMatch).not.toBeNull()
      expect(pathMatch).not.toBeNull()
      // Name match gets +1000 bonus + position bonus
      expect(nameMatch!).toBeGreaterThan(pathMatch!)
    })
  })

  describe('real-world examples', () => {
    it('matches "appts" against App.tsx', () => {
      const result = fuzzyScore(q('appts'), 'App.tsx', 'src/App.tsx', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(0)
    })

    it('matches "xterm" against XTermSurface.tsx', () => {
      const result = fuzzyScore(q('xterm'), 'XTermSurface.tsx', 'src/components/Terminal/XTermSurface.tsx', false)
      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(0)
    })

    it('does not match unrelated query', () => {
      const result = fuzzyScore(q('nevermatch'), 'App.tsx', 'src/App.tsx', false)
      expect(result).toBeNull()
    })
  })
})
