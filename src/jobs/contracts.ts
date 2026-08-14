export type JobName="CollectSourcesJob"|"NormalizeSourceItemsJob"|"ClusterTopicsJob"|"ScoreTopicsJob"|"GenerateIdeasJob"|"RankIdeasJob"|"DraftContentJob"|"GenerateVideoJob"|"PublishPostJob"|"CollectMetricsJob";
export interface Job<T=unknown>{name:JobName;run(payload:T):Promise<void>}
