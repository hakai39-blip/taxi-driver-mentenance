// データベースのテーブルを作成するセットアップスクリプト
// 初回一回だけ実行する: node db/setup.js

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function setup() {
    console.log('テーブルを作成中...');

    // users テーブル
    // ユーザー情報（ドライバー・管理者）を保存する
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            role        TEXT NOT NULL,
            name        TEXT NOT NULL,
            phone       TEXT,
            car_number  TEXT,
            manager_id  TEXT,
            password    TEXT
        )
    `;
    console.log('✓ users テーブル作成');

    // checks テーブル
    // 運転前点呼チェックの記録を保存する
    // survey は選択肢の配列なので JSONB 型（JSON形式のまま保存できる）
    await sql`
        CREATE TABLE IF NOT EXISTS checks (
            id              BIGINT PRIMARY KEY,
            timestamp       TIMESTAMPTZ NOT NULL,
            user_id         TEXT NOT NULL,
            survey          JSONB,
            unhealthy       BOOLEAN DEFAULT FALSE,
            video_completed BOOLEAN DEFAULT FALSE,
            video_url       TEXT,
            video_timestamp TIMESTAMPTZ
        )
    `;
    console.log('✓ checks テーブル作成');

    // statuses テーブル
    // 各ドライバーの現在の状態（管理者承認待ちなど）を保存する
    // user_id を主キーにすることで、ユーザーごとに1件だけ存在する
    await sql`
        CREATE TABLE IF NOT EXISTS statuses (
            user_id             TEXT PRIMARY KEY,
            waiting_for_manager BOOLEAN DEFAULT FALSE,
            requested_meeting   BOOLEAN DEFAULT FALSE,
            driver_confirmed    BOOLEAN DEFAULT FALSE,
            manager_approved    BOOLEAN DEFAULT FALSE,
            platform            TEXT
        )
    `;
    console.log('✓ statuses テーブル作成');

    // 初期データを挿入（既に存在する場合はスキップ）
    console.log('初期データを挿入中...');

    await sql`
        INSERT INTO users (id, role, name, phone, car_number, manager_id, password) VALUES
            ('u1', 'driver',  '山田 太郎', '09011112222', '1234', 'manager_test', NULL),
            ('u2', 'driver',  '佐藤 次郎', '08055556666', '5678', 'manager_sub',  NULL),
            ('m1', 'manager', '管理者B',   'manager_test', NULL,   NULL, 'newpass123'),
            ('m2', 'manager', 'サブ管理者', 'manager_sub', NULL,   NULL, 'pass567')
        ON CONFLICT (id) DO NOTHING
    `;
    console.log('✓ 初期ユーザーデータ挿入');

    console.log('\nセットアップ完了！');
}

setup().catch((err) => {
    console.error('セットアップ失敗:', err);
    process.exit(1);
});
