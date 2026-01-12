import prisma from "../db/prisma.js";
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
   * Uses database-level random sampling for better performance
   */
  static async getRandomQuestions(count: number): Promise<Question[]> {
    // Get total count first to handle edge cases
    const totalCount = await prisma.question.count();

    if (totalCount === 0) {
      console.error("[GameService] No questions found in database!");
      throw new Error("No questions available in database");
    }

    if (totalCount < count) {
      console.warn(`[GameService] Only ${totalCount} questions available, requested ${count}`);
    }

    // For small datasets, fetch all and shuffle (simpler)
    // For larger datasets (>100), use skip-based sampling for better performance
    let rows;
    if (totalCount <= 100) {
      rows = await prisma.question.findMany();
      // Fisher-Yates shuffle for proper randomization
      for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
      rows = rows.slice(0, count);
    } else {
      // Sample random questions using skip-based approach
      const selectedIndices = new Set<number>();
      while (selectedIndices.size < Math.min(count, totalCount)) {
        selectedIndices.add(Math.floor(Math.random() * totalCount));
      }

      rows = [];
      for (const idx of selectedIndices) {
        const question = await prisma.question.findFirst({
          skip: idx,
          take: 1,
        });
        if (question) rows.push(question);
      }
    }

    if (rows.length === 0) {
      throw new Error("Failed to load questions from database");
    }

    return rows.map((r: any) => ({
      id: r.id,
      category: r.category,
      clue: r.clue,
      acceptedAnswers: r.acceptedAnswers,
      displayAnswer: r.displayAnswer,
    }));
  }
}
