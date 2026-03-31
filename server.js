import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// アップロード用ディレクトリの作成
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Neon DB への接続
// .env の DATABASE_URL を使ってクラウドのDBに繋ぐ
const sql = neon(process.env.DATABASE_URL);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// 動画ファイルを静的ファイルとして公開（動画はDBではなくサーバーのフォルダに保存）
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Users ---

// ユーザー一覧を取得する
app.get('/api/users', async (req, res) => {
    try {
        const users = await sql`SELECT * FROM users`;
        // フロントエンドが期待するキー名に合わせて変換（car_number → carNumber など）
        res.json(users.map(toUserJson));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// 新しいユーザーを登録する
app.post('/api/users', async (req, res) => {
    try {
        const { id = Date.now().toString(), role, name, phone, carNumber, managerId, password } = req.body;
        const [user] = await sql`
            INSERT INTO users (id, role, name, phone, car_number, manager_id, password)
            VALUES (${id}, ${role}, ${name}, ${phone ?? null}, ${carNumber ?? null}, ${managerId ?? null}, ${password ?? null})
            RETURNING *
        `;
        res.json(toUserJson(user));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// ユーザー情報を更新する（一部だけ変更）
app.patch('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, carNumber, managerId, password, role } = req.body;

        // 現在のデータを取得してから、変更された部分だけ上書きする
        const [current] = await sql`SELECT * FROM users WHERE id = ${id}`;
        if (!current) return res.status(404).json({ error: 'User not found' });

        const [updated] = await sql`
            UPDATE users SET
                name       = ${name       ?? current.name},
                phone      = ${phone      ?? current.phone},
                car_number = ${carNumber  ?? current.car_number},
                manager_id = ${managerId  ?? current.manager_id},
                password   = ${password   ?? current.password},
                role       = ${role       ?? current.role}
            WHERE id = ${id}
            RETURNING *
        `;
        res.json(toUserJson(updated));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// ユーザーを削除する
app.delete('/api/users/:id', async (req, res) => {
    try {
        await sql`DELETE FROM users WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// --- Checks ---

// 全チェック記録を取得する
app.get('/api/checks', async (req, res) => {
    try {
        const checks = await sql`SELECT * FROM checks ORDER BY timestamp`;
        res.json(checks.map(toCheckJson));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// 新しいチェック記録を保存する
app.post('/api/checks', async (req, res) => {
    try {
        const { userId, survey, unhealthy, video } = req.body;
        const id = Date.now();
        const timestamp = new Date().toISOString();

        const [check] = await sql`
            INSERT INTO checks (id, timestamp, user_id, survey, unhealthy, video_completed, video_url, video_timestamp)
            VALUES (
                ${id},
                ${timestamp},
                ${userId},
                ${JSON.stringify(survey ?? [])}::jsonb,
                ${unhealthy ?? false},
                ${video?.completed ?? false},
                ${video?.url ?? null},
                ${video?.timestamp ?? null}
            )
            RETURNING *
        `;
        res.json(toCheckJson(check));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// --- Statuses ---

// 全ユーザーのステータスを取得する
// フロントエンドが { userId: { ...status } } の形を期待しているので変換する
app.get('/api/status', async (req, res) => {
    try {
        const rows = await sql`SELECT * FROM statuses`;
        const result = {};
        for (const row of rows) {
            result[row.user_id] = toStatusJson(row);
        }
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// ユーザーのステータスを更新する（存在しなければ新規作成）
app.patch('/api/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { waitingForManager, requestedMeeting, driverConfirmed, managerApproved, platform } = req.body;

        // 現在のステータスを取得（なければデフォルト値を使う）
        const [current] = await sql`SELECT * FROM statuses WHERE user_id = ${userId}`;
        const base = current ?? {
            waiting_for_manager: false,
            requested_meeting: false,
            driver_confirmed: false,
            manager_approved: false,
            platform: null
        };

        // UPSERT: 存在すれば更新、なければ挿入
        const [updated] = await sql`
            INSERT INTO statuses (user_id, waiting_for_manager, requested_meeting, driver_confirmed, manager_approved, platform)
            VALUES (
                ${userId},
                ${waitingForManager  ?? base.waiting_for_manager},
                ${requestedMeeting  ?? base.requested_meeting},
                ${driverConfirmed   ?? base.driver_confirmed},
                ${managerApproved   ?? base.manager_approved},
                ${platform          ?? base.platform}
            )
            ON CONFLICT (user_id) DO UPDATE SET
                waiting_for_manager = EXCLUDED.waiting_for_manager,
                requested_meeting   = EXCLUDED.requested_meeting,
                driver_confirmed    = EXCLUDED.driver_confirmed,
                manager_approved    = EXCLUDED.manager_approved,
                platform            = EXCLUDED.platform
            RETURNING *
        `;
        res.json(toStatusJson(updated));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'DB error' });
    }
});

// --- Video Upload ---

// 動画をサーバーのフォルダに保存する（動画はDBには入れない）
app.post('/api/upload-video', (req, res) => {
    const { videoData, userId } = req.body;
    if (!videoData) return res.status(400).json({ error: 'No video data' });

    const fileName = `video_${userId}_${Date.now()}.mp4`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Base64（テキスト形式）からバイナリファイルに変換して保存
    const base64Data = videoData.replace(/^data:video\/mp4;base64,/, "");

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error("Video save error", err);
            return res.status(500).json({ error: 'Failed to save video' });
        }
        res.json({ videoUrl: `/uploads/${fileName}` });
    });
});

// --- 変換ヘルパー ---
// DBのカラム名（スネークケース: car_number）をJSONのキー名（キャメルケース: carNumber）に変換する
// スネークケース = 単語をアンダースコアでつなぐ（DB標準）
// キャメルケース = 単語の先頭を大文字にする（JavaScript標準）

function toUserJson(row) {
    return {
        id:        row.id,
        role:      row.role,
        name:      row.name,
        phone:     row.phone,
        carNumber: row.car_number,
        managerId: row.manager_id,
        password:  row.password,
    };
}

function toCheckJson(row) {
    return {
        id:        Number(row.id),
        timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
        userId:    row.user_id,
        survey:    row.survey ?? [],
        unhealthy: row.unhealthy,
        video: {
            completed: row.video_completed,
            url:       row.video_url ?? undefined,
            timestamp: row.video_timestamp instanceof Date ? row.video_timestamp.toISOString() : row.video_timestamp ?? undefined,
        },
    };
}

function toStatusJson(row) {
    return {
        waitingForManager: row.waiting_for_manager,
        requestedMeeting:  row.requested_meeting,
        driverConfirmed:   row.driver_confirmed,
        managerApproved:   row.manager_approved,
        platform:          row.platform,
    };
}

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
