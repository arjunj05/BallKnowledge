/**
 * Seed script to populate the Question table with trivia questions
 * Run with: npm run seed:questions
 */

import dotenv from "dotenv";
import prisma from "../db/prisma";
import questions from "../data/questions.json";

// Load environment variables from .env file
dotenv.config();

async function seedQuestions() {
  console.log("Starting question seed...");

  try {
    // Clear existing questions (optional - comment out if you want to keep existing)
    const deleteCount = await prisma.question.deleteMany({});
    console.log(`Deleted ${deleteCount.count} existing questions`);

    // Insert questions from JSON
    let insertedCount = 0;
    for (const question of questions) {
      await prisma.question.create({
        data: {
          id: question.id,
          category: question.category,
          clue: question.clue,
          acceptedAnswers: question.acceptedAnswers,
          displayAnswer: question.displayAnswer,
          createdBy: "seed-script", // Mark as seeded
        },
      });
      insertedCount++;
      console.log(`✓ Inserted: ${question.displayAnswer} (${question.category})`);
    }

    console.log(`\n✅ Successfully seeded ${insertedCount} questions!`);
  } catch (error) {
    console.error("❌ Error seeding questions:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedQuestions()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
