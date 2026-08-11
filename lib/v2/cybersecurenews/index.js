const parser = require('@/utils/rss-parser');

module.exports = async (ctx) => {
    const feed = await parser.parseURL('https://cybersecurenews.com.tw/feed/');

    ctx.state.data = {
        title: '資安新聞網 CyberSecure News',
        link: 'https://cybersecurenews.com.tw/',
        description: 'CyberSecure News 臺灣資安新聞最新報導',
        item: feed.items.map((item) => ({
            title: item.title,
            description: item.content || item.contentSnippet || item.title,
            link: item.link,
            guid: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        })),
    };
};
