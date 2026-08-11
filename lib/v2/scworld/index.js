const got = require('@/utils/got');
const config = require('@/config');

module.exports = async (ctx) => {
    const category = ctx.params.category || '';
    const targetUrl = category === 'ai' || category === 'hub-artificial-intelligence'
        ? 'https://www.scworld.com/hub-artificial-intelligence'
        : 'https://www.scworld.com/';

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

    const linkRegex = /\[([\s\S]*?)\]\((https:\/\/www\.scworld\.com\/[^\s)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(md)) !== null) {
        const title = match[1].replace(/!\[.*?\]\(.*?\)/g, '').trim();
        const link = match[2];

        if (
            title.length > 15 &&
            !seenLinks.has(link) &&
            (link.includes('/resource/') || link.includes('/brief/') || link.includes('/perspective/') || link.includes('/news/'))
        ) {
            seenLinks.add(link);
            const index = items.length;
            items.push({
                title,
                description: `<p>${title} - Full report available on SC World.</p>`,
                link,
                guid: link,
                pubDate: new Date(now - index * 60 * 1000).toUTCString(),
            });
        }
    }

    ctx.state.data = {
        title: category ? `SC World - ${category.toUpperCase()}` : 'SC World',
        link: targetUrl,
        description: 'SC World Cybersecurity News',
        item: items.slice(0, 30),
    };
};
