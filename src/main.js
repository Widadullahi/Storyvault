/**
 * StoryVault Africa — Historical & Cultural Research Actor
 *
 * Takes a research topic, collects public web sources via the Google Search
 * Scraper actor, organizes them into a structured research pack, and pushes it
 * to the default dataset. Monetized with Apify Pay-Per-Event (PPE) pricing:
 * every research pack delivered to the dataset is charged via the
 * "research-pack" event.
 */
import { Actor } from 'apify';
import {log} from "crawlee"

import { buildResearchPack } from './organize.js';

// Constants used across the actor.
const SEARCH_ACTOR_ID = 'apify/google-search-scraper';
const RESEARCH_PACK_EVENT = 'research-pack';

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


log.info(`Starting research for topic: "${cleanTopic}"`);

// Collect public web sources. `queries` must be an array for this actor.
const searchInput = {
    queries: [cleanTopic],
    maxPagesPerQuery: 1,
    resultsPerPage: Math.min(Math.max(maxResults, 1), 20),
};

let organicResults = [];

// When running locally with `apify run`, calling another actor requires the
// APIFY_TOKEN environment variable (set in .env or the shell).
try {
    log.info('Running Google Search Scraper actor...');
    const run = await Actor.call(SEARCH_ACTOR_ID, searchInput, { memoryMbytes: 1024 });
    const { items } = await Actor.getDataSet(run.defaultDatasetId);
    organicResults = items[0]?.organicResults ?? [];
    log.info(`Retrieved ${organicResults.length} raw results.`);
} catch (err) {
    Actor.log.error(`Failed to collect sources: ${err.message}`);
    throw new Error(
        'Could not collect public sources. Ensure APIFY_TOKEN is set when running locally, and that the run budget allows calling the Google Search Scraper actor.',
    );
}

if (organicResults.length === 0) {
    Actor.log.warning('No organic results found for this topic — pushing an empty research pack.');
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
