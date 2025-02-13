import express, {type Request, Response} from "express";
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
        if (!videoUrl) return 

        // Generate a unique filename
        const videoId = videoUrl.split("v=")[1]?.split("&")[0] || `audio_${Date.now()}`;
        const outputPath = path.join("/tmp", `${videoId}.mp3`);

        console.log("Downloading with yt-dlp...");
        const { stderr } = await execPromise(`yt-dlp -x --audio-format mp3 -o ${outputPath} ${videoUrl}`);

        if (stderr) {
            console.error("Error downloading video:", stderr);
            throw new Error("Failed to download video");
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("Download failed, file not found.");
        }

        return res.sendFile(outputPath, (err) => {
            if (err) {
                console.error("Error sending file:", err);
            }
            fs.unlinkSync(outputPath);
        });

    } catch (error: any) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Failed to process video" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
