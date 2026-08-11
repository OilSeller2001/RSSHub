const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const targetUrl = 'https://cybersecurenews.com.tw/';

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

        if (title.length > 12 && href.includes('cybersecurenews.com.tw/')) {
            const link = href;
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
        title: '資安新聞網 CyberSecure News',
        link: targetUrl,
        description: 'CyberSecure News 臺灣資安新聞最新報導',
        item: items.slice(0, 30),
    };
};
