import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { updateUser, isValidPhone } from '../utils/db';

const Settings = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('currentUser') || '{}'));
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();

        // 電話番号バリデーション
        if (!isValidPhone(user.phone)) {
            alert("有効な電話番号を入力してください（10桁または11桁の数字）。");
            return;
        }

        setSaving(true);

        if (!user.id) {
            alert("ユーザーIDが見つかりません。一度ログアウトして再度ログインしてください。");
            setSaving(false);
            return;
        }

        try {
            const res = await updateUser(user.id, user);

            if (res && !res.error) {
                sessionStorage.setItem('currentUser', JSON.stringify(res));
                alert("設定を保存しました。");
                navigate('/home');
            } else {
                alert(`保存に失敗しました: ${res?.error || 'サーバーエラー'}`);
            }
        } catch (err) {
            console.error("Save failed", err);
            alert("接続エラーにより保存できませんでした。");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-page">
            <header className="header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="btn-icon" onClick={() => navigate('/home')}>
                    <ArrowLeft size={24} />
                </button>
                <h1>設定</h1>
            </header>

            <main style={{ padding: '16px' }}>
                <form className="card" onSubmit={handleSave}>
                    <div style={{ marginBottom: '16px' }}>
                        <label>氏名</label>
                        <input
                            type="text"
                            value={user.name}
                            onChange={(e) => setUser({ ...user, name: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>電話番号</label>
                        <input
                            type="text"
                            value={user.phone}
                            onChange={(e) => setUser({ ...user, phone: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>車両番号</label>
                        <input
                            type="text"
                            value={user.carNumber}
                            onChange={(e) => setUser({ ...user, carNumber: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>運行管理者ID</label>
                        <input
                            type="text"
                            value={user.managerId || ''}
                            onChange={(e) => setUser({ ...user, managerId: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Save size={20} />
                        {saving ? '保存中...' : '変更を保存'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default Settings;
