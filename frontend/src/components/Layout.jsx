import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Calendar, Trophy, LogOut, Menu, X, Terminal, Award } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // 根據用戶角色動態生成導航項目
    const navItems = [
        { path: '/', icon: Clock, label: '打卡' },
        { path: '/overview', icon: Calendar, label: '個人總覽' },
        { path: '/leaderboard', icon: Trophy, label: '排行榜' },
        { path: '/achievements', icon: Award, label: '成就' },
        // Terminal 只對 admin 顯示
        ...(user?.role === 'admin' ? [{ path: '/terminal', icon: Terminal, label: 'Terminal' }] : []),
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-gray-200 h-screen sticky top-0">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <img src="/icon.png" alt="Logo" className="w-8 h-8 object-contain" />
                        Overtime Easy
                    </h1>
                    <p className="text-sm text-secondary mt-2">歡迎, {user?.name}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'text-secondary hover:bg-gray-50 hover:text-primary'
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-secondary hover:bg-red-50 hover:text-danger rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">登出</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden bg-surface border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20">
                <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                    <img src="/icon.png" alt="Logo" className="w-6 h-6 object-contain" />
                    Overtime Easy
                </h1>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-secondary hover:bg-gray-50 rounded-lg"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-black/50 z-10" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Mobile Sidebar */}
            <div
                className={clsx(
                    'md:hidden fixed inset-y-0 left-0 w-64 bg-surface z-20 transform transition-transform duration-300 ease-in-out',
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="p-6 border-b border-gray-100">
                    <p className="text-lg font-bold text-gray-900">{user?.name}</p>
                    <p className="text-sm text-secondary">學生 ID: {user?.studentId}</p>
                </div>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                                    isActive
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'text-secondary hover:bg-gray-50 hover:text-primary'
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-secondary hover:bg-red-50 hover:text-danger rounded-xl transition-colors mt-4"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">登出</span>
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* 瀏覽計數器 - 右上角 (手機版縮小並調整位置避免遮擋選單) */}
            <div className="fixed top-16 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 z-10 opacity-70 hover:opacity-100 transition-opacity scale-75 sm:scale-100 origin-top-right">
                <a href="https://www.stylemap.co.jp/" target="_blank" rel="noopener noreferrer">
                    <img 
                        src="https://www.f-counter.net/j/66/1767085034/" 
                        alt="訪問計數器" 
                    />
                </a>
            </div>
        </div>
    );
};

export default Layout;
