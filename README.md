# AWS Multiplayer Turn-Based Game

Учебный проект пошаговой multiplayer-игры на AWS.

## Overview

Этот проект — MVP multiplayer-игры с аутентификацией через Amazon Cognito и frontend на React.  
Сейчас реализованы логин, восстановление сессии и базовая навигация между экранами.  
Следующий этап — backend для matchmaking на AWS с использованием Lambda и DynamoDB.

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

## Architecture

### Current Architecture

```text
React App
  ├─ Login
  ├─ Lobby
  └─ Game

Cognito Hosted UI
  └─ Authorization Code Flow
```
### Planned Backend Architecture
```text
React Frontend
    ↓ HTTPS
API Gateway
    ↓
Lambda (matchmaking)
    ↓
DynamoDB


localStorage
  └─ Stores tokens for session restore
```

### Authentication Flow
User clicks Sign In or Sign Up
Frontend redirects to Cognito Hosted UI
Cognito redirects back with authorization code
Frontend exchanges code for tokens
id_token is parsed to extract user information
Tokens are saved in localStorage
Session is restored on refresh
Logout clears local storage and redirects through Cognito logout
Tech Stack
React
Vite
Amazon Cognito
AWS Lambda (planned for matchmaking)
Amazon DynamoDB (planned for matchmaking)
Amazon API Gateway (planned for matchmaking)
Current App Flow
User opens the app
User signs in through Cognito
After successful login, user enters the Lobby
From the Lobby, user can later start matchmaking
After a match is found, user will enter the Game screen
Matchmaking MVP Plan

### Planned backend functionality:

waiting queue for players
match creation
matchId generation
transition from Lobby to Game with real match data
match storage in DynamoDB
Lambda-based matchmaking logic
Goals
Keep the architecture simple
Build an MVP first
Learn core AWS services through practice
Incrementally evolve from local frontend logic to real cloud backend
Next Steps
Design DynamoDB schema for WaitingQueue
Design DynamoDB schema for Matches
Create Lambda for matchmaking
Add API Gateway endpoints:
POST /matchmaking/join
GET /matchmaking/status
Connect Lobby to backend
Pass real matchId into Game screen
Local Development

#### Install dependencies:

npm install

#### Start the development server

npm run dev

## Notes

This is a learning project focused on building a simple AWS-based multiplayer architecture step by step, without overengineering.


