module.exports = {
    'npmjs.com': {
        _name: 'npm',
        '.': [
            {
                title: '包',
                docs: 'https://docs.rsshub.app/routes/program-update#npm',
                source: ['/package/:name'],
                target: '/npm/package/:name',
            },
        ],
    },
};
