import type { Context } from 'hono';

import type { Data, DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import logger from '@/utils/logger';

export const handler = async (ctx: Context): Promise<Data> => {
    const limit = Number(ctx.req.query('limit') ?? '20');
    const targetUrl = 'https://www.perplexity.ai/discover';

    logger.http(`Fetching Perplexity Discover via Jina AI Reader from ${targetUrl}`);

    // 使用 Jina AI Reader API 繞過 Cloudflare
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const response = await fetch(jinaUrl, {
        headers: {
            'X-With-Generated-Alt': 'true',
            'X-Return-Format': 'markdown',
        },
    });

    if (!response.ok) {
        logger.error(`Jina AI Reader failed: ${response.status} ${response.statusText}`);
        return {
            title: 'Perplexity Discover',
            link: targetUrl,
            description: 'Failed to fetch Perplexity Discover',
            item: [],
        };
    }

    const markdown = await response.text();
    logger.http(`Jina AI Reader returned ${markdown.length} characters`);

    // 解析 markdown，提取文章連結
    // 格式: [...content...](https://www.perplexity.ai/discover/top/slug)
    const items: DataItem[] = [];
    const seenLinks = new Set<string>();

    // 匹配文章連結 - 找到所有包含 discover/top 的連結
    const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.perplexity\.ai\/discover\/top\/[^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(markdown)) !== null) {
        const content = match[1];
        const link = match[2];

        if (!link || seenLinks.has(link)) continue;
        if (link === targetUrl) continue;

        seenLinks.add(link);

        // 從 content 中提取標題
        // 格式: ![Image N: TITLE](url) TITLE Published X hours ago SUMMARY ... N sources
        const titleMatch = content.match(/!\[Image \d+: ([^\]]+)\]\(/);
        const rawTitle = titleMatch ? titleMatch[1] : '';

        // 嘗試從第一個非圖片的文本中提取標題
        const textWithoutImages = content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
        const textLines = textWithoutImages.split(/\s+/).filter(line => line.length > 0);

        // 標題通常在第一個 "Published" 之前
        let title = '';
        let summary = '';
        let pubDate = '';

        for (let i = 0; i < textLines.length; i++) {
            const line = textLines[i];
            if (line.match(/^Published$/i) || line.match(/^\d+\s*hours?\s*ago$/i) || line.match(/^Aug|Jul|Jun/)) {
                // 找到日期，之前的是標題
                title = textLines.slice(0, i).join(' ');
                // 之後的是摘要
                summary = textLines.slice(i + 1).join(' ').replace(/\d+\s*sources?/gi, '').trim();
                break;
            }
        }

        if (!title) {
            // fallback: 使用 rawTitle 或第一行
            title = rawTitle || textLines[0]?.substring(0, 100) || 'Perplexity Discover';
        }

        // 清理標題
        title = title
            .replace(/Published\s+\d+\s*(hours?|days?)/gi, '')
            .replace(/Published\s+(Aug|Jul|Jun|May|Apr|Mar|Feb|Jan)\s+\d+,\s*\d{4}/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!title || title.length < 3) continue;

        items.push({
            title,
            description: summary || '',
            link,
            guid: `perplexity-discover-${link}`,
            id: `perplexity-discover-${link}`,
        });
    }

    logger.http(`Found ${items.length} items`);

    return {
        title: 'Perplexity Discover',
        link: targetUrl,
        description: 'Trending topics and news from Perplexity',
        item: items.slice(0, limit),
        allowEmpty: true,
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
        requirePuppeteer: false, // 不需要 Puppeteer！
        antiCrawler: false,
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
