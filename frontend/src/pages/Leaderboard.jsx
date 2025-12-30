import React, { useState, useEffect } from 'react';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { Trophy, Medal, Calendar, Users, User } from 'lucide-react';
import api from '../api/axios';
import clsx from 'clsx';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month'); // 'week', 'month' or 'year'
    const [viewType, setViewType] = useState('individual'); // 'individual' or 'team'

    useEffect(() => {
        fetchLeaderboard();
    }, [period, viewType]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const now = new Date();
            let periodParam = '';

            if (period === 'month') {
                periodParam = now.toISOString().substring(0, 7);
            } else if (period === 'week') {
                const year = getISOWeekYear(now);
                const week = getISOWeek(now);
                periodParam = `${year}-W${String(week).padStart(2, '0')}`;
            } else {
                periodParam = now.getFullYear().toString();
            }

            const endpoint = viewType === 'team' 
                ? '/stats/leaderboard/team' 
                : '/stats/leaderboard/overtime';

            const response = await api.get(endpoint, {
                params: { period: periodParam }
            });
            setLeaderboard(response.data.rankings);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankStyle = (index) => {
        switch (index) {
            case 0: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 1: return 'bg-gray-100 text-gray-700 border-gray-200';
            case 2: return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-white text-gray-600 border-gray-100';
        }
    };

    const getRankIcon = (index) => {
        switch (index) {
            case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 1: return <Medal className="w-6 h-6 text-gray-500" />;
            case 2: return <Medal className="w-6 h-6 text-orange-500" />;
            default: return <span className="text-lg font-bold w-6 text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        加班時數排行榜
                    </h2>
                    <p className="text-secondary text-sm sm:text-base mt-1">查看大家的努力成果</p>
                </div>

                <div className="flex flex-col gap-2">
                    {/* 個人/組別切換 */}
                    <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setViewType('individual')}
                            className={clsx(
                                'px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1',
                                viewType === 'individual'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-secondary hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            <User className="w-3 h-3 sm:w-4 sm:h-4" />
                            個人
                        </button>
                        <button
                            onClick={() => setViewType('team')}
                            className={clsx(
                                'px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1',
                                viewType === 'team'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-secondary hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                            組別
                        </button>
                    </div>

                    {/* 時間週期切換 */}
                    <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setPeriod('week')}
                            className={clsx(
                                'px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
                                period === 'week'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-secondary hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            本週
                        </button>
                        <button
                            onClick={() => setPeriod('month')}
                            className={clsx(
                                'px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
                                period === 'month'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-secondary hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            本月
                        </button>
                        <button
                            onClick={() => setPeriod('year')}
                            className={clsx(
                                'px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
                                period === 'year'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-secondary hover:text-gray-900 hover:bg-gray-50'
                            )}
                        >
                            本年
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 手機版卡片式列表 */}
                <div className="sm:hidden p-3 space-y-3">
                    {leaderboard.map((item, index) => (
                        <div
                            key={viewType === 'team' ? item.teamId : item.studentId}
                            className={clsx(
                                'flex items-center gap-3 p-3 rounded-xl border',
                                getRankStyle(index)
                            )}
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center border bg-white">
                                {getRankIcon(index)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 truncate flex items-center gap-1">
                                    {viewType === 'team' && <Users className="w-4 h-4 text-primary flex-shrink-0" />}
                                    {viewType === 'team' ? item.teamName : item.name}
                                </div>
                                <div className="text-xs text-secondary">
                                    {viewType === 'team' ? `${item.memberCount} 人` : item.studentId}
                                </div>
                            </div>
                            <span className={clsx(
                                'inline-flex items-center px-2 py-1 rounded-full font-bold text-sm',
                                viewType === 'team' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                            )}>
                                {item.totalOvertimeHours}h
                            </span>
                        </div>
                    ))}
                    {leaderboard.length === 0 && (
                        <div className="py-12 text-center text-secondary">
                            目前尚無數據
                        </div>
                    )}
                </div>

                {/* 電腦版表格 */}
                <div className="hidden sm:block overflow-x-auto">
                    {viewType === 'individual' ? (
                        /* 個人排行榜 */
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-sm font-medium text-secondary">排名</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-secondary">姓名</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-secondary">學號</th>
                                    <th className="px-6 py-4 text-right text-sm font-medium text-secondary">加班總時數</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaderboard.map((item, index) => (
                                    <tr
                                        key={item.studentId}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className={clsx(
                                                'w-10 h-10 rounded-full flex items-center justify-center border',
                                                getRankStyle(index)
                                            )}>
                                                {getRankIcon(index)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-secondary font-mono">
                                            {item.studentId}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-orange-600 font-bold">
                                                {item.totalOvertimeHours}h
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-secondary">
                                            目前尚無數據
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* 組別排行榜 */
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-sm font-medium text-secondary">排名</th>
                                    <th className="px-6 py-4 text-left text-sm font-medium text-secondary">組別名稱</th>
                                    <th className="px-6 py-4 text-center text-sm font-medium text-secondary">成員數</th>
                                    <th className="px-6 py-4 text-right text-sm font-medium text-secondary">組別總加班時數</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaderboard.map((item, index) => (
                                    <tr
                                        key={item.teamId}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className={clsx(
                                                'w-10 h-10 rounded-full flex items-center justify-center border',
                                                getRankStyle(index)
                                            )}>
                                                {getRankIcon(index)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-primary" />
                                                {item.teamName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-secondary">
                                            {item.memberCount} 人
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold">
                                                {item.totalOvertimeHours}h
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-secondary">
                                            目前尚無數據
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Bottom Right Decorative Image - Champion Badge */}
            <div className="fixed bottom-4 right-4 w-24 h-24 md:w-32 md:h-32 lg:w-48 lg:h-48 rounded-full overflow-hidden border-2 md:border-4 border-yellow-400 shadow-xl z-0 opacity-90 transform hover:scale-105 transition-all duration-300 bg-white">
                <img
                    src="/numberone.jpg"
                    alt="Number One"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default Leaderboard;
