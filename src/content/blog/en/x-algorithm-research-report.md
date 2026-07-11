---
translationKey: "x-algorithm-research-report"
locale: "en"
title: "X Algorithm in-depth research report: X/Twitter recommendation system open source analysis"
description: "Sort out the components, data flow and engineering implementation of the X recommendation system based on the public warehouse."
publishedAt: "2026-01-20"
updatedAt: "2026-01-20"
category: "algorithm"
sourceLocale: "zh"
sourceUrl: "https://github.com/xai-org/x-algorithm"
sourceAuthor: "xAI"
contentType: "translation"
translationStatus: "draft"
---

---

*Published on January 20, 2026*
*Project: [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) | Research Tools: Claude Code + DeepWiki*

---

## introduction

In January 2025, xAI open sourced the core recommendation engine of the X (formerly Twitter) "For You" information flow recommendation system - **X Algorithm**. This is a landmark open source event because it demonstrates the complete architecture of an industrial-scale large-scale recommendation system to the public for the first time.

This article is based on an in-depth study of the [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) project and provides a comprehensive analysis from multiple dimensions such as system architecture, core components, and ML model design.

## Project overview

### Core functions

| Function module | Description |
|---------|------|
| **In-Network Content** | Tweets from accounts a user follows |
| **Out-of-Network Content** | Global corpus of tweets discovered through ML |
| **Personalized sorting** | User engagement prediction based on Grok Transformer |
| **Real-time recommendation** | Recommendation service that supports millisecond response |

### technology stack

- **Programming Language**: Rust
- **Machine Learning**: Python (Phoenix ML component)
- **Communication Protocol**: gRPC
- **Message Queue**: Kafka
- **Architecture Pattern**: Microservice Architecture

---

## System architecture

### Overall architecture diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端请求                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ gRPC: ScoredPostsService
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Home Mixer                                 │
│                      (编排层/Orchestrator)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Thunder    │  │   Phoenix    │  │  各种外部服务   │
│  (In-Network)│  │ (Out-of-Net) │  │  ( enrichment) │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Four core subsystems

| Subsystem | Responsibilities |
|--------|------|
| **Home Mixer** | Orchestration layer, implements `ScoredPostsService` gRPC endpoint, coordinates the entire recommendation pipeline |
| **Thunder** | In-memory tweet storage, providing real-time access to tweets from accounts you follow |
| **Phoenix** | ML subsystem that handles OON tweet retrieval and ranking of all candidate tweets |
| **Candidate Pipeline Framework** | A general reusable framework that defines Trait abstractions for each stage of the recommendation pipeline |

---

## Candidate Pipeline Framework

### Core Trait Definition

```rust
// 候选推文来源
pub trait Source<Q, C> {
    async fn fetch(&self, query: &Q) -> Result<Vec<C>>;
}

// 候选推文丰富器
pub trait Hydrator<Q, C> {
    async fn hydrate(&self, query: &Q, candidates: &mut Vec<C>) -> Result<()>;
}

// 候选推文过滤器
pub trait Filter<Q, C> {
    fn filter(&self, query: &Q, candidates: Vec<C>) -> FilterResult<C>;
}

// 候选推文打分器
pub trait Scorer<Q, C> {
    async fn score(&self, query: &Q, candidates: &mut Vec<C>) -> Result<()>;
}

// 候选推文选择器
pub trait Selector<Q, C> {
    fn select(&self, candidates: Vec<C>) -> Vec<C>;
}

// 副作用处理器
pub trait SideEffect<Q, C> {
    async fn run(&self, query: &Q, candidates: &[C]) -> Result<()>;
}
```

### Pipeline execution process

```
1. Query Hydration (并行)
   ├── UserActionSeqQueryHydrator
   └── UserFeaturesQueryHydrator

2. Sourcing (并行)
   ├── PhoenixSource (OON 推文)
   └── ThunderSource (In-Network 推文)

3. Candidate Hydration (并行)
   ├── CoreDataCandidateHydrator
   ├── VideoDurationCandidateHydrator
   ├── GizmoduckCandidateHydrator
   ├── SubscriptionHydrator
   └── InNetworkCandidateHydrator

4. Pre-Scoring Filtering (顺序)
   ├── DropDuplicatesFilter
   ├── CoreDataHydrationFilter
   ├── AgeFilter
   ├── SelfTweetFilter
   ├── RetweetDeduplicationFilter
   ├── IneligibleSubscriptionFilter
   ├── PreviouslySeenPostsFilter
   ├── PreviouslyServedPostsFilter
   ├── MutedKeywordFilter
   └── AuthorSocialgraphFilter

5. Scoring (顺序)
   ├── PhoenixScorer (ML 预测)
   ├── WeightedScorer (加权评分)
   ├── AuthorDiversityScorer (作者多样性)
   └── OONScorer (OON 权重调整)

6. Selection (同步)
   └── TopKSelector (选择 Top-K)

7. Post-Selection Hydration (并行)
   └── VFCandidateHydrator (可见性过滤)

8. Post-Selection Filtering (顺序)
   ├── VFFilter
   └── DedupConversationFilter

9. Side Effects (异步,不阻塞响应)
   └── CacheRequestInfoSideEffect
```

---

## Phoenix ML System

### Two-Tower retrieval model

**Architecture Design**:

```
User Tower                    Candidate Tower
┌──────────────┐             ┌──────────────┐
│ User Features │             │ Tweet Embed  │
│              │             │ Author Embed │
│    Transformer│             │              │
│              │             │ Linear(1)    │
│   [User Embed]│             │ SiLU         │
└──────────────┘             │ Linear(2)    │
                             │ L2 Normalize │
                             │ [Cand Embed] │
                             └──────────────┘

        Dot Product Similarity Search → Top-K Candidates
```

**Technical Details**:

- **User Tower**: Encode user characteristics and engagement history using Transformer architecture
- **Candidate Tower**: Two-layer linear network + SiLU activation + L2 normalization
- **Search method**: Dot product similarity search, quickly obtain Top-K candidates

### Grok-based Transformer sorting model

**Core Innovation**:

1. **Candidate Isolation Attention Masking** (Candidate Isolation Attention Masking)
   - The score of each candidate tweet is calculated independently
   - Prevent information leakage between candidates
   -Supports score caching and consistency

2. **Multi-Action Prediction** (Multi-Action Prediction)

| Action type | Predicted target |
|---------|---------|
| `P(favorite)` | Like probability |
| `P(reply)` | Reply probability |
| `P(repost)` | Repost probability |
| `P(click)` | Click probability |
| `P(not_interested)` | Probability of not interested |
| `P(block_author)` | Block author probability |
| `P(vqv)` | Video quality viewing probability |

**Key Features**: "No Hand-Engineered Features"
- Completely relies on Transformer to learn correlation patterns
- No need to manually design feature combinations

---

## Technical highlights and innovations

### 1. Candidate Isolation Attention Mask

**Problem**: In traditional Transformer batch processing, candidates may interact with each other, resulting in inconsistent scores.

**Solution**:
- Use special attention masks to prevent attention between candidates
- Each candidate can only focus on user context and history
- Ratings are independent and cacheable

**Advantages**:
1. **Scoring Consistency**: Candidate scoring is not affected by other candidates
2. **Cacheability**: The same candidate has the same score in different requests
3. **Parallelization**: Batch processing can still be executed in parallel

### 2. No manual feature engineering

**Traditional Method**: Requires manual design feature engineering, such as:
- Text features (TF-IDF, BM25)
- Social features (number of joint followers)
- Temporal characteristics (release time decay)

**X Algorithm method**:
- Completely relies on Grok Transformer for automatic learning
- Original features are directly input into the model
- The model autonomously learns feature combinations and weights

**Advantages**:
1. **Simplified Development**: No need for manual feature design and maintenance
2. **Adaptive**: The model can automatically adapt to changes in data distribution
3. **Expression ability**: Transformer’s expression ability far exceeds manual features

### 3. Multi-action prediction

| Method | Output | Advantages |
|------|------|------|
| **Single score** | `relevance_score` | Simple |
| **Multi-action prediction** | `P(fav)`, `P(reply)`, `P(repost)`, ... | Fine-grained, configurable optimization |

**Multi-action prediction advantages**:

1. **Fine-grained signals**: Different participation types have different values
2. **Negative feedback processing**: Explicitly model negative feedback such as `not_interested`, `block` etc.
3. **Flexible Optimization**: Different goals can be optimized through weight configuration

### 4. Highly modular pipeline framework

**Design Principles**:

1. **Trait-based abstraction**: Each stage is defined by Trait, easy to implement and extend
2. **Combining Parallelism and Sequence**: Automatically identify parallelizable stages to improve performance
3. **Asynchronous side effects**: Logs, caches, etc. do not block the main process
4. **Type Safety**: Rust’s type system ensures data flow consistency

### 5. Separation of retrieval and sorting

**Why Separation**:

1. **Efficiency**: Cannot run complex Transformer on millions of tweets
2. **Quality**: requires fine-grained sorting and cannot rely solely on similarity
3. **Maintainability**: Retrieval and sorting can be optimized independently

---

## External service integration

```
┌─────────────────────────────────────────────────────────────┐
│                      Home Mixer                              │
│                    (Orchestration Layer)                     │
└─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬──────┘
      │     │     │     │     │     │     │     │     │
      ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
  Thunder Phoenix TES  Gizmoduck VF  Strato   UAS   SocialGraph
```

| Services | Features | Protocol |
|------|------|------|
| **Thunder** | Memory tweet storage, providing real-time tweets from following accounts | gRPC |
| **Phoenix** | OON retrieval + candidate sorting | gRPC |
| **TES** | Tweet metadata service | gRPC |
| **Gizmoduck** | User profile data | gRPC |
| **VF** | Content security filtering | gRPC |
| **Strato** | Caching and signature storage | gRPC |
| **UAS** | User Engagement History | Internal Services |

---

## data model

### ScoredPostsQuery (request)

| Field | Type | Description |
|------|------|------|
| `user_id` | i64 | View user ID |
| `client_app_id` | String | Client application identification |
| `seen_ids` | Vec\<i64\> | List of seen tweet IDs |
| `served_ids` | Vec\<i64\> | List of served tweet IDs |
| `user_action_sequence` | UserActionSequence | User participation history |
| `user_features` | UserFeatures | User features |

### PostCandidate (candidate tweet)

| Field | Type | Source Component |
|------|------|---------|
| `tweet_id` | i64 | Source |
| `author_id` | i64 | CoreDataHydrator |
| `tweet_text` | String | CoreDataHydrator |
| `phoenix_scores` | PhoenixScores | PhoenixScorer |
| `weighted_score` | f32 | WeightedScorer |
| `score` | f32 | Final Score |

---

## Summary and Outlook

### System advantages

| Dimensions | Advantages |
|------|------|
| **Architecture** | Highly modular, easy to expand and maintain |
| **Performance** | Separation of retrieval and sorting, supporting millisecond response |
| **Effect** | Based on Grok Transformer, no manual feature engineering required |
| **Extensibility** | Trait-based design, pluggable components |
| **Engineering Practice** | Rust implementation, memory safety + high concurrency |

### Design patterns that can be learned from

1. **Candidate Isolation Attention Mask**: Applicable to any recommendation scenario that requires independent scoring
2. **Multi-action prediction**: Suitable for applications that need to optimize multiple participation indicators
3. **Retrieval-Ranking Separation**: General best practices for large-scale recommendation systems
4. **Trait-based pipeline framework**: can be used to build other recommendation/processing pipelines

### Potential improvements

1. **Online learning**: The current model seems to be trained offline, and online learning can be introduced to adapt to real-time changes.
2. **Multi-objective optimization**: Explicit modeling of diversity, novelty and other goals
3. **User Controllability**: Allow users to adjust recommendation preferences
4. **Cold start processing**: Special processing strategy for new users/new content
5. **A/B Testing Framework**: Built-in experimentation and evaluation framework

### Open source value

The open source of X Algorithm is of great significance:

1. **Industrial-level practice**: Demonstrates the real architecture of large-scale recommendation systems
2. **Transparency**: Increases the transparency and auditability of the recommendation algorithm
3. **Educational Value**: Provides valuable resources for learning and researching recommendation systems
4. **Community Contribution**: Allow the community to jointly improve the algorithm

---

## References

- **GitHub repository**: [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)
- **Grok-1 Model**: [xai-org/grok-1](https://github.com/xai-org/grok-1)
- **Wiki Documentation**: [DeepWiki - x-algorithm](https://deepwiki.com/wiki/xai-org/x-algorithm)

---

*The report is based on an in-depth analysis of the xAI open source x-algorithm project, aiming to provide a reference for recommendation system researchers and engineers. *

---
