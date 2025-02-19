import express, { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import dotenv from "dotenv";
import fetch from 'node-fetch';
import ytdl from "@distube/ytdl-core";

dotenv.config();

const PORT = process.env.PORT || 8001;
const execPromise = promisify(exec);
const app = express();
app.use(express.json());

app.post("/download", async (req: Request, res: Response): Promise<any> => {
    try {
        const { videoUrl } = req.body;
        if (!videoUrl) {
            return res.status(400).json({ error: "Missing videoUrl parameter" });
        }

        // Generate a unique filename
        const videoId = videoUrl.split("v=")[1]?.split("&")[0] || `audio_${Date.now()}`;
        const outputPath = path.join("/tmp", `${videoId}.mp3`);

        console.log("Downloading audio with yt-dlp...");
        const agent = ytdl.createAgent(JSON.parse(fs.readFileSync("cookies.json", "utf-8")));
        const stream = ytdl(videoUrl, { filter: "audioonly", quality: "highestaudio" });
        stream.pipe(fs.createWriteStream(outputPath));
        stream.on("error", (err) => {
            console.error("Download error:", err);
            return res.status(500).json({ error: "Failed to download video" });
        });
        stream.on("progress", (chunkLength, downloaded, total) => {
            const percent = downloaded / total * 100;
            console.log(`Downloaded ${percent.toFixed(2)}%`);
        });
        stream.on("end", () => {
            console.log("Download complete");
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
