/**
 * StoryVault Africa — organizes raw Google search results into a structured,
 * source-linked research pack.
 *
 * NOTE: This is heuristic organization of public search data, not AI-generated
 * narrative. Every claim must be verified against the linked sources by a human.
 */

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractSentences(text) {
    return String(text)
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 40);
}

/**
 * @param {string} text
 * @returns {{ name: string, type: string, description: string, sourceUrl: string }[]}
 */
function extractEntities(text) {
    const entities = [];
    const seen = new Set();

    const patterns = [
        { re: /\b(?:Kingdom|Empire|Civilization|Caliphate|Republic|Sultanate)\b/g, type: 'Polity' },
        { re: /\b(?:King|Queen|Emperor|Oba|Sultan|Alaafin|Ooni|Chief)\s+[A-Z][a-zA-Z'-]+/g, type: 'Historical figure' },
        { re: /\b(?:circa|c\.|around|in)\s(?:\d{1,2}(?:st|nd|rd|th)\s)?(?:century|\d{3,4}s?)/gi, type: 'Period reference' },
    ];

    for (const { re, type } of patterns) {
        for (const match of String(text).matchAll(re)) {
            const name = match[0].trim();
            const key = name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                entities.push({
                    name,
                    type,
                    description: `Mentioned in public sources related to this topic. Review spelling and historical identity against the linked sources.`,
                    sourceUrl: '',
                });
            }
        }
    }

    return entities.slice(0, 12);
}

/**
 * @param {{ title?: string, description?: string, url?: string, displayedUrl?: string }[]} results
 * @returns {{ date: string, event: string, description: string, sourceUrl: string }[]}
 */
function buildTimeline(results) {
    return results.slice(0, 8).map((item, index) => ({
        date: `Record #${index + 1}`,
        event: item.title || 'Historical document entry',
        description: item.description || 'Details compiled from indexed public records.',
        sourceUrl: item.url || '',
    }));
}

/**
 * @param {{ title?: string, description?: string, url?: string, displayedUrl?: string }[]} results
 * @returns {{ title: string, domain: string, url: string }[]}
 */
function buildSources(results) {
    return results.map((item) => {
        let domain = 'Public web source';
        try {
            domain = new URL(item.url).hostname.replace(/^www\./, '');
        } catch {
            /* keep fallback */
        }
        return {
            title: item.title || 'Public web source',
            domain,
            url: item.url || '',
        };
    });
}

/**
 * @param {string} topic
 * @param {{ title?: string, description?: string, url?: string, displayedUrl?: string }[]} results
 * @returns {{ topic: string, overview: string, timeline: object[], entities: object[], sources: object[], verificationNotes: string[], generatedAt: string }}
 */
export function buildResearchPack(topic, results) {
    const snippets = results.map((r) => `${r.title || ''} ${r.description || ''}`).join(' ');
    const sentences = extractSentences(snippets);

    const overview =
        sentences.slice(0, 4).join(' ') ||
        `Public web sources were collected for "${topic}". See the sources and verification notes for details.`;

    return {
        topic,
        overview,
        timeline: buildTimeline(results),
        entities: extractEntities(snippets),
        sources: buildSources(results),
        verificationNotes: [
            'All information was collected from public web search results and has NOT been independently verified.',
            'Cross-reference each claim against the linked original sources before academic, journalistic, or public use.',
            'Dates, names, and spellings in historical sources often conflict; treat conflicting records as unresolved.',
            'Entity names and period references are extracted heuristically and may include false positives.',
        ],
        generatedAt: new Date().toISOString(),
    };
}
