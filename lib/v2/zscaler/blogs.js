const got = require('@/utils/got');

module.exports = async (ctx) => {
    const sitemapUrl = 'https://www.zscaler.com/sitemap.xml';
    const targetUrl = 'https://www.zscaler.com/blogs';

    const response = await got(sitemapUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
    });

    // Parse all <url> blocks from sitemap and filter /blogs/ paths
    const urlBlocks = response.body.match(/<url>[\s\S]*?<\/url>/g) || [];
    const blogEntries = [];

    for (const block of urlBlocks) {
        const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
        const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
        if (!locMatch) {
            continue;
        }
        const loc = locMatch[1];
        if (!loc.includes('/blogs/')) {
            continue;
        }
        blogEntries.push({
            loc,
            lastmod: lastmodMatch ? lastmodMatch[1] : null,
        });
    }

    // Sort by lastmod (newest first)
    blogEntries.sort((a, b) => {
        if (!a.lastmod && !b.lastmod) {
            return 0;
        }
        if (!a.lastmod) {
            return 1;
        }
        if (!b.lastmod) {
            return -1;
        }
        return new Date(b.lastmod) - new Date(a.lastmod);
    });

    const items = blogEntries.slice(0, 30).map((entry) => {
        // Derive title from URL slug: /blogs/category/slug -> "Slug Words"
        const slugParts = entry.loc.replace('https://www.zscaler.com/blogs/', '').split('/');
        const slug = slugParts[slugParts.length - 1] || slugParts[0];
        const title = slug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        const category = slugParts.length > 1 ? slugParts[0].replace(/-/g, ' ') : 'Blog';

        return {
            title,
            description: `<p><strong>${category}</strong>: ${title}</p>`,
            link: entry.loc,
            guid: entry.loc,
            pubDate: entry.lastmod ? new Date(entry.lastmod).toUTCString() : new Date().toUTCString(),
        };
    });

    ctx.state.data = {
        title: 'Zscaler Blogs',
        link: targetUrl,
        description: 'Security & Cloud Blogs from Zscaler',
        item: items,
    };
};
