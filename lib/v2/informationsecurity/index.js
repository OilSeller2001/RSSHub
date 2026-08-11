const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const targetUrl = 'https://www.informationsecurity.com.tw/main/index.aspx';

    const response = await got(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
    });

    const $ = cheerio.load(response.data);
    const items = [];
    const seenLinks = new Set();
    const now = Date.now();

    $('a[href*="article_detail.aspx"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();

        if (
            title.length > 12 &&
            !title.startsWith('新聞') &&
            !title.startsWith('觀點') &&
            !title.startsWith('解決方案')
        ) {
            const link = new URL(href, 'https://www.informationsecurity.com.tw/article/').href;
            if (!seenLinks.has(link)) {
                seenLinks.add(link);
                const index = items.length;
                items.push({
                    title,
                    description: `<p>${title} - 閱讀台灣資訊安全網最新完整報導。</p>`,
                    link,
                    guid: link,
                    pubDate: new Date(now - index * 60 * 1000).toUTCString(),
                });
            }
        }
    });

    ctx.state.data = {
        title: '資訊安全網站 iSec TW',
        link: targetUrl,
        description: '台灣資訊安全網最新新聞與觀點',
        item: items.slice(0, 30),
    };
};
