import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.resolve('data.json')
const UPLOADS_DIR = path.resolve('uploads')

const defaultData = () => ({
  users: [
    { id: 'u1', role: 'driver', name: '山田 太郎', phone: '09011112222', carNumber: '1234', managerId: 'admin' },
    { id: 'm1', role: 'manager', name: '管理者A', phone: 'admin', password: 'taxi1234' }
  ],
  checks: [],
  statuses: {}
});

const loadData = () => {
  if (fs.existsSync(DATA_FILE)) {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { }
  }
  return defaultData();
};

const saveData = (db) => {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); } catch (e) { }
};

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); } });
  });
}

function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
      const db = loadData();

      // /uploads の静的ファイル配信
      server.middlewares.use('/uploads', (req, res, next) => {
        const fileName = req.url.replace(/^\//, '').split('?')[0];
        const filePath = path.join(UPLOADS_DIR, fileName);
        if (fileName && fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'video/mp4');
          fs.createReadStream(filePath).pipe(res);
        } else {
          next();
        }
      });

      // /api エンドポイント
      server.middlewares.use('/api', async (req, res, next) => {
        const db = loadData(); // 常に最新のファイルを読み込む
        const url = req.url.split('?')[0];
        res.setHeader('Content-Type', 'application/json');

        try {
          // GET /api/users
          if (url === '/users' && req.method === 'GET') {
            return res.end(JSON.stringify(db.users));
          }
          // POST /api/users
          if (url === '/users' && req.method === 'POST') {
            const body = await parseBody(req);
            const newUser = { id: Date.now().toString(), ...body };
            db.users.push(newUser);
            saveData(db);
            return res.end(JSON.stringify(newUser));
          }
          // PATCH /api/users/:id
          if (url.startsWith('/users/') && req.method === 'PATCH') {
            const id = url.replace('/users/', '');
            const body = await parseBody(req);
            const index = db.users.findIndex(u => u.id === id);
            if (index !== -1) {
              db.users[index] = { ...db.users[index], ...body };
              saveData(db);
              return res.end(JSON.stringify(db.users[index]));
            }
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'User not found' }));
          }
          // DELETE /api/users/:id
          if (url.startsWith('/users/') && req.method === 'DELETE') {
            const id = url.replace('/users/', '');
            const index = db.users.findIndex(u => u.id === id);
            if (index !== -1) {
              db.users.splice(index, 1);
              saveData(db);
              return res.end(JSON.stringify({ success: true }));
            }
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'User not found' }));
          }
          // GET /api/checks
          if (url === '/checks' && req.method === 'GET') {
            return res.end(JSON.stringify(db.checks));
          }
          // POST /api/checks
          if (url === '/checks' && req.method === 'POST') {
            const body = await parseBody(req);
            const newCheck = { id: Date.now(), timestamp: new Date().toISOString(), ...body };
            db.checks.push(newCheck);
            saveData(db);
            return res.end(JSON.stringify(newCheck));
          }
          // GET /api/status
          if (url === '/status' && req.method === 'GET') {
            return res.end(JSON.stringify(db.statuses));
          }
          // PATCH /api/status/:userId
          if (url.startsWith('/status/') && req.method === 'PATCH') {
            const userId = url.replace('/status/', '');
            const body = await parseBody(req);
            db.statuses[userId] = { ...db.statuses[userId], ...body };
            saveData(db);
            return res.end(JSON.stringify(db.statuses[userId]));
          }
          // POST /api/upload-video
          if (url === '/upload-video' && req.method === 'POST') {
            const body = await parseBody(req);
            const { videoData, userId } = body;
            if (!videoData) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'No video data' }));
            }
            const fileName = `video_${userId}_${Date.now()}.mp4`;
            const filePath = path.join(UPLOADS_DIR, fileName);
            const base64Data = videoData.replace(/^data:video\/[^;]+;base64,/, '');
            fs.writeFileSync(filePath, base64Data, 'base64');
            return res.end(JSON.stringify({ videoUrl: `/uploads/${fileName}` }));
          }
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), basicSsl(), apiPlugin()],
  server: {
    host: true,
    https: true,
  },
})
