# Shikimori API Documentation

## Overview
Shikimori API has three versions:
- **GraphQL** (preferred)
- **v2** (outdated)
- **v1** (outdated)

## Base URLs
- GraphQL: `https://shikimori.io/api/graphql`
- v2 REST: `https://shikimori.io/api/v2/`
- v1 REST: `https://shikimori.io/api/v1/`

## Authentication
- OAuth2 authentication required for most operations
- User-Agent header must include your OAuth2 Application name
- API access limited to 5rps and 90rpm
- HTTPS only

## Important Notes
- **Do not parse the main site** - use API instead
- New anime/manga/character/person posters only available in GraphQL API
- Your IP may be banned without proper User-Agent header

## GraphQL Schema

### Main Queries

#### Animes
```graphql
animes(search: "bakemono", limit: 1, kind: "!special") {
  id
  malId
  name
  russian
  licenseNameRu
  english
  japanese
  synonyms
  kind
  rating
  score
  status
  episodes
  episodesAired
  duration
  airedOn {
    year
    month
    day
    date
  }
  releasedOn {
    year
    month
    day
    date
  }
  url
  season
  poster {
    id
    originalUrl
    mainUrl
  }
  fansubbers
  fandubbers
  licensors
  createdAt
  updatedAt
  nextEpisodeAt
  isCensored
  genres {
    id
    name
    russian
    kind
  }
  studios {
    id
    name
    imageUrl
  }
  externalLinks {
    id
    kind
    url
    createdAt
    updatedAt
  }
  personRoles {
    id
    rolesRu
    rolesEn
    person {
      id
      name
      poster {
        id
      }
    }
  }
  characterRoles {
    id
    rolesRu
    rolesEn
    character {
      id
      name
      poster {
        id
      }
    }
  }
  related {
    id
    anime {
      id
      name
    }
    manga {
      id
      name
    }
    relationKind
    relationText
  }
  videos {
    id
    url
    name
    kind
    playerUrl
    imageUrl
  }
  screenshots {
    id
    originalUrl
    x166Url
    x332Url
  }
  scoresStats {
    score
    count
  }
  statusesStats {
    status
    count
  }
  description
  descriptionHtml
  descriptionSource
}
```

#### Mangas
```graphql
mangas(limit: 1) {
  id
  malId
  name
  russian
  licenseNameRu
  english
  japanese
  synonyms
  kind
  score
  status
  volumes
  chapters
  airedOn { year month day date }
  releasedOn { year month day date }
  url
  poster { id originalUrl mainUrl }
  licensors
  createdAt
  updatedAt
  isCensored
  genres { id name russian kind }
  publishers { id name }
  externalLinks {
    id
    kind
    url
    createdAt
    updatedAt
  }
  personRoles {
    id
    rolesRu
    rolesEn
    person { id name poster { id } }
  }
  characterRoles {
    id
    rolesRu
    rolesEn
    character { id name poster { id } }
  }
  related {
    id
    anime {
      id
      name
    }
    manga {
      id
      name
    }
    relationKind
    relationText
  }
  scoresStats { score count }
  statusesStats { status count }
  description
  descriptionHtml
  descriptionSource
}
```

#### Characters
```graphql
characters(page: 1, limit: 1) {
  id
  malId
  name
  russian
  japanese
  synonyms
  url
  createdAt
  updatedAt
  isAnime
  isManga
  isRanobe
  poster { id originalUrl mainUrl }
  description
  descriptionHtml
  descriptionSource
}
```

#### People
```graphql
people(limit: 1) {
  id
  malId
  name
  russian
  japanese
  synonyms
  url
  isSeyu
  isMangaka
  isProducer
  website
  createdAt
  updatedAt
  birthOn { year month day date }
  deceasedOn { year month day date }
  poster { id originalUrl mainUrl }
}
```

#### User Rates
```graphql
userRates(page: 1, limit: 5, targetType: Anime, order: { field: updated_at, order: desc }) {
  id
  anime { id name }
  createdAt
}
```

### Variables Example
```graphql
query($ids: [ID!]) {
  characters(ids: $ids) {
    id
    name
  }
}
```

## REST API v2 Endpoints

### User Rates
- `GET /api/v2/user_rates` - List user rates
- `GET /api/v2/user_rates/:id` - Show user rate
- `POST /api/v2/user_rates` - Create user rate (requires user_rates scope)
- `PATCH /api/v2/user_rates/:id` - Update user rate (requires user_rates scope)
- `POST /api/v2/user_rates/:id/increment` - Increment episodes/chapters by 1 (requires user_rates scope)
- `DELETE /api/v2/user_rates/:id` - Destroy user rate (requires user_rates scope)

### Episode Notifications
- `POST /api/v2/episode_notifications` - Notify about anime episode release

### Abuse Requests
- `POST /api/v2/abuse_requests/offtopic` - Mark comment as offtopic
- `POST /api/v2/abuse_requests/review` - Convert comment to review
- `POST /api/v2/abuse_requests/abuse` - Create abuse about violation
- `POST /api/v2/abuse_requests/spoiler` - Create abuse about spoiler

### Topic Ignore
- `POST /api/v2/topics/:topic_id/ignore` - Ignore topic (requires topics scope)
- `DELETE /api/v2/topics/:topic_id/ignore` - Unignore topic (requires topics scope)

### User Ignore
- `POST /api/v2/users/:user_id/ignore` - Ignore user (requires ignores scope)
- `DELETE /api/v2/users/:user_id/ignore` - Unignore user (requires ignores scope)

## User Rate Statuses
- `planned` - Planned to Watch
- `watching` - Watching
- `rewatching` - Rewatching
- `completed` - Completed
- `on_hold` - On Hold
- `dropped` - Dropped

## Target Types
- `Anime`
- `Manga`

## Third-party Implementations
- Python: https://github.com/OlegWock/PyShiki
- Node.js: https://github.com/Capster/node-shikimori
- C#: https://github.com/JustRoxy/ShikimoriSharp
- Ruby: https://github.com/iwdt/shikikit

## OAuth2 Guide
https://shikimori.io/oauth

## Feedback
- @morr on Shikimori
- admin@shikimori.me
