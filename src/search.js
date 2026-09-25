/**
 * StoryVault Africa — free search fallback.
 *
 * Collects public web results from DuckDuckGo's HTML endpoint so the Actor can
 * run on plans that cannot call the paid Google Search Scraper (HTTP 402).
 * This is a fallback only: when the Google Search Scraper actor is available,
 * it is always preferred.
 */
import { load } from 'cheerio';

const DDG_ENDPOINT = 'https://html.duckduckgo.com/html/';

/**
 * Resolves DuckDuckGo redirect links (`//duckduckgo.com/l/?uddg=<encoded>`)
 * to their target URL. Returns '' for links that cannot be resolved.
 *
 * @param {string} href
 * @returns {string}
 */
function resolveResultUrl(href) {
    if (!href) return '';
    let raw = href;
    if (raw.startsWith('//')) raw = `https:${raw}`;
    try {
        const url = new URL(raw);
        const uddg = url.searchParams.get('uddg');
        return uddg || raw;
    } catch {
        return '';
    }
}

/**
 * Parses the DuckDuckGo HTML results page into the same shape the Actor
 * consumes from the Google Search Scraper dataset.
 *
 * @param {string} html
 * @returns {{ title: string, description: string, url: string }[]}
 */
export function parseDuckDuckGoHtml(html) {
    const $ = load(html);
    const results = [];
    const seen = new Set();

    $('a.result__a').each((_, el) => {
        const title = $(el).text().replace(/\s+/g, ' ').trim();
        const url = resolveResultUrl($(el).attr('href') ?? '');

        if (!title || !url.startsWith('http') || seen.has(url.toLowerCase())) {
            return;
        }
        seen.add(url.toLowerCase());

        const description = $(el)
            .closest('.result')
            .find('.result__snippet')
            .text()
            .replace(/\s+/g, ' ')
            .trim();

        results.push({ title, description, url });
    });

    return results;
}

/**
 * Fetches public web results for a query from DuckDuckGo (no API key needed).
 *
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<{ title: string, description: string, url: string }[]>}
 */
export async function fetchDuckDuckGoResults(query, maxResults = 10) {
    const url = `${DDG_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept-Language': 'en',
        },
    });

    if (!response.ok) {
        throw new Error(`DuckDuckGo search failed with HTTP ${response.status}`);
    }

    return parseDuckDuckGoHtml(await response.text()).slice(0, Math.max(maxResults, 0));
}
