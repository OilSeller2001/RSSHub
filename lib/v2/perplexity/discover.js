const logger = require('../../utils/logger');

module.exports = async (ctx) => {
    const limit = Number.parseInt(ctx.query.limit || '20');
    const targetUrl = 'https://www.perplexity.ai/discover';

    logger.http(`Fetching Perplexity Discover via Jina AI Reader from ${targetUrl}`);

    const jinaKey = ctx.query.jina_key || process.env.JINA_API_KEY;
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    if (jinaKey) {
        headers.Authorization = `Bearer ${jinaKey}`;
    }

    const response = await fetch(jinaUrl, { headers });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `${response.status} ${response.statusText}`;
        try {
            const errJson = JSON.parse(errorText);
            if (errJson.readableMessage) {
                errorMsg = errJson.readableMessage;
            } else if (errJson.message) {
                errorMsg = errJson.message;
            }
        } catch {
            // ignore json parse error
        }
        logger.error(`Jina AI Reader failed: ${errorMsg}`);
        throw new Error(`Jina AI Reader failed: ${errorMsg}`);
    }

    const markdown = await response.text();
    logger.http(`Jina AI Reader returned ${markdown.length} characters`);

    if (markdown.includes('Just a moment...') || markdown.includes('Cloudflare') || markdown.includes('AbuseAlleviationError')) {
        const hasKey = Boolean(jinaKey);
        logger.error(`Jina AI Reader returned Cloudflare challenge (API Key set: ${hasKey})`);
        throw new Error(
            hasKey
                ? `Jina AI Reader was blocked by Perplexity Cloudflare protection despite using Jina API Key. Please verify your Jina API Key.`
                : `Jina AI Reader was blocked by Perplexity Cloudflare protection (Response: Cloudflare Security Check). Please set JINA_API_KEY in Vercel Environment Variables or pass ?jina_key=YOUR_KEY.`
        );
    }

    const items = [];
    const seenLinks = new Set();

    // 匹配 Markdown 中的 discover 文章卡片：[ content ]( https://www.perplexity.ai/discover/... )
    const linkRegex = /\[([\s\S]*?)\]\((https:\/\/www\.perplexity\.ai\/discover\/[^\s)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(markdown)) !== null) {
        const rawContent = match[1];
        const link = match[2];

        if (!link || seenLinks.has(link) || link === targetUrl) continue;
        seenLinks.add(link);

        // 提取圖片連結與 Alt
        const imgMatch = rawContent.match(/!\[(?:Image \d+:\s*)?([^\]]*)\]\((https:\/\/[^)]+)\)/);
        const imgAlt = imgMatch ? imgMatch[1].trim() : '';
        const imgSrc = imgMatch ? imgMatch[2].trim() : '';

        // 去除圖片後的純文字內容
        const textOnly = rawContent.replace(/!\[.*?\]\(.*?\)/g, '').trim();

        // 提取標題與內文摘要
        let title = imgAlt;
        let summary = '';

        if (textOnly) {
            const pubIndex = textOnly.search(/\b(Published|\d+\s*hours?\s*ago|\d+\s*sources?)\b/i);
            if (pubIndex !== -1) {
                if (!title) {
                    title = textOnly.substring(0, pubIndex).trim();
                }
                summary = textOnly.substring(pubIndex).replace(/Published\s+[^.]*?ago/gi, '').replace(/\d+\s*sources?/gi, '').trim();
            } else if (!title) {
                const lines = textOnly.split('\n').map(l => l.trim()).filter(Boolean);
                title = lines[0] || 'Perplexity Discover';
                summary = lines.slice(1).join(' ');
            }
        }

        title = (title || 'Perplexity Discover Topic')
            .replace(/\s+/g, ' ')
            .trim();

        if (title.length < 3) continue;

        let description = '';
        if (imgSrc) {
            description += `<img src="${imgSrc}"><br><br>`;
        }
        if (summary) {
            description += `<p>${summary}</p>`;
        } else {
            description += `<p>${title}</p>`;
        }

        items.push({
            title,
            description,
            link,
            guid: `perplexity-discover-${link}`,
        });
    }

    if (items.length === 0) {
        const hasKey = Boolean(jinaKey);
        throw new Error(
            `No Perplexity Discover topics could be parsed from Jina AI Reader response (Jina API Key set: ${hasKey}). Please ensure JINA_API_KEY is configured in Vercel Environment Variables or pass ?jina_key=YOUR_KEY.`
        );
    }

    ctx.state.data = {
        title: 'Perplexity Discover',
        link: targetUrl,
        description: 'Trending topics and news from Perplexity Discover',
        item: items.slice(0, limit),
    };
};
