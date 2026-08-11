const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const targetUrl = 'https://threatlabz.zscaler.com/';

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

        if (title.length > 12 && !href.startsWith('#') && !href.startsWith('javascript:')) {
            const link = new URL(href, targetUrl).href;
            if (!seenLinks.has(link) && link !== targetUrl && link.includes('zscaler')) {
                seenLinks.add(link);
                items.push({
                    title,
                    link,
                    guid: link,
                    pubDate: new Date().toISOString(),
                });
            }
        }
    });

    ctx.state.data = {
        title: 'Zscaler ThreatLabz Blogs',
        link: targetUrl,
        description: 'Security & Cloud Blogs from Zscaler ThreatLabz',
        item: items.slice(0, 30),
    };
};
