import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const questions = [
    { text: "本日の体調はいかがですか？",                         options: ["良好",      "普通",       "問題あり"] },
    { text: "頭痛・めまい・吐き気などの症状はありますか？",       options: ["なし",      "軽微",       "問題あり"] },
    { text: "視力に違和感（かすみ・ぼやけ）はありませんか？",     options: ["なし",      "少しある",   "問題あり"] },
    { text: "昨晩の睡眠時間はどのくらいですか？",                 options: ["十分",      "やや不足",   "問題あり"] },
    { text: "睡眠の質はいかがでしたか？",                         options: ["良好",      "普通",       "問題あり"] },
    { text: "現在、強い疲労感や眠気を感じていますか？",           options: ["なし",      "少しある",   "問題あり"] },
    { text: "前日にアルコールを摂取しましたか？",                 options: ["していない","少量のみ",   "問題あり"] },
    { text: "現在、酔いや二日酔いの自覚はありますか？",           options: ["なし",      "少しある",   "問題あり"] },
    { text: "運転に影響する薬（眠気を誘う薬等）を服用していますか？", options: ["していない","服用中",  "問題あり"] },
    { text: "現在の気分・精神状態はいかがですか？",               options: ["良好",      "普通",       "問題あり"] },
    { text: "集中力に問題を感じていますか？",                     options: ["感じない",  "少し気になる","問題あり"] },
    { text: "業務に影響するストレスや悩み事はありますか？",       options: ["なし",      "少しある",   "問題あり"] },
];

const Survey = () => {
    const navigate = useNavigate();
    const [answers, setAnswers] = useState(Array(questions.length).fill(null));

    const handleSelect = (qIndex, value) => {
        const newAnswers = [...answers];
        newAnswers[qIndex] = value;
        setAnswers(newAnswers);
    };

    const isComplete = answers.every(a => a !== null);

    const handleSubmit = () => {
        if (isComplete) {
            const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            const unhealthy = answers.filter(a => a === '問題あり').length > 0;

            // 一旦セッションに保存し、最後の送信画面でDBへ送る
            sessionStorage.setItem('currentSurvey', JSON.stringify({
                answers,
                unhealthy
            }));

            navigate('/video');
        }
    };

    return (
        <div className="survey-page">
            <header className="header">
                <h1>健康状態アンケート</h1>
            </header>
            <main style={{ paddingBottom: '80px' }}>
                {questions.map((q, i) => (
                    <div key={i} className="card question-card">
                        <p style={{ fontWeight: '600', marginBottom: '12px' }}>{i + 1}. {q.text}</p>
                        <div className="options">
                            {q.options.map(opt => (
                                <button
                                    key={opt}
                                    className={`option-btn ${answers[i] === opt ? 'selected' : ''}`}
                                    onClick={() => handleSelect(i, opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </main>
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '16px', background: 'white', borderTop: '1px solid #ddd',
                maxWidth: '500px', margin: '0 auto'
            }}>
                <button
                    className="btn btn-primary"
                    disabled={!isComplete}
                    onClick={handleSubmit}
                    style={{ opacity: isComplete ? 1 : 0.5 }}
                >
                    次へ進む
                </button>
            </div>
        </div>
    );
};

export default Survey;
