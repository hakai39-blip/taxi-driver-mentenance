import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, addUser, normalizePhone, isValidPhone } from '../utils/db';

const Register = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('driver');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        carNumber: '',
        managerId: '', // 追加
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 電話番号のバリデーション
        if (!isValidPhone(formData.phone)) {
            alert("有効な電話番号を入力してください（10桁または11桁の数字）。ハイフンはあってもなくても構いません。");
            return;
        }

        const users = await getUsers();
        const inputPhone = normalizePhone(formData.phone);

        // 重複チェック (正規化された電話番号で比較)
        if (users.find(u => normalizePhone(u.phone) === inputPhone)) {
            alert("この電話番号/IDは既に登録されています");
            return;
        }

        if (role === 'manager' && !formData.password) {
            alert("管理者はパスワードが必要です");
            return;
        }

        await addUser({ ...formData, role });
        const users_after = await getUsers();
        const newUser = users_after.find(u => normalizePhone(u.phone) === inputPhone);
        sessionStorage.setItem('currentUser', JSON.stringify(newUser));
        alert("アカウントを作成しました。");
        navigate(role === 'manager' ? '/manager' : '/home');
    };

    return (
        <div className="register-page">
            <header className="header">
                <h1>アカウント作成</h1>
            </header>
            <main className="card">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                        className={`btn ${role === 'driver' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setRole('driver')}
                        style={{ flex: 1, padding: '10px', fontSize: '14px' }}
                    >
                        運転手
                    </button>
                    <button
                        className={`btn ${role === 'manager' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setRole('manager')}
                        style={{ flex: 1, padding: '10px', fontSize: '14px' }}
                    >
                        運行管理者
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label>{role === 'driver' ? '氏名' : '管理者名'}</label>
                        <input
                            type="text"
                            placeholder="例: 山田 太郎"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label>{role === 'driver' ? '電話番号' : '管理者ID (電話番号等)'}</label>
                        <input
                            type="text"
                            placeholder="090-xxxx-xxxx"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>
                    {role === 'driver' ? (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label>車両番号</label>
                                <input
                                    type="text"
                                    placeholder="1234"
                                    value={formData.carNumber}
                                    onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label>運行管理者ID</label>
                                <input
                                    type="text"
                                    placeholder="管理者から聞いたIDを入力"
                                    value={formData.managerId}
                                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div style={{ marginBottom: '16px' }}>
                            <label>パスワード (初期設定)</label>
                            <input
                                type="password"
                                placeholder="パスワードを入力"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary">登録する</button>
                    <button type="button" className="btn btn-outline" style={{ marginTop: '8px' }} onClick={() => navigate('/')}>戻る</button>
                </form>
            </main>
        </div>
    );
};

export default Register;
