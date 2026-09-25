import { describe, expect, it } from 'vitest';

import { parseDuckDuckGoHtml } from '../src/search.js';

const fixtureHtml = `
<html>
  <body>
    <div class="result">
      <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.britannica.com%2Fplace%2FBenin">Kingdom of Benin | Britannica</a></h2>
      <a class="result__snippet">The Kingdom of Benin flourished from the 13th century onward in southern Nigeria.</a>
    </div>
    <div class="result">
      <h2><a class="result__a" href="https://www.example.org/idia">Queen Idia of the Benin Empire</a></h2>
      <a class="result__snippet">Queen Idia was the mother of Oba Esigie.</a>
    </div>
    <div class="result">
      <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.example.org%2Fidia">Duplicate result</a></h2>
      <a class="result__snippet">Should be deduplicated.</a>
    </div>
  </body>
</html>
`;

describe('parseDuckDuckGoHtml', () => {
    it('parses titles, snippets and resolves uddg redirect links', () => {
        const results = parseDuckDuckGoHtml(fixtureHtml);

        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({
            title: 'Kingdom of Benin | Britannica',
            url: 'https://www.britannica.com/place/Benin',
        });
        expect(results[0].description).toContain('13th century');
        expect(results[1].url).toBe('https://www.example.org/idia');
    });

    it('deduplicates identical target URLs', () => {
        const results = parseDuckDuckGoHtml(fixtureHtml);
        const urls = results.map((r) => r.url.toLowerCase());
        expect(new Set(urls).size).toBe(urls.length);
    });

    it('returns an empty array for markup without results', () => {
        expect(parseDuckDuckGoHtml('<html><body>No results</body></html>')).toEqual([]);
    });
});
