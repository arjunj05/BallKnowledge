import prisma from "../db/prisma.js";

export class UserService {
  /**
   * Find or create a user by their Clerk ID
   */
  static async findOrCreateUser(clerkId: string, email: string, username?: string, alias?: string) {
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: { stats: true },
    });

    if (!user) {
      // Create new user with initial stats
      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          username,
          alias,
          stats: {
            create: {
              gamesPlayed: 0,
              gamesWon: 0,
              gamesLost: 0,
              gamesTied: 0,
              questionsAnswered: 0,
              questionsCorrect: 0,
              questionsIncorrect: 0,
              totalWinnings: 0,
              highestBalance: 0,
              eloRating: 1200,
              winStreak: 0,
              bestWinStreak: 0,
            },
          },
        },
        include: { stats: true },
      });

      console.log(`[UserService] Created new user: ${email} (${clerkId})`);
    }

    return user;
  }

  /**
   * Get user by database ID
   */
  static async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    });
  }

  /**
   * Get user by Clerk ID
   */
  static async getUserByClerkId(clerkId: string) {
    return await prisma.user.findUnique({
      where: { clerkId },
      include: { stats: true },
    });
  }

  /**
   * Update user stats after a game
   */
  static async updateUserStats(
    userId: string,
    updates: {
      gamesPlayed?: number;
      gamesWon?: number;
      gamesLost?: number;
      gamesTied?: number;
      questionsAnswered?: number;
      questionsCorrect?: number;
      questionsIncorrect?: number;
      totalWinnings?: number;
      highestBalance?: number;
      eloRating?: number;
      winStreak?: number;
      bestWinStreak?: number;
    }
  ) {
    return await prisma.userStats.update({
      where: { userId },
      data: updates,
    });
  }

  /**
   * Update user alias
   */
  static async updateUserAlias(userId: string, alias: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { alias },
      include: { stats: true },
    });
  }

  /**
   * Get user profile with recent games
   */
  static async getUserProfile(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
        gamesAsP1: {
          take: limit,
          orderBy: { startedAt: "desc" },
          include: {
            player2: {
              select: {
                alias: true,
                username: true,
                email: true,
              },
            },
          },
        },
        gamesAsP2: {
          take: limit,
          orderBy: { startedAt: "desc" },
          include: {
            player1: {
              select: {
                alias: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    // Combine and sort games by date
    const allGames = [
      ...user.gamesAsP1.map((game: any) => ({
        ...game,
        isP1: true,
        opponent: game.player2,
      })),
      ...user.gamesAsP2.map((game: any) => ({
        ...game,
        isP1: false,
        opponent: game.player1,
      })),
    ]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);

    return {
      user,
      recentGames: allGames,
    };
  }

  /**
   * Get leaderboard by ELO rating
   */
  static async getLeaderboard(limit: number = 100) {
    return await prisma.userStats.findMany({
      take: limit,
      orderBy: { eloRating: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            alias: true,
          },
        },
      },
    });
  }
}
