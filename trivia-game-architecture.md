# Trivia Head-to-Head Betting Game - Technical Architecture

## Overview

A real-time multiplayer trivia game where two players compete head-to-head, placing poker-style wagers on their ability to answer progressively-revealed trivia clues.

**Scope of this document:** Core gameplay loop only. Excludes matchmaking, persistent accounts, ELO, and monetization.

---

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT                                  │
│                                                                              │
│                                                                              │
│       ┌───────────┐                                    ┌───────────┐        │
│       │  Player 1 │                                    │  Player 2 │        │
│       │  (Browser)│                                    │  (Browser)│        │
│       └─────┬─────┘                                    └─────┬─────┘        │
│             │                                                │              │
│             │ WebSocket                          WebSocket   │              │
│             │                                                │              │
│             ▼                                                ▼              │
│       ┌─────────────────────────────────────────────────────────┐           │
│       │                                                         │           │
│       │                     GAME SERVER                         │           │
│       │                                                         │           │
│       │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │           │
│       │  │   Room      │  │   State     │  │    Timer        │  │           │
│       │  │   Manager   │  │   Machine   │  │    Service      │  │           │
│       │  └─────────────┘  └─────────────┘  └─────────────────┘  │           │
│       │                                                         │           │
│       │  ┌─────────────┐  ┌─────────────────────────────────┐   │           │
│       │  │   Answer    │  │                                 │   │           │
│       │  │   Validator │  │      Question Database          │   │           │
│       │  └─────────────┘  │                                 │   │           │
│       │                   └─────────────────────────────────┘   │           │
│       │                                                         │           │
│       └─────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Responsibility |
|-----------|----------------|
| **Room Manager** | Creates/destroys game rooms, tracks which players are in which room |
| **State Machine** | Manages game phases, validates transitions, enforces rules |
| **Timer Service** | Handles clue reveal ticks, answer deadlines, question timeout |
| **Answer Validator** | Compares player answers against accepted answers list |
| **Question Database** | Stores trivia questions with clues and accepted answers |

---

## Room State

All authoritative game state lives on the server. Clients are "dumb" renderers that send intents and receive state updates.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROOM STATE                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  STATIC (set at room creation)                                         │ │
│  │                                                                         │ │
│  │  roomId:           "room_abc123"                                        │ │
│  │  players:          [P1_id, P2_id]                                       │ │
│  │  startingBalance:  500                                                  │ │
│  │  questionsPerMatch: 3                                                   │ │
│  │  questions:        [Question, Question, Question]  // preloaded         │ │
│  │  config: {                                                              │ │
│  │    revealRateCharsPerSec: 12                                            │ │
│  │    postClueTimeoutSec: 5                                                │ │
│  │    answerTimeLimitSec: 5                                                │ │
│  │    categoryRevealSec: 3                                                 │ │
│  │    betTimeLimitSec: 15                                                  │ │
│  │    foldsPerPlayer: 2                                                    │ │
│  │  }                                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  DYNAMIC (changes during game)                                          │ │
│  │                                                                         │ │
│  │  phase:            WAITING | CATEGORY | BETTING | CLUE | ANSWER |       │ │
│  │                    RESOLUTION | COMPLETE                                │ │
│  │  questionIndex:    0 | 1 | 2                                            │ │
│  │  balances:         { P1: 500, P2: 500 }                                 │ │
│  │  foldsRemaining:   { P1: 2, P2: 2 }                                     │ │
│  │                                                                         │ │
│  │  // Betting state                                                       │ │
│  │  bettingState: {                                                        │ │
│  │    firstActor:     P1 | P2        // alternates each question           │ │
│  │    bets:           { P1: null, P2: null }  // what each player bet      │ │
│  │    contributions:  { P1: 0, P2: 0 }        // money in pot per player   │ │
│  │    raises:         0              // max 1 per question                 │ │
│  │    awaitingAction: P1 | P2 | null                                       │ │
│  │    pot:            0              // sum of contributions               │ │
│  │  }                                                                      │ │
│  │                                                                         │ │
│  │  // Clue reveal state                                                   │ │
│  │  clueState: {                                                           │ │
│  │    revealIndex:    0              // chars revealed so far              │ │
│  │    clueComplete:   false                                                │ │
│  │    clueCompleteAt: null           // timestamp                          │ │
│  │  }                                                                      │ │
│  │                                                                         │ │
│  │  // Buzzer state                                                        │ │
│  │  buzzerState: {                                                         │ │
│  │    P1: AVAILABLE | BUZZED | FAILED                                      │ │
│  │    P2: AVAILABLE | BUZZED | FAILED                                      │ │
│  │    currentlyAnswering: null | P1 | P2                                   │ │
│  │    answerDeadline: null           // timestamp                          │ │
│  │  }                                                                      │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Question Data Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUESTION SCHEMA                                    │
│                                                                              │
│  {                                                                           │
│    "id": "q_mongolia_capital",                                               │
│    "category": "Geography",                                                  │
│    "clue": "This ancient city was the capital of an empire located in       │
│             central Mongolia. Founded in 1639 as a Buddhist monastery,       │
│             it became a permanent settlement and trading hub. Today it       │
│             houses nearly half the country's population and remains the      │
│             capital of Mongolia.",                                           │
│    "acceptedAnswers": [                                                      │
│      "ulaanbaatar",                                                          │
│      "ulan bator",                                                           │
│      "ulan batar",                                                           │
│      "ulaan baatar"                                                          │
│    ],                                                                        │
│    "displayAnswer": "Ulaanbaatar"   // shown in results                      │
│  }                                                                           │
│                                                                              │
│  Answer validation:                                                          │
│    1. Trim whitespace                                                        │
│    2. Convert to lowercase                                                   │
│    3. Check if result is in acceptedAnswers array                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Game Phase State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MATCH STATE MACHINE                                  │
│                                                                              │
│                                                                              │
│                            ┌───────────┐                                     │
│                            │  WAITING  │                                     │
│                            │           │                                     │
│                            │ Both players                                    │
│                            │ must join │                                     │
│                            └─────┬─────┘                                     │
│                                  │                                           │
│                                  │ both players connected                    │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │    ┌─────────────────────────────────────────────────────────────┐    │   │
│  │    │                    QUESTION LOOP                            │    │   │
│  │    │                    (repeats 3x)                             │    │   │
│  │    │                                                             │    │   │
│  │    │         ┌──────────────┐                                    │    │   │
│  │    │         │   CATEGORY   │                                    │    │   │
│  │    │         │              │                                    │    │   │
│  │    │         │  Shows category                                   │    │   │
│  │    │         │  3 second delay                                   │    │   │
│  │    │         └───────┬──────┘                                    │    │   │
│  │    │                 │                                           │    │   │
│  │    │                 ▼                                           │    │   │
│  │    │         ┌──────────────┐                                    │    │   │
│  │    │         │   BETTING    │ ◀──────────────────────────┐       │    │   │
│  │    │         │              │                            │       │    │   │
│  │    │         │  See detail below                         │       │    │   │
│  │    │         └──────┬───────┘                            │       │    │   │
│  │    │                │                                    │       │    │   │
│  │    │       ┌────────┴────────┐                           │       │    │   │
│  │    │       │                 │                           │       │    │   │
│  │    │       ▼                 ▼                           │       │    │   │
│  │    │   [someone          [both                           │       │    │   │
│  │    │    folded]          matched]                        │       │    │   │
│  │    │       │                 │                           │       │    │   │
│  │    │       │                 ▼                           │       │    │   │
│  │    │       │         ┌──────────────┐                    │       │    │   │
│  │    │       │         │     CLUE     │                    │       │    │   │
│  │    │       │         │              │                    │       │    │   │
│  │    │       │         │  See detail below                 │       │    │   │
│  │    │       │         └──────┬───────┘                    │       │    │   │
│  │    │       │                │                            │       │    │   │
│  │    │       │                ▼                            │       │    │   │
│  │    │       │         ┌──────────────┐                    │       │    │   │
│  │    │       │         │    ANSWER    │                    │       │    │   │
│  │    │       │         │              │                    │       │    │   │
│  │    │       │         │  5s to type answer                │       │    │   │
│  │    │       │         │  See detail below                 │       │    │   │
│  │    │       │         └──────┬───────┘                    │       │    │   │
│  │    │       │                │                            │       │    │   │
│  │    │       ▼                ▼                            │       │    │   │
│  │    │    ┌────────────────────────┐                       │       │    │   │
│  │    │    │      RESOLUTION        │                       │       │    │   │
│  │    │    │                        │                       │       │    │   │
│  │    │    │  - Update balances     │                       │       │    │   │
│  │    │    │  - Show result         │                       │       │    │   │
│  │    │    │  - 3s delay            │                       │       │    │   │
│  │    │    └───────────┬────────────┘                       │       │    │   │
│  │    │                │                                    │       │    │   │
│  │    │                ▼                                    │       │    │   │
│  │    │         questionIndex++                             │       │    │   │
│  │    │                │                                    │       │    │   │
│  │    │       ┌────────┴────────┐                           │       │    │   │
│  │    │       │                 │                           │       │    │   │
│  │    │       ▼                 ▼                           │       │    │   │
│  │    │   [index < 3]      [index = 3]                      │       │    │   │
│  │    │       │                 │                           │       │    │   │
│  │    │       │                 │                           │       │    │   │
│  │    │       └────────┐        │                           │       │    │   │
│  │    │                │        │                           │       │    │   │
│  │    │    next question loop   │                           │       │    │   │
│  │    │                         │                           │       │    │   │
│  │    └─────────────────────────┼───────────────────────────┘       │    │   │
│  │                              │                                    │   │
│  └──────────────────────────────┼────────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼                                        │
│                          ┌─────────────┐                                 │
│                          │  COMPLETE   │                                 │
│                          │             │                                 │
│                          │  Winner = player                              │
│                          │  with higher balance                          │
│                          └─────────────┘                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Betting Phase Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BETTING STATE MACHINE                                │
│                                                                              │
│  Entry: firstActor alternates each question (Q1: P1, Q2: P2, Q3: P1)        │
│                                                                              │
│                                                                              │
│                         ┌─────────────────┐                                  │
│                         │  AWAITING_BET   │                                  │
│                         │  (firstActor)   │                                  │
│                         └────────┬────────┘                                  │
│                                  │                                           │
│           ┌──────────────────────┼──────────────────────┐                    │
│           │                      │                      │                    │
│           ▼                      ▼                      ▼                    │
│     [FOLD]                 [BET amount]           [timeout]                  │
│        │                        │                      │                     │
│        ▼                        ▼                      ▼                     │
│   pot is 0, so             pot += amount          auto-fold                  │
│   other player gets             │                 (same as FOLD)             │
│   nothing                       │                                            │
│        │                        │                                            │
│        ▼                        ▼                                            │
│   RESOLUTION            ┌──────────────────┐                                 │
│   (no money changes     │ AWAITING_RESPONSE│                                 │
│    hands)               │ (other player)   │                                 │
│                         └────────┬─────────┘                                 │
│                                  │                                           │
│           ┌──────────────────────┼──────────────────────┐                    │
│           │                      │                      │                    │
│           ▼                      ▼                      ▼                    │
│      [FOLD]                 [MATCH]                [RAISE]                   │
│         │                      │                      │                      │
│         ▼                      ▼                      ▼                      │
│   pot (firstActor's       pot += amount         pot += raised amt            │
│   bet) goes to                 │                 raises++                    │
│   firstActor                   │                 (max 1)                     │
│         │                      │                      │                      │
│         ▼                      ▼                      ▼                      │
│    RESOLUTION              CLUE phase         ┌──────────────────┐           │
│    (firstActor gets                           │ AWAITING_RESPONSE│           │
│     their bet back,                           │ (firstActor)     │           │
│     net gain: 0)                              └────────┬─────────┘           │
│                                                        │                     │
│                                     ┌──────────────────┼──────────────┐      │
│                                     │                  │              │      │
│                                     ▼                  ▼              ▼      │
│                                [FOLD]             [MATCH]        [timeout]   │
│                                   │                  │              │        │
│                                   ▼                  ▼              ▼        │
│                              whole pot          pot += amount   auto-fold    │
│                              goes to raiser          │                       │
│                              (firstActor loses       │                       │
│                               their bet)             │                       │
│                                   │                  │                       │
│                                   ▼                  ▼                       │
│                              RESOLUTION          CLUE phase                  │
│                                                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ FOLD RULES                                                             │  │
│  │                                                                        │  │
│  │ - Each player has 2 folds per match (not per question)                 │  │
│  │ - If foldsRemaining[player] === 0, FOLD option is disabled             │  │
│  │ - Player must MATCH or (if available) RAISE when out of folds          │  │
│  │ - When you fold, the entire pot goes to the other player               │  │
│  │ - Folder loses whatever they contributed; gains nothing                │  │
│  │ - If pot is 0 (first actor folds before betting), no money moves       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ BET AMOUNTS                                                            │  │
│  │                                                                        │  │
│  │ Available bet tiers: [5, 10, 25, 50, 100]                              │  │
│  │ Player can only select amounts <= their current balance.               │  │
│  │ Raise must be > current bet and <= raiser's balance.                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Clue + Answer Phase Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLUE + ANSWER STATE MACHINE                             │
│                                                                              │
│                                                                              │
│                         ┌─────────────────┐                                  │
│                         │  CLUE_REVEALING │                                  │
│                         │                 │                                  │
│                         │ Server sends CLUE_TICK                             │
│                         │ every 500ms with                                   │
│                         │ revealIndex++                                      │
│                         │                 │                                  │
│                         │ Both players:                                      │
│                         │ buzzerState = AVAILABLE                            │
│                         └────────┬────────┘                                  │
│                                  │                                           │
│              ┌───────────────────┼───────────────────┐                       │
│              │                   │                   │                       │
│              ▼                   ▼                   ▼                       │
│         [P1 buzzes]      [clue complete]       [P2 buzzes]                   │
│              │                   │                   │                       │
│              ▼                   ▼                   ▼                       │
│         P1 → ANSWERING    clueComplete=true    P2 → ANSWERING                │
│         P1 buzzed=BUZZED  start postClue       P2 buzzed=BUZZED              │
│              │            timeout (5s)               │                       │
│              │                   │                   │                       │
│              │                   ▼                   │                       │
│              │          ┌─────────────────┐          │                       │
│              │          │ CLUE_COMPLETE   │          │                       │
│              │          │                 │          │                       │
│              │          │ Waiting for     │          │                       │
│              │          │ buzz or timeout │          │                       │
│              │          └────────┬────────┘          │                       │
│              │                   │                   │                       │
│              │      ┌────────────┼────────────┐      │                       │
│              │      │            │            │      │                       │
│              │      ▼            ▼            ▼      │                       │
│              │ [P1 buzzes] [timeout]   [P2 buzzes]   │                       │
│              │      │         │             │        │                       │
│              │      │         ▼             │        │                       │
│              │      │    RESOLUTION         │        │                       │
│              │      │    (pot returned,     │        │                       │
│              │      │     no winner)        │        │                       │
│              │      │                       │        │                       │
│              │      ▼                       ▼        │                       │
│              └──────┴───────────┬───────────┴────────┘                       │
│                                 │                                            │
│                                 ▼                                            │
│                        ┌───────────────┐                                     │
│                        │   ANSWERING   │                                     │
│                        │               │                                     │
│                        │ currentlyAnswering = Px                             │
│                        │ answerDeadline = now + 5s                           │
│                        │ Clue freezes at current                             │
│                        │ revealIndex                                         │
│                        └───────┬───────┘                                     │
│                                │                                             │
│             ┌──────────────────┼──────────────────┐                          │
│             │                  │                  │                          │
│             ▼                  ▼                  ▼                          │
│       [correct]          [wrong]            [timeout]                        │
│          │                  │                  │                             │
│          │                  │                  ▼                             │
│          │                  │            treat as wrong                      │
│          │                  │                  │                             │
│          │                  └────────┬─────────┘                             │
│          │                           │                                       │
│          ▼                           ▼                                       │
│     RESOLUTION              ┌─────────────────────┐                          │
│     (answerer wins pot)     │ Check other player  │                          │
│                             └─────────┬───────────┘                          │
│                                       │                                      │
│                          ┌────────────┴────────────┐                         │
│                          │                         │                         │
│                          ▼                         ▼                         │
│                  [other AVAILABLE]         [other already FAILED]            │
│                          │                         │                         │
│                          ▼                         ▼                         │
│                  Resume clue from            RESOLUTION                      │
│                  current revealIndex         (pot returned)                  │
│                  Other player can now                                        │
│                  buzz (back to CLUE)                                         │
│                                                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ BUZZER RULES                                                           │  │
│  │                                                                        │  │
│  │ - Each player gets ONE buzz attempt per question                       │  │
│  │ - Once buzzed (correct or wrong), that player cannot buzz again        │  │
│  │ - If P1 buzzes and gets wrong, P2 can still buzz                       │  │
│  │ - If both players have buzzed (both FAILED), go to RESOLUTION          │  │
│  │ - Buzz is valid anytime during CLUE_REVEALING or CLUE_COMPLETE         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Resolution Outcomes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESOLUTION OUTCOMES                                  │
│                                                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ SCENARIO 1: Someone answers correctly                                  │  │
│  │                                                                        │  │
│  │   Winner gets: entire pot                                              │  │
│  │   Loser loses: their contribution to pot                               │  │
│  │                                                                        │  │
│  │   Example: P1 bet 50, P2 matched 50, pot = 100                         │  │
│  │            P1 answers correctly                                        │  │
│  │            P1 balance: +50 (wins P2's 50)                              │  │
│  │            P2 balance: -50 (loses their bet)                           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ SCENARIO 2: Both players wrong OR nobody buzzes                        │  │
│  │                                                                        │  │
│  │   Pot returned to both players                                         │  │
│  │   Net change: 0 for both                                               │  │
│  │                                                                        │  │
│  │   Example: P1 bet 50, P2 matched 50, pot = 100                         │  │
│  │            Both buzz and get wrong (or neither buzzes)                 │  │
│  │            P1 balance: 0 change (gets 50 back)                         │  │
│  │            P2 balance: 0 change (gets 50 back)                         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ SCENARIO 3: Fold during betting                                        │  │
│  │                                                                        │  │
│  │   RULE: When you fold, the entire pot goes to the other player.        │  │
│  │         Folder loses whatever they put in. If pot is empty, nothing    │  │
│  │         changes hands.                                                 │  │
│  │                                                                        │  │
│  │   3a: First actor folds immediately (before betting)                   │  │
│  │       - Pot is 0                                                       │  │
│  │       - No money changes hands                                         │  │
│  │       - P1: 0 change, P2: 0 change                                     │  │
│  │                                                                        │  │
│  │   3b: First actor bets, second player folds                            │  │
│  │       - Pot contains only first actor's bet                            │  │
│  │       - First actor gets pot back (net gain: 0)                        │  │
│  │       - Second player loses nothing (never put money in)               │  │
│  │                                                                        │  │
│  │       Example: P1 bets 50, P2 folds                                    │  │
│  │                Pot = 50 (P1's money)                                   │  │
│  │                P1 gets pot (their own 50 back), net: 0                 │  │
│  │                P2 net: 0                                               │  │
│  │                                                                        │  │
│  │   3c: First actor bets, second raises, first folds                     │  │
│  │       - Pot contains both players' money                               │  │
│  │       - Raiser gets entire pot                                         │  │
│  │       - First actor loses their contribution                           │  │
│  │                                                                        │  │
│  │       Example: P1 bets 50, P2 raises to 100, P1 folds                  │  │
│  │                Pot = 150 (P1's 50 + P2's 100)                          │  │
│  │                P2 gets pot (150), net gain: +50                        │  │
│  │                P1 loses their 50, net: -50                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ SCENARIO 4: Match ends in tie                                          │  │
│  │                                                                        │  │
│  │   If both players have equal balance after 3 questions:                │  │
│  │   - Match is a tie                                                     │  │
│  │   - Both players leave with their starting balance (500)               │  │
│  │   - No winner declared                                                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ SUMMARY TABLE                                                          │  │
│  │                                                                        │  │
│  │   Outcome              │ Pot distribution                              │  │
│  │   ─────────────────────┼─────────────────────────────────────────────  │  │
│  │   Correct answer       │ Winner takes all                              │  │
│  │   Both wrong           │ Pot returned to both                          │  │
│  │   No one buzzes        │ Pot returned to both                          │  │
│  │   Fold                 │ Other player takes pot (may be 0)             │  │
│  │   Match tie            │ Both keep starting balance                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Message Protocol

### Server → Client Messages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SERVER → CLIENT MESSAGES                                │
│                                                                              │
│                                                                              │
│  // Connection & Room                                                        │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ROOM_STATE                    Full state sync (on join/reconnect)           │
│  {                                                                           │
│    type: "ROOM_STATE",                                                       │
│    roomId: string,                                                           │
│    you: "P1" | "P2",                                                         │
│    phase: Phase,                                                             │
│    balances: { P1: number, P2: number },                                     │
│    questionIndex: number,                                                    │
│    // ... all relevant state for current phase                               │
│  }                                                                           │
│                                                                              │
│  PLAYER_JOINED                                                               │
│  { type: "PLAYER_JOINED", player: "P1" | "P2" }                              │
│                                                                              │
│  PLAYER_LEFT                                                                 │
│  { type: "PLAYER_LEFT", player: "P1" | "P2" }                                │
│                                                                              │
│                                                                              │
│  // Phase Transitions                                                        │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  PHASE_CATEGORY                                                              │
│  {                                                                           │
│    type: "PHASE_CATEGORY",                                                   │
│    questionIndex: number,                                                    │
│    category: string,                                                         │
│    endsAt: timestamp           // when betting starts                        │
│  }                                                                           │
│                                                                              │
│  PHASE_BETTING                                                               │
│  {                                                                           │
│    type: "PHASE_BETTING",                                                    │
│    firstActor: "P1" | "P2",                                                  │
│    awaitingAction: "P1" | "P2",                                              │
│    availableActions: ["BET", "FOLD"],                                        │
│    betOptions: [5, 10, 25, 50, 100],   // filtered by balance                │
│    deadline: timestamp                                                       │
│  }                                                                           │
│                                                                              │
│  PHASE_CLUE                                                                  │
│  {                                                                           │
│    type: "PHASE_CLUE",                                                       │
│    clue: string,               // full clue text (client reveals locally)    │
│    revealRate: number,         // chars per second                           │
│    pot: number                                                               │
│  }                                                                           │
│                                                                              │
│  PHASE_RESOLUTION                                                            │
│  {                                                                           │
│    type: "PHASE_RESOLUTION",                                                 │
│    outcome: "P1_WIN" | "P2_WIN" | "DRAW" | "P1_FOLD" | "P2_FOLD",            │
│             // DRAW = both wrong or no one buzzed (pot returned)            │
│    correctAnswer: string,                                                    │
│    P1Answer: string | null,                                                  │
│    P2Answer: string | null,                                                  │
│    balanceChanges: { P1: number, P2: number },                               │
│    newBalances: { P1: number, P2: number },                                  │
│    nextPhaseAt: timestamp                                                    │
│  }                                                                           │
│                                                                              │
│  PHASE_COMPLETE                                                              │
│  {                                                                           │
│    type: "PHASE_COMPLETE",                                                   │
│    winner: "P1" | "P2" | "TIE",   // TIE if equal final balances             │
│    finalBalances: { P1: number, P2: number }                                 │
│  }                                                                           │
│                                                                              │
│                                                                              │
│  // In-Phase Updates                                                         │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  BET_PLACED                                                                  │
│  {                                                                           │
│    type: "BET_PLACED",                                                       │
│    player: "P1" | "P2",                                                      │
│    action: "BET" | "MATCH" | "RAISE" | "FOLD",                               │
│    amount: number,                                                           │
│    pot: number,                                                              │
│    awaitingAction: "P1" | "P2" | null,                                       │
│    availableActions: string[]                                                │
│  }                                                                           │
│                                                                              │
│  CLUE_TICK                                                                   │
│  {                                                                           │
│    type: "CLUE_TICK",                                                        │
│    revealIndex: number         // chars to show                              │
│  }                                                                           │
│                                                                              │
│  CLUE_COMPLETE                                                               │
│  {                                                                           │
│    type: "CLUE_COMPLETE",                                                    │
│    deadline: timestamp         // when question times out                    │
│  }                                                                           │
│                                                                              │
│  BUZZED                                                                      │
│  {                                                                           │
│    type: "BUZZED",                                                           │
│    player: "P1" | "P2",                                                      │
│    answerDeadline: timestamp                                                 │
│  }                                                                           │
│                                                                              │
│  ANSWER_SUBMITTED                                                            │
│  {                                                                           │
│    type: "ANSWER_SUBMITTED",                                                 │
│    player: "P1" | "P2",                                                      │
│    answer: string,                                                           │
│    correct: boolean                                                          │
│  }                                                                           │
│                                                                              │
│  CLUE_RESUMED                  // after wrong answer, other player can buzz  │
│  {                                                                           │
│    type: "CLUE_RESUMED",                                                     │
│    revealIndex: number,                                                      │
│    deadline: timestamp | null  // null if clue still revealing               │
│  }                                                                           │
│                                                                              │
│                                                                              │
│  // Errors                                                                   │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ERROR                                                                       │
│  {                                                                           │
│    type: "ERROR",                                                            │
│    code: string,                                                             │
│    message: string                                                           │
│  }                                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Client → Server Messages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLIENT → SERVER MESSAGES                                │
│                                                                              │
│                                                                              │
│  JOIN_ROOM                                                                   │
│  {                                                                           │
│    type: "JOIN_ROOM",                                                        │
│    roomId: string,                                                           │
│    playerId: string            // temporary ID for MVP                       │
│  }                                                                           │
│                                                                              │
│  BET                                                                         │
│  {                                                                           │
│    type: "BET",                                                              │
│    amount: number                                                            │
│  }                                                                           │
│                                                                              │
│  MATCH                                                                       │
│  { type: "MATCH" }                                                           │
│                                                                              │
│  RAISE                                                                       │
│  {                                                                           │
│    type: "RAISE",                                                            │
│    amount: number              // total amount, not increment                │
│  }                                                                           │
│                                                                              │
│  FOLD                                                                        │
│  { type: "FOLD" }                                                            │
│                                                                              │
│  BUZZ                                                                        │
│  { type: "BUZZ" }                                                            │
│                                                                              │
│  ANSWER                                                                      │
│  {                                                                           │
│    type: "ANSWER",                                                           │
│    text: string                                                              │
│  }                                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Timer Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TIMERS                                          │
│                                                                              │
│                                                                              │
│  ┌──────────────────┬─────────────┬─────────────────────────────────────┐    │
│  │ Timer            │ Duration    │ On Expiration                       │    │
│  ├──────────────────┼─────────────┼─────────────────────────────────────┤    │
│  │ Category reveal  │ 3 seconds   │ → Transition to BETTING             │    │
│  ├──────────────────┼─────────────┼─────────────────────────────────────┤    │
│  │ Bet timeout      │ 15 seconds  │ → Auto-fold for timed-out player    │    │
│  ├──────────────────┼─────────────┼─────────────────────────────────────┤    │
│  │ Clue tick        │ 500ms       │ → Send next CLUE_TICK, repeat       │    │
│  │                  │ (interval)  │    until clue complete              │    │
│  ├──────────────────┼─────────────┼─────────────────────────────────────┤    │
│  │ Post-clue buzz   │ 5 seconds   │ → RESOLUTION (pot returned)         │    │
│  │ window           │             │                                     │    │
│  ├──────────────────┼─────────────┼─────────────────────────────────────┤    │
│  │ Answer timeout   │ 5 seconds   │ → Treat as wrong answer             │    │
│  ├──────────────────┼─────────────┼─────────────────────────────────────┤    │
│  │ Resolution       │ 3 seconds   │ → Next question or COMPLETE         │    │
│  │ display          │             │                                     │    │
│  └──────────────────┴─────────────┴─────────────────────────────────────┘    │
│                                                                              │
│                                                                              │
│  Timer Implementation Notes:                                                 │
│  ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│  - All timers are server-authoritative                                       │
│  - Server sends deadline timestamps to clients                               │
│  - Clients render countdown locally for smooth UX                            │
│  - If client/server clocks differ, client uses server timestamps             │
│  - CLUE_TICK is a server interval, not a deadline                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Client UI States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT UI STATES                                   │
│                                                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ WAITING                                                                │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │         Waiting for opponent         │                             │  │
│  │   │                                      │                             │  │
│  │   │          Room: abc123                │                             │  │
│  │   │          Share this code!            │                             │  │
│  │   │                                      │                             │  │
│  │   │             ● ○                      │                             │  │
│  │   │           1/2 players                │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ CATEGORY                                                               │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 500        OPPONENT: 500       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │                                      │                             │  │
│  │   │          Question 1 of 3             │                             │  │
│  │   │                                      │                             │  │
│  │   │        ┌─────────────────┐           │                             │  │
│  │   │        │   GEOGRAPHY     │           │                             │  │
│  │   │        └─────────────────┘           │                             │  │
│  │   │                                      │                             │  │
│  │   │         Betting in 3...              │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ BETTING (your turn)                                                    │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 500        OPPONENT: 500       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │  Category: GEOGRAPHY                 │                             │  │
│  │   │                                      │                             │  │
│  │   │          Place your bet              │                             │  │
│  │   │                                      │                             │  │
│  │   │   [5] [10] [25] [50] [100]           │                             │  │
│  │   │                                      │                             │  │
│  │   │   [FOLD]                             │                             │  │
│  │   │                                      │                             │  │
│  │   │            ⏱️ 12s                    │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ BETTING (opponent's turn - responding to your bet)                     │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 450        OPPONENT: 500       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │  Category: GEOGRAPHY     POT: 50     │                             │  │
│  │   │                                      │                             │  │
│  │   │  You bet 50                          │                             │  │
│  │   │  Waiting for opponent...             │                             │  │
│  │   │                                      │                             │  │
│  │   │            ⏱️ 8s                     │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ BETTING (opponent raised, your response)                               │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 450        OPPONENT: 400       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │  Category: GEOGRAPHY     POT: 150    │                             │  │
│  │   │                                      │                             │  │
│  │   │  You bet 50, opponent raised to 100  │                             │  │
│  │   │                                      │                             │  │
│  │   │   [MATCH 100]    [FOLD]              │                             │  │
│  │   │                                      │                             │  │
│  │   │            ⏱️ 10s                    │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ CLUE (revealing)                                                       │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 400        OPPONENT: 400       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │  GEOGRAPHY                POT: 200   │                             │  │
│  │   │                                      │                             │  │
│  │   │  This ancient city was the capital   │                             │  │
│  │   │  of an empire located in central     │                             │  │
│  │   │  Mongolia. Founded in 1639 a█        │                             │  │
│  │   │                                      │                             │  │
│  │   │        ┌──────────────────┐          │                             │  │
│  │   │        │      BUZZ!       │          │                             │  │
│  │   │        └──────────────────┘          │                             │  │
│  │   │                                      │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ANSWERING (you buzzed)                                                 │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 400        OPPONENT: 400       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │  GEOGRAPHY                POT: 200   │                             │  │
│  │   │                                      │                             │  │
│  │   │  This ancient city was the capital   │                             │  │
│  │   │  of an empire located in central     │                             │  │
│  │   │  Mongolia. Founded in 1639 a         │                             │  │
│  │   │                                      │                             │  │
│  │   │  ┌────────────────────────────────┐  │                             │  │
│  │   │  │ Ulan bat                    █  │  │                             │  │
│  │   │  └────────────────────────────────┘  │                             │  │
│  │   │         [SUBMIT]      ⏱️ 3s         │                             │  │
│  │   │                                      │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ANSWERING (opponent buzzed)                                            │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 400        OPPONENT: 400       │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │  GEOGRAPHY                POT: 200   │                             │  │
│  │   │                                      │                             │  │
│  │   │  This ancient city was the capital   │                             │  │
│  │   │  of an empire located in central     │                             │  │
│  │   │  Mongolia. Founded in 1639 a         │                             │  │
│  │   │                                      │                             │  │
│  │   │      Opponent is answering...        │                             │  │
│  │   │              ⏱️ 4s                   │                             │  │
│  │   │                                      │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ RESOLUTION (you won)                                                   │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │  YOU: 500 (+100)  OPPONENT: 300      │                             │  │
│  │   │  ─────────────────────────────────── │                             │  │
│  │   │                                      │                             │  │
│  │   │           ✓ CORRECT!                 │                             │  │
│  │   │                                      │                             │  │
│  │   │     Your answer: Ulan Bator          │                             │  │
│  │   │     Correct answer: Ulaanbaatar      │                             │  │
│  │   │                                      │                             │  │
│  │   │          +100 points                 │                             │  │
│  │   │                                      │                             │  │
│  │   │     Next question in 2s...           │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ COMPLETE                                                               │  │
│  │                                                                        │  │
│  │   ┌──────────────────────────────────────┐                             │  │
│  │   │                                      │                             │  │
│  │   │           🏆 YOU WIN! 🏆              │                             │  │
│  │   │                                      │                             │  │
│  │   │     Final Score                      │                             │  │
│  │   │     ───────────                      │                             │  │
│  │   │     YOU: 650                         │                             │  │
│  │   │     OPPONENT: 350                    │                             │  │
│  │   │                                      │                             │  │
│  │   │     Q1: ✓ +100                       │                             │  │
│  │   │     Q2: ✗ -50                        │                             │  │
│  │   │     Q3: ✓ +100                       │                             │  │
│  │   │                                      │                             │  │
│  │   │   [PLAY AGAIN]   [LEAVE]             │                             │  │
│  │   │                                      │                             │  │
│  │   └──────────────────────────────────────┘                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagram: Complete Question Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEQUENCE: ONE COMPLETE QUESTION                           │
│                                                                              │
│  P1 (Client)              Server                    P2 (Client)              │
│      │                       │                           │                   │
│      │                       │                           │                   │
│      │    PHASE_CATEGORY     │      PHASE_CATEGORY       │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │   category:"Geography"│                           │                   │
│      │                       │                           │                   │
│      │                    (3 sec)                        │                   │
│      │                       │                           │                   │
│      │    PHASE_BETTING      │      PHASE_BETTING        │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  awaitingAction:P1    │                           │                   │
│      │                       │                           │                   │
│      │                       │                           │                   │
│      │──BET {amount:50}─────▶│                           │                   │
│      │                       │                           │                   │
│      │    BET_PLACED         │      BET_PLACED           │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  pot:50, awaiting:P2  │                           │                   │
│      │                       │                           │                   │
│      │                       │◀──MATCH──────────────────│                   │
│      │                       │                           │                   │
│      │    BET_PLACED         │      BET_PLACED           │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  pot:100, awaiting:null                           │                   │
│      │                       │                           │                   │
│      │    PHASE_CLUE         │      PHASE_CLUE           │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  clue:"This ancient.."│  pot:100                  │                   │
│      │                       │                           │                   │
│      │    CLUE_TICK {idx:12} │      CLUE_TICK            │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │                       │                           │                   │
│      │    CLUE_TICK {idx:24} │      CLUE_TICK            │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │                       │                           │                   │
│      │──BUZZ────────────────▶│                           │                   │
│      │                       │                           │                   │
│      │    BUZZED             │      BUZZED               │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  player:P1            │  answerDeadline:+5s       │                   │
│      │                       │                           │                   │
│      │──ANSWER {text:"Ulan Bator"}                       │                   │
│      │─────────────────────▶│                           │                   │
│      │                       │                           │                   │
│      │   (server validates)  │                           │                   │
│      │                       │                           │                   │
│      │  ANSWER_SUBMITTED     │    ANSWER_SUBMITTED       │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  correct:true         │                           │                   │
│      │                       │                           │                   │
│      │  PHASE_RESOLUTION     │    PHASE_RESOLUTION       │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  outcome:P1_WIN       │                           │                   │
│      │  balanceChanges:      │                           │                   │
│      │    P1:+100, P2:-100   │                           │                   │
│      │                       │                           │                   │
│      │                    (3 sec)                        │                   │
│      │                       │                           │                   │
│      │  PHASE_CATEGORY (Q2)  │    PHASE_CATEGORY         │                   │
│      │◀──────────────────────┼──────────────────────────▶│                   │
│      │  firstActor:P2        │                           │                   │
│      │                       │                           │                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ERROR HANDLING                                     │
│                                                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ INVALID ACTIONS                                                        │  │
│  │                                                                        │  │
│  │ If client sends an action that's not valid for current state:          │  │
│  │                                                                        │  │
│  │   - Server ignores the action                                          │  │
│  │   - Server sends ERROR message with code + explanation                 │  │
│  │   - Game state unchanged                                               │  │
│  │                                                                        │  │
│  │ Examples:                                                              │  │
│  │   - BUZZ during BETTING phase → ERROR "not_clue_phase"                 │  │
│  │   - BET when it's opponent's turn → ERROR "not_your_turn"              │  │
│  │   - BET amount > balance → ERROR "insufficient_balance"                │  │
│  │   - FOLD with no folds remaining → ERROR "no_folds_remaining"          │  │
│  │   - BUZZ when already buzzed → ERROR "already_buzzed"                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ DISCONNECT HANDLING (MVP: Not Implemented)                             │  │
│  │                                                                        │  │
│  │ For MVP/POC:                                                           │  │
│  │   - If either player disconnects, match is abandoned                   │  │
│  │   - No reconnect logic                                                 │  │
│  │   - No forfeit/penalty                                                 │  │
│  │                                                                        │  │
│  │ Future:                                                                │  │
│  │   - 30 second reconnect window                                         │  │
│  │   - Auto-fold/timeout during betting if disconnected                   │  │
│  │   - Forfeit if disconnected during clue/answer                         │  │
│  │   - Full state sync on reconnect via ROOM_STATE message                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ RACE CONDITIONS                                                        │  │
│  │                                                                        │  │
│  │ Simultaneous buzzes:                                                   │  │
│  │   - Server uses arrival order (first message processed wins)           │  │
│  │   - Loser receives BUZZED message showing other player won the buzz    │  │
│  │   - Their BUZZ is ignored (they're still AVAILABLE, can buzz later)    │  │
│  │   - Note: "first to server" not "first to click" — accept this         │  │
│  │     for MVP, latency fairness is a V2 problem                          │  │
│  │                                                                        │  │
│  │ Bet + timeout race:                                                    │  │
│  │   - If BET arrives just as timeout fires, BET wins                     │  │
│  │   - Server cancels pending timeout when valid action received          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Open Questions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OPEN QUESTIONS                                     │
│                                                                              │
│  All major game mechanics have been resolved. No open questions remain.      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ RESOLVED DECISIONS                                                     │  │
│  │                                                                        │  │
│  │ ✓ Fold rules: Pot goes to other player. Folder loses their             │  │
│  │   contribution. If pot is 0, nothing changes hands.                    │  │
│  │                                                                        │  │
│  │ ✓ First actor can fold before betting (uses a fold, but pot is 0       │  │
│  │   so no money moves).                                                  │  │
│  │                                                                        │  │
│  │ ✓ Bet tiers: [5, 10, 25, 50, 100]                                      │  │
│  │                                                                        │  │
│  │ ✓ Raise rules: Any amount > current bet, up to raiser's balance.       │  │
│  │                                                                        │  │
│  │ ✓ Tie at end of match: True tie, both players leave with starting      │  │
│  │   balance.                                                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Resolve open questions** above
2. **Choose tech stack** (Node.js + Socket.io is likely simplest for MVP)
3. **Build server state machine** first (can test with console logs)
4. **Build minimal client** (two browser tabs)
5. **Create 20-30 test questions** with progressive clues
6. **Playtest with two people**

---

*Document version: 1.0*
*Last updated: [Current date]*
*Status: Ready for review and open question resolution*
