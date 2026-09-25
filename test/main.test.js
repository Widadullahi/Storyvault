import { describe, expect, it } from 'vitest';

import { buildResearchPack } from '../src/organize.js';

const sampleResults = [
    {
        title: 'Kingdom of Benin | Oxford History',
        description:
            'The Kingdom of Benin was a pre-colonial African state in what is now southern Nigeria. It flourished from the 13th century onward and is famous for the Benin Bronzes.',
        url: 'https://www.example.com/benin',
        displayedUrl: 'https://www.example.com/benin',
    },
    {
        title: 'Queen Idia of the Benin Empire',
        description:
            'Queen Idia was the mother of Oba Esigie, who ruled the Benin Empire in the sixteenth century.',
        url: 'https://www.example.org/idia',
        displayedUrl: 'https://www.example.org/idia',
    },
];

describe('buildResearchPack', () => {
    it('builds a structured research pack from raw search results', () => {
        const pack = buildResearchPack('The Benin Kingdom', sampleResults);

        expect(pack.topic).toBe('The Benin Kingdom');
        expect(pack.overview).toContain('Kingdom of Benin');
        expect(pack.timeline).toHaveLength(2);
        expect(pack.timeline[0]).toMatchObject({
            event: 'Kingdom of Benin | Oxford History',
            sourceUrl: 'https://www.example.com/benin',
        });
        expect(pack.sources[0].domain).toBe('example.com');
        expect(pack.entities.length).toBeGreaterThan(0);
        expect(pack.verificationNotes.length).toBeGreaterThan(0);
        expect(pack.generatedAt).toBeTruthy();
    });

    it('handles empty results gracefully', () => {
        const pack = buildResearchPack('Unknown Topic', []);
        expect(pack.overview).toContain('Unknown Topic');
        expect(pack.timeline).toHaveLength(0);
        expect(pack.sources).toHaveLength(0);
    });
});
