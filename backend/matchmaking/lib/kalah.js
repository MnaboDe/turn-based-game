export function createInitialBoard() {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

export function getPlayerSide(match, playerId) {
  if (match.player1 === playerId) {
    return "player1";
  }

  if (match.player2 === playerId) {
    return "player2";
  }

  return null;
}

export function getPlayerIndexes(side) {
  if (side === "player1") {
    return {
      pitStart: 0,
      pitEnd: 5,
      storeIndex: 6,
      opponentStoreIndex: 13,
    };
  }

  if (side === "player2") {
    return {
      pitStart: 7,
      pitEnd: 12,
      storeIndex: 13,
      opponentStoreIndex: 6,
    };
  }

  throw new Error("Invalid player side");
}

export function toGlobalPitIndex(side, localPitIndex) {
  if (!Number.isInteger(localPitIndex) || localPitIndex < 0 || localPitIndex > 5) {
    throw new Error("Invalid pit index");
  }

  if (side === "player1") {
    return localPitIndex;
  }

  if (side === "player2") {
    return 7 + localPitIndex;
  }

  throw new Error("Invalid player side");
}

export function isPlayersPit(index, side) {
  if (side === "player1") {
    return index >= 0 && index <= 5;
  }

  if (side === "player2") {
    return index >= 7 && index <= 12;
  }

  return false;
}

export function getOppositePitIndex(index) {
  return 12 - index;
}

export function isSideEmpty(board, side) {
  const { pitStart, pitEnd } = getPlayerIndexes(side);
  return board.slice(pitStart, pitEnd + 1).every((stones) => stones === 0);
}

export function collectRemainingStones(board) {
  const nextBoard = [...board];

  const player1Remaining = nextBoard.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const player2Remaining = nextBoard.slice(7, 13).reduce((sum, value) => sum + value, 0);

  for (let i = 0; i <= 5; i += 1) {
    nextBoard[i] = 0;
  }

  for (let i = 7; i <= 12; i += 1) {
    nextBoard[i] = 0;
  }

  nextBoard[6] += player1Remaining;
  nextBoard[13] += player2Remaining;

  return nextBoard;
}

export function getWinner(match, board) {
  const player1Score = board[6];
  const player2Score = board[13];

  if (player1Score > player2Score) {
    return match.player1;
  }

  if (player2Score > player1Score) {
    return match.player2;
  }

  return "draw";
}

export function applyMove(match, playerId, localPitIndex) {
  const side = getPlayerSide(match, playerId);

  if (!side) {
    throw new Error("Player is not part of this match");
  }

  if (match.state !== "active") {
    throw new Error("Match is not active");
  }

  if (match.turn !== playerId) {
    throw new Error("It is not your turn");
  }

  const {
    storeIndex,
    opponentStoreIndex,
  } = getPlayerIndexes(side);

  const board = Array.isArray(match.board) ? [...match.board] : createInitialBoard();
  const globalPitIndex = toGlobalPitIndex(side, localPitIndex);
  const stones = board[globalPitIndex];

  if (stones <= 0) {
    throw new Error("Selected pit is empty");
  }

  board[globalPitIndex] = 0;

  let currentIndex = globalPitIndex;
  let stonesToSow = stones;

  while (stonesToSow > 0) {
    currentIndex = (currentIndex + 1) % 14;

    if (currentIndex === opponentStoreIndex) {
      continue;
    }

    board[currentIndex] += 1;
    stonesToSow -= 1;
  }

  let capture = false;
  const endedInStore = currentIndex === storeIndex;
  const landedOnOwnEmptyPit =
    isPlayersPit(currentIndex, side) && board[currentIndex] === 1;

  if (landedOnOwnEmptyPit) {
    const oppositePitIndex = getOppositePitIndex(currentIndex);
    const oppositePitStones = board[oppositePitIndex];

    if (oppositePitStones > 0) {
      board[storeIndex] += board[currentIndex] + oppositePitStones;
      board[currentIndex] = 0;
      board[oppositePitIndex] = 0;
      capture = true;
    }
  }

  const player1SideEmpty = isSideEmpty(board, "player1");
  const player2SideEmpty = isSideEmpty(board, "player2");

  let state = "active";
  let winner = null;
  let finishedAt = null;
  let turn = endedInStore
    ? playerId
    : match.player1 === playerId
      ? match.player2
      : match.player1;

  if (player1SideEmpty || player2SideEmpty) {
    const finalBoard = collectRemainingStones(board);

    state = "finished";
    winner = getWinner(match, finalBoard);
    finishedAt = new Date().toISOString();
    turn = null;

    return {
      board: finalBoard,
      turn,
      state,
      winner,
      finishedAt,
      movesCount: Number(match.movesCount ?? 0) + 1,
      lastMove: {
        playerId,
        pitIndex: localPitIndex,
        endedInStore,
        capture,
        extraTurn: endedInStore,
      },
    };
  }

  return {
    board,
    turn,
    state,
    winner,
    finishedAt,
    movesCount: Number(match.movesCount ?? 0) + 1,
    lastMove: {
      playerId,
      pitIndex: localPitIndex,
      endedInStore,
      capture,
      extraTurn: endedInStore,
    },
  };
}