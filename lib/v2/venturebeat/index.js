const parser = require('@/utils/rss-parser');

module.exports = async (ctx) => {
    const feed = await parser.parseURL('https://venturebeat.com/feed/');

    ctx.state.data = {
        title: 'VentureBeat',
        link: 'https://venturebeat.com/',
        description: 'Transformative tech news that matters',
        item: feed.items.map((item) => ({
            title: item.title,
            description: item.content || item.contentSnippet || item.title,
            link: item.link,
            guid: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate).toUTCString() : new Date().toUTCString(),
        })),
    };
};
