const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const targetUrl = 'https://www.zscaler.com/blogs';

    const response = await got(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(response.data);
    const items = [];
    const seenLinks = new Set();

    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();

        if (title.length > 15 && href.includes('/blogs/')) {
            const link = new URL(href, 'https://www.zscaler.com').href;
            if (!seenLinks.has(link) && link !== targetUrl) {
                seenLinks.add(link);
                items.push({
                    title,
                    link,
                    guid: link,
                    pubDate: new Date().toUTCString(),
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
