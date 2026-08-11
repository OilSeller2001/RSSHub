const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const category = ctx.params.category || '';
    const targetUrl = category === 'ai' || category === 'hub-artificial-intelligence'
        ? 'https://www.scworld.com/hub-artificial-intelligence'
        : 'https://www.scworld.com/';

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
            (href.startsWith('/news/') || href.startsWith('/perspective/') || href.startsWith('/brief/') || href.startsWith('/analysis/') || href.startsWith('/resource/'))
        ) {
            const link = new URL(href, 'https://www.scworld.com').href;
            if (!seenLinks.has(link)) {
                seenLinks.add(link);
                const index = items.length;
                items.push({
                    title,
                    description: `<p>${title} - Full article on SC World.</p>`,
                    link,
                    guid: link,
                    pubDate: new Date(now - index * 60 * 1000).toUTCString(),
                });
            }
        }
    });

    ctx.state.data = {
        title: category ? `SC World - ${category.toUpperCase()}` : 'SC World',
        link: targetUrl,
        description: 'SC World Cybersecurity News',
        item: items.slice(0, 30),
    };
};
