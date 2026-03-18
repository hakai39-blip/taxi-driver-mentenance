import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { updateUser, getUsers } from '../utils/db';

const ManagerSettings = () => {
    const navigate = useNavigate();
    const [manager, setManager] = useState(JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        const oldId = JSON.parse(sessionStorage.getItem('currentUser') || '{}').phone;
        const newId = manager.phone;

        try {
            // 1. 管理者情報の更新
            const updatedManager = await updateUser(manager.id, manager);

            if (updatedManager && !updatedManager.error) {
                // 2. ログインID（phone）が変更された場合、紐付く運転手のmanagerIdも更新する
                if (oldId !== newId) {
                    const allUsers = await getUsers();
                    const linkedDrivers = allUsers.filter(u => u.role === 'driver' && u.managerId === oldId);

                    for (const driver of linkedDrivers) {
                        await updateUser(driver.id, { ...driver, managerId: newId });
                    }
                    console.log(`${linkedDrivers.length}名の運転手の紐付けを更新しました。`);
                }

                sessionStorage.setItem('currentUser', JSON.stringify(updatedManager));
                alert("管理者の設定を保存しました。");
                navigate('/manager');
            } else {
                alert(`保存に失敗しました: ${updatedManager?.error || 'サーバーエラー'}`);
            }
        } catch (err) {
            console.error("Manager settings update failed", err);
            alert("接続エラーにより保存できませんでした。");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-page">
            <header className="header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="btn-icon" onClick={() => navigate('/manager')}>
                    <ArrowLeft size={24} />
                </button>
                <h1>管理者設定</h1>
            </header>

            <main style={{ padding: '16px' }}>
                <div className="card" style={{ marginBottom: '20px', background: '#f0f4ff', borderLeft: '4px solid var(--primary-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                        <Shield size={20} />
                        <span>セキュリティ設定</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        ログインIDを変更すると、現在紐付いている運転手側の設定も自動的に更新されます。
                    </p>
                </div>

                <form className="card" onSubmit={handleSave}>
                    <div style={{ marginBottom: '16px' }}>
                        <label>管理者名称</label>
                        <input
                            type="text"
                            value={manager.name}
                            onChange={(e) => setManager({ ...manager, name: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>ログインID (現在のID: {manager.phone})</label>
                        <input
                            type="text"
                            value={manager.phone}
                            onChange={(e) => setManager({ ...manager, phone: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>パスワード</label>
                        <input
                            type="password"
                            value={manager.password}
                            onChange={(e) => setManager({ ...manager, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Save size={20} />
                        {saving ? '保存中...' : '管理情報を保存'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default ManagerSettings;
