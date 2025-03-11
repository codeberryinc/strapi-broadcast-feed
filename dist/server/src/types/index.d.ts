export interface BroadcastFeedConfig {
    feed: {
        collections: {
            uid: string;
        }[];
        pagination: {
            limit: number;
        };
        searchApproach?: 'pre-filtering' | 'fuzzysort' | 'hybrid';
    };
}
export interface FeedItem {
    id: number;
    publishedAt: string;
    collectionType: string;
    [key: string]: any;
}
