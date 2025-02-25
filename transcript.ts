import ytdl from "@distube/ytdl-core";
import { ApifyClient } from "apify-client";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const apiToken = process.env.APIFY_API_TOKEN;

if (!apiToken) {
  throw new Error(
    "❌ APIFY_API_TOKEN is missing. Please check your environment variables."
  );
}

const client = new ApifyClient({ token: apiToken });

export async function generateTranscript(videoUrl: string): Promise<string> {
  try {
    console.log(`🚀 Generating transcript for video: ${videoUrl}`);

    // ✅ Validate YouTube URL
    try {
      ytdl.getURLVideoID(videoUrl); // This will throw an error if the URL is invalid
    } catch (error) {
      throw new Error("❌ Invalid YouTube video URL");
    }

    // ✅ Prepare Apify Actor Input
    const input = {
      startUrls: [{ url: videoUrl }], // Fix the format for startUrls
      maxDepth: 1,
      subtitlesLanguage: "en", // Change to 'en' or any other language needed
      subtitlesFormat: "srt",
      downloadSubtitles: true,
      saveSubsToKVS: true,
    };

    // ✅ Run Apify Actor
    const run = await client.actor("h7sDV53CddomktSi5").call(input);

    console.log(
      `💾 Check your data here: https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
    );

    // ✅ Fetch Transcript Data
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (!items || items.length === 0) {
      throw new Error("❌ No transcript found.");
    }

    return run.defaultDatasetId;
  } catch (error: any) {
    console.error("❌ Error generating transcript:", error.message);
    throw error;
  }
}
