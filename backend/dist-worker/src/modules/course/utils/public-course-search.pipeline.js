import { CourseStatusEnum } from 'share-lib';
const ignoredMarkup = /<!--[\s\S]*?-->|<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]*>/gi;
const entities = [
    ['&nbsp;', ' '],
    ['&#160;', ' '],
    ['&#xA0;', ' '],
    ['&amp;', '&'],
    ['&quot;', '"'],
    ['&#39;', "'"],
    ['&apos;', "'"],
    ['&lt;', '<'],
    ['&gt;', '>'],
];
export function publicCourseDescriptionText(html) {
    return entities.reduce((text, [entity, replacement]) => text.replaceAll(entity, replacement), html.replace(ignoredMarkup, ' '));
}
export function courseTopicPattern(terms) {
    const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
    return `(?:^|[^\\p{L}\\p{N}_])(?:${escaped.join('|')})(?=$|[^\\p{L}\\p{N}_])`;
}
function descriptionTextExpression() {
    let text = {
        $reduce: {
            input: {
                $regexFindAll: {
                    input: { $ifNull: ['$description', ''] },
                    regex: `${ignoredMarkup.source}|([^<]+)`,
                    options: 'i',
                },
            },
            initialValue: '',
            in: {
                $concat: [
                    '$$value',
                    ' ',
                    { $ifNull: [{ $arrayElemAt: ['$$this.captures', 1] }, ''] },
                ],
            },
        },
    };
    for (const [entity, replacement] of entities) {
        text = { $replaceAll: { input: text, find: entity, replacement } };
    }
    return text;
}
function topicScore(pattern, multiplier) {
    return {
        $add: [
            ['$title', 80],
            ['$_searchTags', 60],
            ['$categoryName', 30],
            ['$_searchDescription', 10],
        ].map(([field, weight]) => ({
            $cond: [
                {
                    $regexMatch: {
                        input: { $ifNull: [field, ''] },
                        regex: pattern,
                        options: 'i',
                    },
                },
                weight * multiplier,
                0,
            ],
        })),
    };
}
export function publicCourseSearchPipeline(filters, categoryCollection) {
    const match = {
        status: CourseStatusEnum.PUBLISHED,
        deletedAt: null,
    };
    if (filters.level)
        match.level = filters.level;
    if (filters.isFree === true) {
        match.price = 0;
    }
    else {
        const price = { $gte: filters.minPrice ?? 0 };
        if (filters.isFree === false)
            price.$gt = 0;
        if (filters.maxPrice !== undefined) {
            price[filters.maxPriceExclusive ? '$lt' : '$lte'] = filters.maxPrice;
        }
        match.price = price;
    }
    const pipeline = [
        { $match: match },
        {
            $project: {
                title: 1,
                price: 1,
                level: 1,
                categoryId: 1,
                createdAt: 1,
                ...(filters.keyword ? { description: 1, tags: 1 } : {}),
            },
        },
        {
            $lookup: {
                from: categoryCollection,
                localField: 'categoryId',
                foreignField: '_id',
                pipeline: [
                    { $match: { isActive: true, deletedAt: null } },
                    { $project: { _id: 0, name: 1 } },
                ],
                as: '_searchCategory',
            },
        },
        {
            $set: {
                categoryName: {
                    $ifNull: [{ $arrayElemAt: ['$_searchCategory.name', 0] }, null],
                },
            },
        },
    ];
    if (filters.keyword) {
        const primary = courseTopicPattern([filters.keyword]);
        const related = filters.relatedKeywords?.length
            ? courseTopicPattern(filters.relatedKeywords)
            : undefined;
        pipeline.push({
            $set: {
                _searchDescription: descriptionTextExpression(),
                _searchTags: {
                    $reduce: {
                        input: { $cond: [{ $isArray: '$tags' }, '$tags', []] },
                        initialValue: '',
                        in: { $concat: ['$$value', ' ', '$$this'] },
                    },
                },
            },
        }, {
            $set: {
                _searchScore: {
                    $add: [
                        topicScore(primary, 100),
                        related ? topicScore(related, 1) : 0,
                    ],
                },
            },
        }, { $match: { _searchScore: { $gt: 0 } } });
    }
    pipeline.push({
        $project: {
            title: 1,
            price: 1,
            level: 1,
            categoryName: 1,
            createdAt: 1,
            ...(filters.keyword ? { _searchScore: 1 } : {}),
        },
    }, {
        $facet: {
            metadata: [{ $count: 'total' }],
            items: [
                {
                    $sort: {
                        ...(filters.keyword ? { _searchScore: -1 } : {}),
                        createdAt: -1,
                        _id: -1,
                    },
                },
                { $skip: (filters.page - 1) * filters.limit },
                { $limit: filters.limit },
                { $project: { title: 1, price: 1, level: 1, categoryName: 1 } },
            ],
        },
    });
    return pipeline;
}
//# sourceMappingURL=public-course-search.pipeline.js.map