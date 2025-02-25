import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import ytdl from "@distube/ytdl-core";
import { generateTranscript } from "./transcript";

dotenv.config();

const PORT = process.env.PORT || 8001;
const app = express();
app.use(express.json());

app.post("/download", async (req: Request, res: Response): Promise<any> => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: "Missing videoUrl parameter" });
    }

    // Generate a unique filename
    const videoId =
      videoUrl.split("v=")[1]?.split("&")[0] || `audio_${Date.now()}`;
    const tmpDir = path.join(process.cwd(), "tmp");
    const outputPath = path.join(tmpDir, `${videoId}.mp3`);

    // Ensure tmp directory exists
    try {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    } catch (mkdirErr) {
      console.error("Error creating tmp directory:", mkdirErr);
      return res
        .status(500)
        .json({ error: "Failed to create temporary directory" });
    }

    console.log("Downloading audio with yt-dlp...");
    const agent = ytdl.createAgent(
      JSON.parse(fs.readFileSync("./cookies.json", "utf-8"))
    );
    const stream = ytdl(videoUrl, {
      filter: "audioonly",
      quality: "highestaudio",
      requestOptions: {
        headers: {
          cookie: fs.readFileSync("./cookies.json", "utf-8"),
        },
      },
    });
    stream.pipe(fs.createWriteStream(outputPath));
    stream.on("error", (err) => {
      console.error("Download error:", err);
      return res.status(500).json({ error: "Failed to download video" });
    });
    stream.on("progress", (chunkLength, downloaded, total) => {
      const percent = (downloaded / total) * 100;
      console.log(`Downloaded ${percent.toFixed(2)}%`);
    });
    stream.on("end", () => {
      console.log("Download complete");
    });

    // Wait for download to complete before sending file
    await new Promise((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error("Download failed, file not found.");
    }

    return res.sendFile(outputPath, async (err) => {
      if (err) {
        console.error("Error sending file:", err);
        return res.status(500).json({ error: "Error sending file" });
      }
      try {
        await fs.promises.unlink(outputPath);
        console.log(`Deleted file: ${outputPath}`);
      } catch (unlinkErr) {
        console.error("Error deleting file:", unlinkErr);
      }
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return res.status(500).json({ error: "Failed to process video" });
  }
});

app.get("/transcript", async (req: Request, res: Response): Promise<any> => {
  try {
    const videoUrl = req.query["link"];
    if (!videoUrl) {
      return res.status(400).json({ error: "Missing videoUrl parameter" });
    }

    const url  = await generateTranscript(videoUrl as string);
    return res.send({ apifyStorageUrl: url });
  } catch (error: any) {
    console.error("Error:", error.message);
    return res.status(500).json({ error: "Failed to retrieve transcript" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
