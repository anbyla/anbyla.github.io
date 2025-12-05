import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

let queue = [];
let nowPlaying = null;

app.post("/add", (req, res) => {
    const { title, url, duration } = req.body;
    queue.push({ title, url, duration });
    broadcast({ type: "queueUpdate", queue });
    res.json({ ok: true });
});

// start song if nothin playing
function startNextSong() {
    if (nowPlaying || queue.length === 0) return;

    const next = queue.shift();
    nowPlaying = {
        ...next,
        startTime: Date.now()
    };

    broadcast({ type: "nowPlaying", nowPlaying });

    setTimeout(() => {
        nowPlaying = null;
        startNextSong();
    }, next.duration * 1000);
}

setInterval(startNextSong, 2000);

const server = app.listen(PORT, () =>
    console.log(`Backend running on port ${PORT}`)
);
const wss = new WebSocketServer({ server });

function broadcast(msg) {
    const data = JSON.stringify(msg);
    for (let client of wss.clients) {
        if (client.readyState === 1) client.send(data);
    }
}

wss.on("connection", ws => {
	// rush it
    ws.send(JSON.stringify({ type: "queueUpdate", queue }));
    ws.send(JSON.stringify({ type: "nowPlaying", nowPlaying }));
});

