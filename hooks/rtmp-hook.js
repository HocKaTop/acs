import express from "express";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const STREAMS_DIR = "/home/deck/Documents/streamview/acs/streams";

app.post("/on_publish", (req, res) => {
  const { streamId } = req.body;

  console.log("Stream started:", streamId);

  // Создаем папку для стрима
  const dir = path.join(STREAMS_DIR, streamId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Запускаем ffmpeg
  const ffmpeg = spawn("ffmpeg", [
    "-i", `rtmp://localhost/live/${streamId}`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "10",
    "-hls_flags", "delete_segments+append_list+omit_endlist",
    "-reset_timestamps", "1",
    "-hls_segment_filename", `${dir}/segment_%d.ts`,
    `${dir}/index.m3u8`
  ]);

  ffmpeg.stdout.on("data", (d) => console.log("[ffmpeg]", d.toString()));
  ffmpeg.stderr.on("data", (d) => console.log("[ffmpeg ERR]", d.toString()));
  ffmpeg.on("close", () => console.log("FFmpeg stopped"));

  res.json({ ok: true });
});

// чтобы проверить работу
app.get("/", (req, res) => res.send("RTMP hook server running"));

app.listen(5001, () => console.log("RTMP hook server listening on 5001"));
