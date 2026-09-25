/**
 * StoryVault Africa — Historical & Cultural Research Actor
 *
 * Takes a research topic, collects public web sources via the Google Search
 * Scraper actor, organizes them into a structured research pack, and pushes it
 * to the default dataset. Monetized with Apify Pay-Per-Event (PPE) pricing:
 * every research pack delivered to the dataset is charged via the
 * "research-pack" event.
 */
import { Actor, Configuration, log } from 'apify';

import { buildResearchPack } from './organize.js';
import { fetchDuckDuckGoResults } from './search.js';

// Constants used across the actor.
const SEARCH_ACTOR_ID = 'apify/google-search-scraper';
const RESEARCH_PACK_EVENT = 'research-pack';

// Keep previous runs' results: with the default purgeOnStart=true the local
// dataset is emptied at every start, so a new run would overwrite the previous
// research pack instead of appending a new dataset item. On the Apify platform
// this setting has no effect (storage is per-run there anyway).
Configuration.getGlobalConfig().set('purgeOnStart', false);

// The init() call configures the Actor to work with the Apify platform storage.
await Actor.init();


// await Actor.pushData({
//     message: 'StoryVault Africa — Historical & Cultural Research Actor',
//     version: process.env.npm_package_version,
//     timestamp: new Date().toISOString(),
// });

// await Actor.exit()


// const {
//     topic,
//     maxResults = 10,
// } = (await Actor.getInput()) ?? {};


const input = await Actor.getInput();
const topic = input?.topic;
const maxResults = input?.maxResults ?? 10;

const cleanTopic = topic?.trim();

if (!cleanTopic) {
    log.error('Input must include a non-empty "topic" string.');
    await Actor.exit({ statusMessage: 'Missing required input: topic' });
}

log.info(`Starting research for topic: "${cleanTopic}"`);

// Collect public web sources. `queries` must be an array for this actor.
const searchInput = {
    queries: [cleanTopic],
    maxPagesPerQuery: 1,
    resultsPerPage: Math.min(Math.max(maxResults, 1), 20),
};

let organicResults = [];

// Preferred source: the paid Google Search Scraper actor. When it is not
// available (e.g. the account cannot be charged for it), fall back to a free
// DuckDuckGo HTML search so the run is not blocked.
try {
    log.info('Running Google Search Scraper actor...');
    const run = await Actor.call(SEARCH_ACTOR_ID, searchInput);
    const { items } = await Actor.getDataSet(run.defaultDatasetId);
    organicResults = items[0]?.organicResults ?? [];
    log.info(`Retrieved ${organicResults.length} raw results from Google.`);
} catch (googleError) {
    log.warning(
        `Google Search Scraper unavailable (${googleError.message}). Falling back to free DuckDuckGo search.`,
    );
    try {
        organicResults = await fetchDuckDuckGoResults(cleanTopic, Math.min(Math.max(maxResults, 1), 20));
        log.info(`Retrieved ${organicResults.length} raw results from DuckDuckGo.`);
    } catch (ddgError) {
        log.error(`DuckDuckGo fallback failed: ${ddgError.message}`);
        throw new Error(
            'Could not collect public sources: both the Google Search Scraper actor and the DuckDuckGo fallback failed.',
        );
    }
}

if (organicResults.length === 0) {
    log.warning('No organic results found for this topic — pushing an empty research pack.');
}

// Organize the raw results into the research pack structure.
const researchPack = buildResearchPack(cleanTopic, organicResults);

// Push data and charge the PPE event in one call: the user is only billed for
// research packs that actually exist in the dataset. ChargeResult tells us
// whether the user's spending limit allows more charges.
const chargeResult = await Actor.pushData(researchPack, RESEARCH_PACK_EVENT);

if (chargeResult?.eventChargeLimitReached) {
    log.info('User spending limit reached — finishing the run.');
}

log.info(`Research pack for "${cleanTopic}" delivered. Done.`);

// Gracefully exit the Actor process.
await Actor.exit();
