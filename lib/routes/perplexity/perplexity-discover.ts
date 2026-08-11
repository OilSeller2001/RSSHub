import { load } from 'cheerio';
import type { Context } from 'hono';
import type { Data, DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import logger from '@/utils/logger';
import { getPlaywrightPage } from '@/utils/playwright';

export const handler = async (ctx: Context): Promise<Data> => {
    const limit = Number(ctx.req.query('limit') ?? '20');
    const targetUrl = 'https://www.perplexity.ai/discover';

    logger.http(`Fetching Perplexity Discover from ${targetUrl}`);

    const { page, destroy, context } = await getPlaywrightPage(targetUrl, {
        onBeforeLoad: async (page) => {
            await page.route('**/*', (route) => {
                const request = route.request();
                request.resourceType() === 'document' ? route.continue() : route.abort();
            });
        },
        antiCrawler: true,
    });

    await page.waitForTimeout(5000);

    const html = await page.evaluate(() => document.documentElement.getHTML());
    const $ = load(html);
    const language = $('html').attr('lang') ?? 'en';

    const items: DataItem[] = [];
    const seenLinks = new Set<string>();

    const links = $('a[href]').toArray();

    for (const elem of links) {
        const $link = $(elem);
        const href = $link.attr('href');
        if (!href) continue;
        if (!href.includes('perplexity.ai')) continue;
        if (href.startsWith('http') === false && !href.startsWith('/')) continue;

        const fullLink = href.startsWith('http') ? href : `https://www.perplexity.ai${href}`;
        if (seenLinks.has(fullLink)) continue;
        if (fullLink === targetUrl) continue;

        const titleEl = $link.find('h1, h2, h3, h4, [data-framer-name="Title"]').first();
        const title = titleEl.text().trim() || $link.text().trim().substring(0, 100);
        if (!title || title.length < 3) continue;

        const summaryEl = $link.find('p, [data-framer-name="Description"], [data-framer-name="Summary"]').first();
        const summary = summaryEl.text().trim().substring(0, 300);

        seenLinks.add(fullLink);
        items.push({
            title,
            description: summary,
            link: fullLink,
            guid: `perplexity-discover-${fullLink}`,
            id: `perplexity-discover-${fullLink}`,
        });
    }

    const resultItems = await Promise.all(
        items.slice(0, limit).map(async (item) => {
            if (!item.link) return item;
            return await cache.tryGet(item.link, async () => {
                const contentPage = await context.newPage();
                await contentPage.route('**/*', (route) => {
                    const request = route.request();
                    request.resourceType() === 'document' ? route.continue() : route.abort();
                });
                try {
                    await contentPage.goto(item.link!, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    await contentPage.waitForTimeout(2000);
                    const contentHtml = await contentPage.evaluate(() => document.documentElement.getHTML());
                    const $content = load(contentHtml);
                    const articleContent = $content('div#main > div > div > div[data-framer-component-type="RichTextContainer"]').first();
                    if (articleContent.length) {
                        item.description = articleContent.html()?.trim() || item.description;
                    }
                } catch (e) {
                    logger.error(`Failed to fetch ${item.link}: ${e.message}`);
                }
                await contentPage.close();
                return item;
            }, 3600, false);
        })
    );

    await destroy();

    return {
        title: $('title').text() || 'Perplexity Discover',
        description: $('meta[name="description"], meta[property="og:description"]').first().attr('content') || 'Trending topics and news from Perplexity',
        link: targetUrl,
        item: resultItems,
        allowEmpty: true,
        image: $('meta[property="og:image"]').attr('content'),
        language: language as 'en',
    };
};

export const route: Route = {
    path: '/discover',
    name: 'Discover',
    url: 'www.perplexity.ai',
    maintainers: ['OilSeller2001'],
    handler,
    example: '/perplexity/discover',
    description: 'Subscribe to Perplexity Discover for trending topics and news.',
    categories: ['news'],
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: true,
        supportRadar: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.perplexity.ai/discover'],
            target: '/discover',
        },
    ],
    view: ViewType.Articles,
};
