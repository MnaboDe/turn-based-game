# AWS Multiplayer Turn-Based Game

Учебный проект пошаговой multiplayer-игры на AWS.

## Overview

Этот проект — MVP multiplayer-игры с аутентификацией через Amazon Cognito и frontend на React.  
На текущем этапе уже реализованы логин, восстановление сессии, базовая навигация между экранами и рабочий backend для matchmaking на AWS.

## Current Features

### Frontend
- React + Vite
- Screens:
  - Login
  - Lobby
  - Game
- Simple screen navigation using React state

### Authentication
- Amazon Cognito User Pool
- Cognito Hosted UI for Sign In / Sign Up
- Authorization Code Flow
- Exchange of authorization code for tokens
- JWT parsing on frontend
- User info extraction from `id_token`
- Token storage in `localStorage`
- Session restore after page refresh
- Logout via Cognito `/logout`
- Fixed login screen flicker after redirect from Cognito

### Matchmaking
- Backend matchmaking API with API Gateway
- AWS Lambda matchmaking handler
- DynamoDB waiting queue
- DynamoDB matches table
- Protected endpoints with Cognito JWT authorizer
- Frontend Lobby integration with real backend matchmaking
- Polling from Lobby until a match is found
- Transition from Lobby to Game with real `matchId`

## Architecture

### Current Architecture

```text
React Frontend
  ├─ Login
  ├─ Lobby
  └─ Game
      ↓ HTTPS
API Gateway
      ↓
Lambda (matchmakingHandler)
      ↓
DynamoDB
```

### Authentication Architecture
```text
React App
  └─ Cognito Hosted UI
       └─ Authorization Code Flow
            └─ Tokens stored in localStorage
```
### Project Structure
```text
frontend/
  src/
    api/
      auth.js
      authStorage.js
      jwt.js
      matchmaking.js
    app/
      initAuth.js
    config/
      authConfig.js
    screens/
      Login.jsx
      Lobby.jsx
      Game.jsx
      Loading.jsx
    App.jsx
```

### Authentication Flow

1. User clicks Sign In or Sign Up
2. Frontend redirects to Cognito Hosted UI
3. Cognito redirects back with authorization code
4. Frontend exchanges code for tokens
5. id_token is parsed to extract user information
6. Tokens are saved in localStorage
7. Session is restored on refresh
8. Logout clears local storage and redirects through Cognito logout

### Waiting Queue Design

The matchmaking MVP uses a DynamoDB table called WaitingQueue to store players who are waiting for an opponent.

### Purpose

#### This table is used to:

add a player to the matchmaking queue
check whether the player is already waiting
find another waiting player
remove a player from the queue when a match is created

#### Table Schema

Table name: WaitingQueue

Primary key:

playerId (String) — Cognito sub
Attributes
playerId (String) — unique player identifier
status (String) — current queue status, for MVP: waiting
joinedAt (String) — timestamp when the player joined the queue in ISO format
username (String, optional) — user email or display name for debugging

### Example Item
```JSON
{
  "playerId": "user-sub-123",
  "status": "waiting",
  "joinedAt": "2026-03-25T18:10:00Z",
  "username": "user@example.com"
}
```
### Index

To efficiently find players who are currently waiting, the table includes a Global Secondary Index:

Index name: status-joinedAt-index

Partition key: status
Sort key: joinedAt

This allows the backend to query players with status = waiting and pick the earliest player in the queue.

### Matches Table Design

The matchmaking MVP uses a DynamoDB table called Matches to store matches created after two players are paired.

### Purpose

This table is used to:

create a new match when two players are paired
store both players participating in the match
allow the backend to find a match by matchId
allow the backend to find a match for a specific player
keep minimal match state for the game flow

### Table Schema

Table name: Matches

Primary key:

matchId (String)
Attributes
matchId (String) — unique match identifier
player1 (String) — Cognito sub of the first player
player2 (String) — Cognito sub of the second player
createdAt (String) — match creation timestamp in ISO format
state (String) — current match state, for MVP: active or finished
turn (String, optional) — player whose turn it is
winner (String, optional) — winner identifier when the game ends
Example Item

```JSON
{
  "matchId": "match-123",
  "player1": "user-sub-111",
  "player2": "user-sub-222",
  "createdAt": "2026-03-25T18:15:00Z",
  "state": "active",
  "turn": "user-sub-111",
  "winner": null
}
```

### Indexes

To support match lookup by player, the table includes two Global Secondary Indexes:

Index 1: player1-index

Partition key: player1

Index 2: player2-index

Partition key: player2

This allows the backend to find a match for a player by querying:

player1-index
and, if needed, player2-index

## DynamoDB Tables

The matchmaking MVP uses two DynamoDB tables.

### WaitingQueue

Stores players who are waiting for an opponent.

Primary key:

playerId (String)

#### Global Secondary Index:

* * status-joinedAt-index
* * Partition key: status
* * Sort key: joinedAt

### Matches

Stores matches created after two players are paired.

Primary key:

* * matchId (String)

#### Global Secondary Indexes:

* * player1-index
* * Partition key: player1

* * player2-index
* * Partition key: player2

#### Capacity Mode

Both tables use on-demand capacity mode to keep the MVP simple and avoid manual throughput management.

### Matchmaking Lambda Design

The matchmaking MVP uses a single AWS Lambda function to handle backend matchmaking logic.

#### Purpose

The Lambda function is responsible for:

receiving matchmaking requests from the frontend
reading the current authenticated user from Cognito claims
adding players to the waiting queue
finding an available opponent
creating a match
returning matchmaking status to the frontend

#### API Routes

The Lambda function handles two routes:

POST /matchmaking/join
GET /matchmaking/status
POST /matchmaking/join

This route is used when a player clicks Find Match in the Lobby.

The backend performs the following steps:

1. Read the current user from the JWT authorizer context
2. Check whether the player already has an active match
3. Check whether the player is already in WaitingQueue
4. Query WaitingQueue for another player with status = waiting
5. If no opponent is found, add the player to the queue
6. If an opponent is found, create a new item in Matches
7. Remove both players from WaitingQueue
8. Return either waiting or matched

```text
GET /matchmaking/status
```
This route is used by the frontend polling loop.

The backend performs the following steps:

1. Read the current user from the JWT authorizer context
2. Query Matches using player1-index
3. If needed, query Matches using player2-index
4. Return:
```JSON
{ "status": "waiting" }
```
or
```JSON
{ "status": "matched", "matchId": "..." }
```

#### Environment Variables

The Lambda function uses environment variables for table names:

WAITING_QUEUE_TABLE
MATCHES_TABLE

### MVP Notes

This design intentionally uses a single Lambda function to keep the first version simple.

It does not yet include:

* matchmaking cancellation
* cleanup of stale queue entries
* game move handling
* realtime updates
* WebSocket connections
* advanced queue logic

### Matchmaking Lambda Implementation

The backend matchmaking logic is implemented in a single AWS Lambda function called matchmakingHandler.

#### Runtime

 * * Node.js 24.x

#### Environment Variables

The function uses the following environment variables:

* * WAITING_QUEUE_TABLE
* * MATCHES_TABLE
* * Responsibilities

#### The Lambda function handles:

* * POST /matchmaking/join
* * GET /matchmaking/status

### Join Flow

When a player starts matchmaking, the Lambda function:

Reads the authenticated user from Cognito claims
Checks whether the player already has a match
Checks whether the player is already waiting in the queue
Queries the waiting queue for an opponent
Adds the player to the queue or creates a match

### Status Flow

When the frontend polls matchmaking status, the Lambda function:

Reads the authenticated user from Cognito claims
Queries the Matches table using player1-index
If needed, queries player2-index
Returns either waiting or matched

#### Notes

The implementation is intentionally simple for MVP and does not yet handle advanced concurrency protection, stale queue cleanup, or realtime communication.

### API Gateway Setup

The backend uses an Amazon API Gateway HTTP API in front of the matchmaking Lambda function.

#### Routes

The API exposes two protected routes:

* * POST /matchmaking/join
* * GET /matchmaking/status

Both routes are integrated with the matchmakingHandler Lambda function.

### Authorization

The API uses a JWT authorizer connected to Amazon Cognito.

Issuer: Cognito User Pool issuer URL
Audience: Cognito App Client ID
Identity source: Authorization header

This allows API Gateway to validate the token before invoking Lambda.

### CORS

For local frontend development, CORS is enabled for the frontend origin:

* * http://localhost:5173

Allowed methods:

* * GET
* * POST
* * OPTIONS

Allowed headers:

* * authorization
* * content-type
* * Matchmaking API Endpoints

The deployed matchmaking API is exposed through Amazon API Gateway.

#### Base URL
```text
https://9wx2pipthb.execute-api.us-east-1.amazonaws.com
```

### Endpoints

#### Join matchmaking
```http
POST /matchmaking/join
Authorization: Bearer <access_token>
```

#### Check matchmaking status
```http
GET /matchmaking/status
Authorization: Bearer <access_token>
```

Both endpoints require a valid Cognito JWT and are protected by the API Gateway JWT authorizer.

### Frontend Matchmaking API Layer

The frontend uses a dedicated module for matchmaking API requests.

#### File
```Text
src/api/matchmaking.js
```

#### Responsibilities

This module is responsible for:

* sending authenticated requests to the matchmaking backend
* calling POST /matchmaking/join
* calling GET /matchmaking/status
* handling JSON responses
* throwing errors for failed requests

This keeps backend request logic separate from React UI components.

### First Backend Test

The first protected backend request was successfully tested through API Gateway using a Cognito access token.

### Tested Endpoint

```http
GET /matchmaking/status
Authorization: Bearer <access_token>
```
### Result
```JSON
{ "status": "waiting" }
```

#### This confirmed that:

the API Gateway JWT authorizer is working
Cognito tokens are being accepted
the Lambda function is invoked successfully
user identity is correctly read from JWT claims
the matchmaking status route is working
Queue Write Test

The POST /matchmaking/join endpoint was tested successfully.

### Result

When a player joins matchmaking and no opponent is available:

the backend returns waiting
a new item is written to the WaitingQueue table

#### This confirmed that:

the join route is working
the Lambda function can write to DynamoDB
the waiting queue flow works for the first player
Matchmaking End-to-End Test

The backend matchmaking flow was tested successfully with two different authenticated users.

### Test Scenario

* The first user called POST /matchmaking/join
* The backend added the first user to WaitingQueue
* The second user called POST /matchmaking/join
* The backend found the waiting player and created a match
* Both users received a matched response with the same matchId
* In the frontend UI, the first player waited in the Lobby, the second player matched immediately, and both players reached the Game screen with the same matchId

#### Example Result

```JSON
{
  "status": "matched",
  "matchId": "match-42553862-c1b8-4460-9375-bff06ae8894e"
}
```

#### What This Confirms

This test confirmed that the following components are working together correctly:

Amazon Cognito authentication
API Gateway JWT authorization
Lambda matchmaking logic
DynamoDB waiting queue storage
DynamoDB match creation
player-to-match resolution through the status endpoint
frontend polling flow from Lobby to Game

At this stage, the project already has a working MVP backend for matchmaking.

### Tech Stack
React
Vite
Amazon Cognito
Amazon API Gateway
AWS Lambda
Amazon DynamoDB

### Current App Flow
User opens the app
User signs in through Cognito
After successful login, user enters the Lobby
The player can click Find Match
If no opponent is available, the player waits in the Lobby
When a second player joins, a match is created
Both players transition to the Game screen with a real matchId

### Goals
Keep the architecture simple
Build an MVP first
Learn core AWS services through practice
Incrementally evolve from local frontend logic to real cloud backend
### Next Steps
Move API base URLs into shared frontend config
Add Cancel Search support
Add match cleanup or more explicit match state handling
Read match details by matchId
Start storing actual game state in DynamoDB
Implement turn-based game logic on the backend
Local Development

Install dependencies:

```Bash
npm install
```

Start the development server:

```Bash
npm run dev
```

### Notes

This is a learning project focused on building a simple AWS-based multiplayer architecture step by step, without overengineering.