const got = require('@/utils/got');
const config = require('@/config');

module.exports = async (ctx) => {
    const targetUrl = 'https://threatlabz.zscaler.com/';
    const jinaKey = ctx.query.jina_key || config.jinaApiKey || process.env.JINA_API_KEY;
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    };
    if (jinaKey) {
        headers['Authorization'] = `Bearer ${jinaKey}`;
    }

    const response = await got(jinaUrl, { headers });
    const md = response.data;

    const items = [];
    const seenLinks = new Set();
    const now = Date.now();

    const linkRegex = /\[([\s\S]*?)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(md)) !== null) {
        const title = match[1].replace(/!\[.*?\]\(.*?\)/g, '').trim();
        const link = match[2];

        if (
            title.length > 15 &&
            !seenLinks.has(link) &&
            link.includes('zscaler') &&
            !link.endsWith('.jpg') &&
            !link.endsWith('.png') &&
            !link.includes('dashboard')
        ) {
            seenLinks.add(link);
            const index = items.length;
            items.push({
                title,
                description: `<p>${title} - Zscaler ThreatLabz research analysis.</p>`,
                link,
                guid: link,
                pubDate: new Date(now - index * 60 * 1000).toUTCString(),
            });
        }
    }

    ctx.state.data = {
        title: 'Zscaler ThreatLabz Blogs',
        link: targetUrl,
        description: 'Security & Cloud Blogs from Zscaler ThreatLabz',
        item: items.slice(0, 30),
    };
};
