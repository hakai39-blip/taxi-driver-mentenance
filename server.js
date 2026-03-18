import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// アップロード用ディレクトリの作成
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const app = express();
// 動画送信用に制限を大きくする
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// 動画ファイルを静的ファイルとして公開
app.use('/uploads', express.static(UPLOADS_DIR));

// データの読み込み
const loadData = () => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.error("Failed to load data, using defaults", e);
        }
    }
    return {
        users: [
            { id: 'u1', role: 'driver', name: '山田 太郎', phone: '09011112222', carNumber: '1234', managerId: 'admin' },
            { id: 'm1', role: 'manager', name: '管理者A', phone: 'admin', password: 'taxi1234' }
        ],
        checks: [],
        statuses: {}
    };
};

let db = loadData();

// データの保存
const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("Failed to save data", e);
    }
};

// Users
app.get('/api/users', (req, res) => res.json(db.users));
app.post('/api/users', (req, res) => {
    const newUser = { id: Date.now().toString(), ...req.body };
    db.users.push(newUser);
    saveData();
    res.json(newUser);
});

// Update User
app.patch('/api/users/:id', (req, res) => {
    const { id } = req.params;
    console.log(`PATCH /api/users/${id} called with:`, req.body);
    const index = db.users.findIndex(u => String(u.id) === String(id));
    if (index !== -1) {
        db.users[index] = { ...db.users[index], ...req.body };
        saveData();
        console.log(`User ${id} updated successfully`);
        res.json(db.users[index]);
    } else {
        console.warn(`User with ID ${id} not found. Current users:`, db.users.map(u => u.id));
        res.status(404).json({ error: 'User not found' });
    }
});

// Checks
app.get('/api/checks', (req, res) => res.json(db.checks));
app.post('/api/checks', (req, res) => {
    const newCheck = { id: Date.now(), timestamp: new Date().toISOString(), ...req.body };
    db.checks.push(newCheck);
    saveData();
    res.json(newCheck);
});

// Status
app.get('/api/status', (req, res) => res.json(db.statuses));
app.patch('/api/status/:userId', (req, res) => {
    const { userId } = req.params;
    db.statuses[userId] = { ...db.statuses[userId], ...req.body };
    saveData();
    res.json(db.statuses[userId]);
});

// Video Upload (Base64)
app.post('/api/upload-video', (req, res) => {
    const { videoData, userId } = req.body;
    if (!videoData) return res.status(400).json({ error: 'No video data' });

    const fileName = `video_${userId}_${Date.now()}.mp4`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Base64からバイナリへ変換 (data:video/mp4;base64,... を除去)
    const base64Data = videoData.replace(/^data:video\/mp4;base64,/, "");

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error("Video save error", err);
            return res.status(500).json({ error: 'Failed to save video' });
        }
        res.json({ videoUrl: `/uploads/${fileName}` });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
