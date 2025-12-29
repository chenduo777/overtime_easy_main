import React, { useState, useEffect } from 'react';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import { Trophy, Medal, Calendar } from 'lucide-react';
import api from '../api/axios';
import clsx from 'clsx';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month'); // 'month' or 'year'

    useEffect(() => {
        fetchLeaderboard();
    }, [period]);

    const fetchLeaderboard = async () => {
        try {
            const now = new Date();
            let periodParam = '';

            if (period === 'month') {
                // Format: YYYY-MM
                periodParam = now.toISOString().substring(0, 7);
            } else if (period === 'week') {
                // Format: YYYY-Www
                const year = getISOWeekYear(now);
                const week = getISOWeek(now);
                periodParam = `${year}-W${String(week).padStart(2, '0')}`;
            } else {
                // Format: YYYY
                periodParam = now.getFullYear().toString();
            }

            const response = await api.get('/stats/leaderboard/overtime', {
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
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-8 h-8 text-primary" />
                        加班時數排行榜
                    </h2>
                    <p className="text-secondary mt-1">查看大家的努力成果</p>
                </div>

                <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setPeriod('week')}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
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
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
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
                            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            period === 'year'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-secondary hover:text-gray-900 hover:bg-gray-50'
                        )}
                    >
                        本年
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
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
