import prisma from "../db/prisma";
import { Question } from "shared";

interface RoundData {
  roundNumber: number;
  category: string;
  clue: string;
  correctAnswer: string;
  potAmount: number;
  player1Bet: number;
  player2Bet: number;
  player1Answer: string | null;
  player2Answer: string | null;
  player1Correct: boolean | null;
  player2Correct: boolean | null;
  winner: string | null;
  player1BalanceAfter: number;
  player2BalanceAfter: number;
}

export class GameService {
  /**
   * Create a new game record
   */
  static async createGame(
    player1DbId: string,
    player2DbId: string,
    winnerId: string | null,
    outcome: string,
    player1FinalBalance: number,
    player2FinalBalance: number,
    player1EloChange: number,
    player2EloChange: number,
    rounds: RoundData[]
  ) {
    const game = await prisma.game.create({
      data: {
        player1Id: player1DbId,
        player2Id: player2DbId,
        winnerId,
        outcome,
        player1FinalBalance,
        player2FinalBalance,
        player1EloChange,
        player2EloChange,
        rounds: {
          create: rounds,
        },
      },
      include: {
        rounds: true,
      },
    });

    console.log(`[GameService] Created game record: ${game.id}`);
    return game;
  }

  /**
   * Get game history for a user
   */
  static async getUserGameHistory(userId: string, limit: number = 20) {
    return await prisma.game.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      take: limit,
      orderBy: { startedAt: "desc" },
      include: {
        player1: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        player2: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        rounds: true,
      },
    });
  }

  /**
   * Get detailed game information
   */
  static async getGameById(gameId: string) {
    return await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        player2: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
      },
    });
  }

  /**
   * Calculate ELO rating change
   * Based on standard ELO formula with K-factor of 32
   */
  static calculateEloChange(
    playerRating: number,
    opponentRating: number,
    didWin: boolean,
    wasTie: boolean = false
  ): number {
    const K = 32;
    const expectedScore =
      1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = wasTie ? 0.5 : didWin ? 1 : 0;
    return Math.round(K * (actualScore - expectedScore));
  }

  /**
   * Fetch a random set of questions from the DB
   */
  static async getRandomQuestions(count: number): Promise<Question[]> {
    const rows = await prisma.question.findMany();
    // Simple shuffle and slice for now
    const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, count);
    return shuffled.map((r) => ({
      id: r.id,
      category: r.category,
      clue: r.clue,
      acceptedAnswers: r.acceptedAnswers,
      displayAnswer: r.displayAnswer,
    }));
  }
}
