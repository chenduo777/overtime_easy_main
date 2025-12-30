import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, UserPlus, UserCircle, Users } from 'lucide-react';
import api from '../api/axios';

const Login = () => {
    const [studentId, setStudentId] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [teamId, setTeamId] = useState('');
    const [teams, setTeams] = useState([]);
    const [error, setError] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    // 載入組別列表
    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await api.get('/auth/teams');
                setTeams(response.data.teams);
            } catch (error) {
                console.error('Failed to load teams:', error);
            }
        };
        fetchTeams();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isRegisterMode) {
            // 註冊模式
            if (!name.trim()) {
                setError('請輸入姓名');
                return;
            }
            if (!teamId) {
                setError('請選擇組別');
                return;
            }
            if (password !== confirmPassword) {
                setError('密碼與確認密碼不一致');
                return;
            }
            if (password.length < 6) {
                setError('密碼長度至少需要 6 個字元');
                return;
            }

            const result = await register(studentId, name, password, teamId);
            if (result.success) {
                setError('');
                alert('註冊成功！請登入');
                setIsRegisterMode(false);
                setName('');
                setPassword('');
                setConfirmPassword('');
                setTeamId('');
            } else {
                setError(result.error);
            }
        } else {
            // 登入模式
            const result = await login(studentId, password);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="bg-surface p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4">
                        <img src="/icon.png" alt="Overtime Easy Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Overtime Easy
                    </h1>
                    <p className="text-secondary mt-2">
                        {isRegisterMode ? '註冊新帳戶' : '歡迎回來，請登入'}
                    </p>
                </div>

                {error && (
                    <div className="bg-danger/10 text-danger p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            學號
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-gray-50 focus:bg-white"
                                placeholder="請輸入學號"
                                required
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {isRegisterMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                姓名
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserCircle className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-gray-50 focus:bg-white"
                                    placeholder="請輸入姓名"
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        </div>
                    )}

                    {isRegisterMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                組別 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Users className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={teamId}
                                    onChange={(e) => setTeamId(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-gray-50 focus:bg-white appearance-none"
                                    required
                                >
                                    <option value="">請選擇組別</option>
                                    {teams.map((team) => (
                                        <option key={team.team_id} value={team.team_id}>
                                            {team.team_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            密碼
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-gray-50 focus:bg-white"
                                placeholder="請輸入密碼"
                                required
                                minLength={isRegisterMode ? 6 : undefined}
                                autoComplete={isRegisterMode ? "new-password" : "current-password"}
                            />
                        </div>
                    </div>

                    {isRegisterMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                確認密碼
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-gray-50 focus:bg-white"
                                    placeholder="請再次輸入密碼"
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-warning focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:scale-[1.02]"
                    >
                        {isRegisterMode ? (
                            <><UserPlus className="w-5 h-5 mr-2" />註冊帳戶</>
                        ) : (
                            <><LogIn className="w-5 h-5 mr-2" />登入系統</>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegisterMode(!isRegisterMode);
                            setError('');
                            setName('');
                            setPassword('');
                            setConfirmPassword('');
                            setTeamId('');
                        }}
                        className="text-sm text-primary hover:text-warning font-medium transition-colors"
                    >
                        {isRegisterMode ? '已有帳戶？返回登入' : '還沒有帳戶？立即註冊'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
