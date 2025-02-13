import express, { Request, Response } from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import dotenv from "dotenv";

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

        // Download cookies from blob storage
        const cookiesUrl = process.env.COOKIES_URL;
        if (!cookiesUrl) {
            return res.status(500).json({ error: "Missing COOKIES_URL in environment variables" });
        }

        const cookiesPath = path.join(process.cwd(), "cookies.txt");
        
        console.log("Downloading cookies...");
        try {
            const cookiesResponse = await fetch(cookiesUrl);
            if (!cookiesResponse.ok) {
                throw new Error(`Failed to fetch cookies, status: ${cookiesResponse.status}`);
            }
            fs.writeFileSync(cookiesPath, await cookiesResponse.text());
        } catch (err) {
            console.error("Error fetching cookies:", err);
            return res.status(500).json({ error: "Failed to fetch cookies" });
        }

        console.log("Downloading audio with yt-dlp...");
        const command = `/usr/bin/env yt-dlp --cookies "${cookiesPath}" --no-check-certificate -x --audio-format mp3 -o ${outputPath} ${videoUrl}`;
        const { stdout, stderr } = await execPromise(command);

        console.log(stdout);
        if (stderr) {
            console.warn("yt-dlp warning:", stderr);
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("Download failed, file not found.");
        }

        res.sendFile(outputPath, async (err) => {
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
