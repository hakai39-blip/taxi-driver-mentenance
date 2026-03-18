import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Play, Heart, User } from 'lucide-react';
import { getChecks } from '../utils/db';
import { requestNotificationPermission } from '../utils/notifications';

const Home = () => {
    const navigate = useNavigate();
    const [recentChecks, setRecentChecks] = useState([]);
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

    useEffect(() => {
        // 通知許可を自動で要求（PC: ブラウザダイアログ、iOS PWA: システムダイアログ）
        requestNotificationPermission();

        const fetchHistory = async () => {
            const allChecks = await getChecks();
            const myChecks = allChecks.filter(c => c.userId === user.id).slice(-7).reverse(); // 直近7回分（新しい順）
            setRecentChecks(myChecks);
        };
        fetchHistory();
    }, [user.id]);

    const getHealthMessage = () => {
        if (recentChecks.length === 0) return "点呼データがありません。業務を開始しましょう！";
        const unhealthyCount = recentChecks.filter(c => c.unhealthy).length;
        if (unhealthyCount === 0) return "良い調子です！この調子で安全運転を続けましょう。";
        if (unhealthyCount < 2) return "少しお疲れのようです。適度な休憩を心がけてください。";
        return "健康に気を使いましょう。無理は禁物です。";
    };

    return (
        <div className="home-page">
            <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>ホーム</h1>
                <button className="btn-icon" onClick={() => navigate('/settings')} title="設定">
                    <Settings size={24} />
                </button>
            </header>

            <main style={{ padding: '16px' }}>
                {/* ユーザープロフィール概要 */}
                <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'var(--primary-color)', color: 'white', padding: '12px', borderRadius: '50%' }}>
                        <User size={32} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px' }}>{user.name} さん</h2>
                        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>車両: {user.carNumber} | 管理者ID: {user.managerId}</p>
                    </div>
                </div>

                {/* 健康履歴グラフ */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Heart size={20} color="var(--error-color)" />
                        <h3 style={{ margin: 0 }}>健康の履歴（直近7回）</h3>
                    </div>

                    <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        {Array.from({ length: 7 }, (_, i) => {
                            const check = recentChecks[i] ?? null;
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{
                                        width: '100%',
                                        height: '60px',
                                        background: check
                                            ? (check.unhealthy ? 'var(--error-color)' : 'var(--success-color)')
                                            : '#ccc',
                                        opacity: check ? 0.85 : 0.35,
                                        borderRadius: '4px 4px 0 0'
                                    }}></div>
                                    <span style={{ fontSize: '10px', color: '#bbb' }}>{i + 1}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'var(--bg-color)', borderLeft: '4px solid var(--primary-color)' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                            {getHealthMessage()}
                        </p>
                    </div>
                </div>

                {/* 業務チェック開始ボタン */}
                <button
                    className="btn btn-primary"
                    style={{ height: '80px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
                    onClick={() => navigate('/survey')}
                >
                    <Play size={24} fill="white" />
                    業務チェックを開始
                </button>
            </main>
        </div>
    );
};

export default Home;
