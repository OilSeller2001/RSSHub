const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const targetUrl = 'https://www.zscaler.com/blogs';

    const response = await got(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    });

    const $ = cheerio.load(response.data);
    const items = [];
    const seenLinks = new Set();
    const now = Date.now();

    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();

        if (
            title.length > 15 &&
            (href.includes('/blogs/') || href.includes('/news-press/')) &&
            !href.endsWith('/blogs') &&
            !href.startsWith('tel:') &&
            !href.startsWith('#')
        ) {
            const link = new URL(href, 'https://www.zscaler.com').href;
            if (!seenLinks.has(link)) {
                seenLinks.add(link);
                const index = items.length;
                items.push({
                    title,
                    description: `<p>${title} - Zscaler Cybersecurity & Cloud Blog.</p>`,
                    link,
                    guid: link,
                    pubDate: new Date(now - index * 60 * 1000).toUTCString(),
                });
            }
        }
    });

    ctx.state.data = {
        title: 'Zscaler Blogs',
        link: targetUrl,
        description: 'Security & Cloud Blogs from Zscaler',
        item: items.slice(0, 30),
    };
};
