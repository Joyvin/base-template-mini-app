"use server";

import { db } from "~/server/db";
import axios from "axios";

const topics = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
] as const;

export type Topic = (typeof topics)[number];

const alpha = 0.1; // learning rate
const gamma = 0.9; // discount factor
const epsilon = 0.2; // exploration probability

function getReward(isLiked: boolean): number {
  return isLiked ? 1 : -1;
}

export function getRandomTopic(): Topic {
  return topics[Math.floor(Math.random() * topics.length)];
}

export async function getNextTopicWithFeedback(
  currentTopic: Topic,
  isLiked: boolean
): Promise<Topic> {
  // 1️⃣ Update Q-table based on feedback
  const reward = getReward(isLiked);

  const futureEntries = await db.qTable.findMany({
    where: { state: currentTopic },
  });

  const maxFutureQ = futureEntries.length
    ? Math.max(...futureEntries.map((e: any) => e.qValue))
    : 0;

  const entry = await db.qTable.findUnique({
    where: { state_action: { state: currentTopic, action: "recommend_topic" } },
  });

  const currQ = entry ? entry.qValue : 0;
  const newQ = currQ + alpha * (reward + gamma * maxFutureQ - currQ);

  await db.qTable.upsert({
    where: { state_action: { state: currentTopic, action: "recommend_topic" } },
    create: {
      state: currentTopic,
      action: "recommend_topic",
      nextState: getRandomTopic(), // temporary, will be chosen below
      qValue: newQ,
    },
    update: {
      qValue: newQ,
    },
  });

  // 2️⃣ Choose next topic (epsilon-greedy)
  const entries = await db.qTable.findMany({
    where: { state: currentTopic },
  });

  if (!entries.length || Math.random() < epsilon) {
    return getRandomTopic();
  }

  const best = entries.reduce((a: any, b: any) =>
    b.qValue > a.qValue ? b : a
  );
  return best.nextState as Topic;
}

export async function getNews(topic: string) {
  const res = await axios.get(
    `https://newsapi.org/v2/top-headlines?category=technology&apiKey=${process.env.NEWS_API}`
  );

  const news = res.data;
  const num = Math.floor(Math.random() * (news.totalResults + 1));

  const title = news.articles[num].title!;

  return title;
}
