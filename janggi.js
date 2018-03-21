const KING = 1;
const MINISTER = 2;
const GENERAL = 3;
const MAN = 4;
const FEUDAL_LORD = 5;

const PLAYER = 1;
const OPPONENT = 2;

const COORDINATES = [[0,0], [1,0], [2,0], [0,1], [1,1], [2,1], [0,2], [1,2], [2,2], [0,3], [1,3], [2,3]];

// Board has 12 squares, from 1-12 starting with the upper left corner
const INITIAL_BOARD_STATE = [
  {
    SquareId: 0,
    Piece: GENERAL,
    Player: OPPONENT
  },
  {
    SquareId: 1,
    Piece: KING,
    Player: OPPONENT
  },
  {
    SquareId: 2,
    Piece: MINISTER,
    Player: OPPONENT
  },
  {
    SquareId: 3,
    Piece: 0,
    Player: 0
  },
  {
    SquareId: 4,
    Piece: MAN,
    Player: OPPONENT
  },
  {
    SquareId: 5,
    Piece: 0,
    Player: 0
  },
  {
    SquareId: 6,
    Piece: 0,
    Player: 0
  },
  {
    SquareId: 7,
    Piece: MAN,
    Player: PLAYER
  },
  {
    SquareId: 8,
    Piece: 0,
    Player: 0
  },
  {
    SquareId: 9,
    Piece: MINISTER,
    Player: PLAYER
  },
  {
    SquareId: 10,
    Piece: KING,
    Player: PLAYER
  },
  {
    SquareId: 11,
    Piece: GENERAL,
    Player: PLAYER
  }
];

const INITIAL_CAPTURE_STATE = {
  Player: {
    Men: 0,
    Generals: 0,
    Ministers: 0
  },
  Opponent: {
    Men: 0,
    Generals: 0,
    Ministers: 0
  }
}

function getManMoves(player, location) {
  var result = [];

  // man can always move to the square directly in front of it
  if (player === PLAYER) {
    result.push(location - 3);
  } else {
    result.push(location + 3);
  }

  return result;
}

function getGeneralMoves(location) {
  var result = [];

  // not on left edge
  if (COORDINATES[location][0] != 0) {
    result.push(location - 1);
  }
  // not on right edge
  if (COORDINATES[location][0] != 2) {
    result.push(location + 1);
  }
  // not in back row
  if (COORDINATES[location][1] != 0) {
    result.push(location - 3);
  }
  // not in front row
  if (COORDINATES[location][1] != 3) {
    result.push(location + 3);
  }

  return result;
}

function getMinisterMoves(location) {
  var result = [];

  // upper left is on the board
  if (COORDINATES[location][0] != 0 && COORDINATES[location][1] != 0) {
    result.push(location - 4);
  }
  // upper right is on the board
  if (COORDINATES[location][0] != 2 && COORDINATES[location][1] != 0) {
    result.push(location - 2);
  }
  // bottom left is on the board
  if (COORDINATES[location][0] != 0 && COORDINATES[location][1] != 3) {
    result.push(location + 2);
  }
  // bottom right is on the board
  if (COORDINATES[location][0] != 2 && COORDINATES[location][1] != 3) {
    result.push(location + 4);
  }

  return result;
}

function getFeudalLordMoves(player, location) {
  var result = [];

  // add only front diagonals
  if (player === PLAYER) {
    // upper left is on the board
    if (COORDINATES[location][0] != 0 && COORDINATES[location][1] != 0) {
      result.push(location - 4);
    }
    // upper right is on the board
    if (COORDINATES[location][0] != 2 && COORDINATES[location][1] != 0) {
      result.push(location - 2);
    }
  } else {
    // bottom left is on the board
    if (COORDINATES[location][0] != 0 && COORDINATES[location][1] != 3) {
      result.push(location + 2);
    }
    // bottom right is on the board
    if (COORDINATES[location][0] != 2 && COORDINATES[location][1] != 3) {
      result.push(location - 4);
    }
  }

  // add all general moves
  result = result.concat(getGeneralMoves(location));

  return result;
}

function getKingMoves(location) {
  var result = [];

  // king is minister + general
  result = result.concat(getMinisterMoves(location));
  result = result.concat(getGeneralMoves(location));

  return result;
}

class JanggiGame {
  constructor(allowHomeRowPlacement) {
    this.boardState = INITIAL_BOARD_STATE.slice();
    this.captureState = Object.assign({}, INITIAL_CAPTURE_STATE);

    // Make sure it's a bool
    this.disallowHomeRowPlacement = !allowHomeRowPlacement;

    this.playerKingTurnCount = 0;
    this.opponentKingTurnCount = 0;

    this.whoseTurn = 1;

    this.gameWinner = 0;
  }

  endGame(winningPlayer) {
    if (winningPlayer === PLAYER) {
      this.gameWinner = 1;
    } else if (winningPlayer === OPPONENT) {
      this.gameWinner = 2;
    } else {
      this.gameWinner = 3;
    }
  }

  processMove(player, startSpace, endSpace) {
    if (!this.isMoveLegal(player, startSpace, endSpace)) {
      this.announceIllegalMove();
      return false;
    } else {
      var piece;

      // figure out what the relevant piece is
      if (startSpace > -1) {
        piece = this.boardState[startSpace].Piece;
      } else {
        piece = startSpace * -1;
      }

      // capture opponent's piece if appropriate
      if (this.boardState[endSpace].Piece != 0) {
        this.capturePiece(player, this.boardState[endSpace].Piece);
      }

      // if piece is not played from reserve, set starting space to empty
      if (startSpace > -1) {
        this.boardState[startSpace].Piece = 0;
        this.boardState[startSpace].Player = 0;
      } else {
        // if piece is played from reserve, reduce reserve capacity for that piece by 1
        this.reduceReserves(player, piece);
      }

      // put piece in new square
      this.boardState[endSpace].Player = player;
      if (piece === MAN && startSpace > -1 && (endSpace < 3 || endSpace > 8)) {
        this.boardState[endSpace].Piece = FEUDAL_LORD;
      } else {
        this.boardState[endSpace].Piece = piece;
      }

      // check status of each king
      this.checkKingStatuses();

      // change whose turn it is
      if (this.whoseTurn === PLAYER) {
        this.whoseTurn = OPPONENT;
      } else {
        this.whoseTurn = PLAYER;
      }

      // the move worked! tell the document so it can propagate changes
      return true;
    }
  }

  // checks to see if game is over or close to being over based on king positions
  checkKingStatuses() {
    if (this.boardState[0].Player === PLAYER && this.boardState[0].Piece === KING
     || this.boardState[1].Player === PLAYER && this.boardState[1].Piece === KING
     || this.boardState[2].Player === PLAYER && this.boardState[2].Piece === KING) {
       this.playerKingTurnCount++;
    } else {
      this.playerKingTurnCount = 0;
    }

    if (this.boardState[9].Player === OPPONENT && this.boardState[9].Piece === KING
     || this.boardState[10].Player === OPPONENT && this.boardState[10].Piece === KING
     || this.boardState[11].Player === OPPONENT && this.boardState[11].Piece === KING) {
       this.opponentKingTurnCount++;
    } else {
      this.opponentKingTurnCount = 0;
    }

    if (this.playerKingTurnCount > 1) {
      this.endGame(PLAYER);
    }
    if (this.opponentKingTurnCount > 1) {
      this.endGame(OPPONENT);
    }
  }

  isMoveLegal(player, startSpace, endSpace) {
    var piece;

    // both start space and end space must be on the board, unless startSpace = -1, and then it's placing a captured piece
    if (startSpace > 11 || startSpace < -5 || endSpace > 11 || endSpace < 0) {
      return false;
    }

    if (startSpace < 0) {
      // Piece is being played from reserve
      piece = startSpace * -1;

      // Player must have such a piece in reserve
      if (!this.checkReserves(player, piece)) {
        return false;
      }

      // end space must not contain any piece
      if(this.boardState[endSpace].Player != 0) {
        return false;
      }

      // if home row placements are disallowed, space must not be in opponent's home row
      if (this.disallowHomeRowPlacement) {
        if (player === PLAYER && endSpace < 3) {
          return false;
        }

        if (player === OPPONENT && endSpace > 8) {
          return false;
        }
      }

    } else {
      // Piece is being moved on the board

      // end space must not contain player's piece
      if (this.boardState[endSpace].Player === player) {
        return false;
      }

      // player must have a piece in the start space
      if (this.boardState[startSpace].Player != player) {
        return false;
      } else {
        piece = this.boardState[startSpace].Piece;
      }

      // player must be moving to a space where that piece is allowed to go
      if (!this.getLegalSpaces(player, piece, startSpace).includes(endSpace)) {
        return false;
      }
    }

    return true;
  }

  checkReserves(player, piece) {
    if (player === PLAYER) {
      switch (piece) {
        case FEUDAL_LORD:
          return false;
          break;
        case MAN:
          return this.captureState.Player.Men > 0;
          break;
        case GENERAL:
          return this.captureState.Player.Generals > 0;
          break;
        case MINISTER:
          return this.captureState.Player.Ministers > 0;
          break;
        case KING:
          return false;
          break;
        default:
          console.log("An error has occurred while seeing if a piece is in a player's reserves.");
          return false;
          break;
      }
    } else {
      switch (piece) {
        case FEUDAL_LORD:
          return false;
          break;
        case MAN:
          return this.captureState.Opponent.Men > 0;
          break;
        case GENERAL:
          return this.captureState.Opponent.Generals > 0;
          break;
        case MINISTER:
          return this.captureState.Opponent.Ministers > 0;
          break;
        case KING:
          return false;
          break;
        default:
          console.log("An error has occurred while seeing if a piece is in a player's reserves.");
          return false;
          break;
      }
    }
  }

  reduceReserves(player, piece) {
    if (player === PLAYER) {
      switch (piece) {
        case FEUDAL_LORD:
          console.log("Error: tried to reduce feudal lords in reserve.");
          break;
        case MAN:
          this.captureState.Player.Men--;
          break;
        case GENERAL:
          this.captureState.Player.Generals--;
          break;
        case MINISTER:
          this.captureState.Player.Ministers--;
          break;
        case KING:
          console.log("Error: tried to reduce kings in reserve.");
          break;
        default:
          console.log("An error has occurred while deploying a piece from reserve.");
          break;
      }
    } else {
      switch (piece) {
        case FEUDAL_LORD:
          console.log("Error: tried to reduce feudal lords in reserve.");
          break;
        case MAN:
          this.captureState.Opponent.Men--;
          break;
        case GENERAL:
          this.captureState.Opponent.Generals--;
          break;
        case MINISTER:
          this.captureState.Opponent.Ministers--;
          break;
        case KING:
          console.log("Error: tried to reduce kings in reserve.");
          break;
        default:
          console.log("An error has occurred while deploying a piece from reserve.");
          break;
      }
    }
  }

  capturePiece(capturingPlayer, piece) {
    if (capturingPlayer === PLAYER) {
      switch (piece) {
        // Feudal Lords become men
        case FEUDAL_LORD:
          this.captureState.Player.Men++;
          break;
        case MAN:
          this.captureState.Player.Men++;
          break;
        case GENERAL:
          this.captureState.Player.Generals++;
          break;
        case MINISTER:
          this.captureState.Player.Ministers++;
          break;
        case KING:
          this.endGame(PLAYER);
          break;
        default:
          console.log("An error has occurred while capturing a piece.");
          break;
      }
    } else {
      switch (piece) {
        // Feudal Lords become men
        case FEUDAL_LORD:
          this.captureState.Opponent.Men++;
          break;
        case MAN:
          this.captureState.Opponent.Men++;
          break;
        case GENERAL:
          this.captureState.Opponent.Generals++;
          break;
        case MINISTER:
          this.captureState.Opponent.Ministers++;
          break;
        case KING:
          this.endGame(OPPONENT);
          break;
        default:
          console.log("An error has occurred while capturing a piece.");
          break;
      }
    }
  }

  // TODO - tell user move is illegal instead of logging it to the console
  announceIllegalMove() {
    console.log("that move is illegal");
  }

  getLegalSpaces(player, piece, location) {
    if (!player || !piece || location < 0 || location > 11) {
      // throw error
      return [];
    }

    var result = [];

    switch (piece) {
      case MAN:
        result = getManMoves(player, location);
        break;
      case FEUDAL_LORD:
        result = getFeudalLordMoves(player, location);
        break;
      case GENERAL:
        result = getGeneralMoves(location);
        break;
      case MINISTER:
        result = getMinisterMoves(location);
        break;
      case KING:
        result = getKingMoves(location);
        break;
      default:
        // throw error;
    }

    return result;
  }
}
