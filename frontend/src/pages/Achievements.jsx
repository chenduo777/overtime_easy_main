import React, { useState, useEffect } from 'react';
import { Award, Lock, CheckCircle, Users, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';
import clsx from 'clsx';

const Achievements = () => {
    const [allRewards, setAllRewards] = useState([]);
    const [myRewards, setMyRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedReward, setExpandedReward] = useState(null);
    const [earners, setEarners] = useState({});

    useEffect(() => {
        checkAndFetchData();
    }, []);

    const checkAndFetchData = async () => {
        try {
            setLoading(true);
            // 先觸發成就檢查（補發歷史達成的成就）
            await api.post('/reward/check');
            // 再獲取資料
            const [allRes, myRes] = await Promise.all([
                api.get('/reward/all'),
                api.get('/reward/my')
            ]);
            setAllRewards(allRes.data.rewards);
            setMyRewards(myRes.data.rewards);
        } catch (error) {
            console.error('Failed to fetch achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEarners = async (rewardId) => {
        if (earners[rewardId]) return; // 已經載入過
        try {
            const res = await api.get(`/reward/earners/${rewardId}`);
            setEarners(prev => ({ ...prev, [rewardId]: res.data.earners }));
        } catch (error) {
            console.error('Failed to fetch earners:', error);
        }
    };

    const toggleExpand = (rewardId) => {
        if (expandedReward === rewardId) {
            setExpandedReward(null);
        } else {
            setExpandedReward(rewardId);
            fetchEarners(rewardId);
        }
    };

    const isEarned = (rewardId) => myRewards.some(r => r.reward_id === rewardId);

    const getEarnedAt = (rewardId) => {
        const reward = myRewards.find(r => r.reward_id === rewardId);
        return reward?.earned_at;
    };

    const getLevelConfig = (level) => {
        switch (level) {
            case 'Gold':
                return {
                    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
                    border: 'border-yellow-400',
                    text: 'text-yellow-700',
                    badge: 'bg-yellow-500',
                    icon: '/gold.jpg'
                };
            case 'Silver':
                return {
                    bg: 'bg-gradient-to-br from-gray-50 to-slate-100',
                    border: 'border-gray-400',
                    text: 'text-gray-700',
                    badge: 'bg-gray-500',
                    icon: '/silver.jpg'
                };
            case 'Bronze':
            default:
                return {
                    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
                    border: 'border-orange-400',
                    text: 'text-orange-700',
                    badge: 'bg-orange-500',
                    icon: '/bronze.jpg'
                };
        }
    };

    const getLevelLabel = (level) => {
        switch (level) {
            case 'Gold': return '🥇 金級成就';
            case 'Silver': return '🥈 銀級成就';
            case 'Bronze': return '🥉 銅級成就';
            default: return level;
        }
    };

    // 按等級分組
    const groupedRewards = {
        Gold: allRewards.filter(r => r.level === 'Gold'),
        Silver: allRewards.filter(r => r.level === 'Silver'),
        Bronze: allRewards.filter(r => r.level === 'Bronze')
    };

    const earnedCount = myRewards.length;
    const totalCount = allRewards.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* 頁面標題 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Award className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                        成就系統
                    </h2>
                    <p className="text-secondary text-sm sm:text-base mt-1">
                        已解鎖 <span className="font-bold text-primary">{earnedCount}</span> / {totalCount} 個成就
                    </p>
                </div>

                {/* 進度條 */}
                <div className="w-full sm:w-48">
                    <div className="flex justify-between text-xs sm:text-sm text-secondary mb-1">
                        <span>完成進度</span>
                        <span>{totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-primary to-warning transition-all duration-500"
                            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 成就列表 - 按等級分組 */}
            {['Gold', 'Silver', 'Bronze'].map(level => (
                groupedRewards[level].length > 0 && (
                    <div key={level} className="mb-6 sm:mb-8">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                            {getLevelLabel(level)}
                            <span className="text-xs sm:text-sm font-normal text-secondary">
                                ({groupedRewards[level].filter(r => isEarned(r.reward_id)).length}/{groupedRewards[level].length})
                            </span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {groupedRewards[level].map(reward => {
                                const earned = isEarned(reward.reward_id);
                                const config = getLevelConfig(reward.level);
                                const earnedAt = getEarnedAt(reward.reward_id);
                                const isExpanded = expandedReward === reward.reward_id;
                                const rewardEarners = earners[reward.reward_id] || [];

                                return (
                                    <div
                                        key={reward.reward_id}
                                        className={clsx(
                                            'relative rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 transition-all duration-300',
                                            earned
                                                ? `${config.bg} ${config.border} shadow-lg`
                                                : 'bg-gray-50 border-gray-200 opacity-60 grayscale'
                                        )}
                                    >
                                        {/* 等級圖示 - 右上角 */}
                                        <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                                            <img
                                                src={config.icon}
                                                alt={reward.level}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* 成就內容 */}
                                        <div className="flex items-start gap-2 sm:gap-3 pr-6 sm:pr-8">
                                            <div className={clsx(
                                                'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0',
                                                earned ? config.badge : 'bg-gray-300'
                                            )}>
                                                {earned 
                                                    ? <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                    : <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className={clsx(
                                                    'font-bold text-base sm:text-lg',
                                                    earned ? config.text : 'text-gray-500'
                                                )}>
                                                    {reward.title}
                                                </h4>
                                                <p className="text-sm text-secondary mt-1">
                                                    {reward.description}
                                                </p>

                                                {/* 獲得時間 */}
                                                {earned && earnedAt && (
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        🎉 {new Date(earnedAt).toLocaleDateString('zh-TW')} 獲得
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 完成人數 & 展開按鈕 */}
                                        <div className="mt-3 pt-3 border-t border-gray-200/50">
                                            <button
                                                onClick={() => toggleExpand(reward.reward_id)}
                                                className="w-full flex items-center justify-between text-sm text-secondary hover:text-gray-700 transition-colors"
                                            >
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {reward.earned_count} 人已完成
                                                </span>
                                                {isExpanded 
                                                    ? <ChevronUp className="w-4 h-4" />
                                                    : <ChevronDown className="w-4 h-4" />
                                                }
                                            </button>

                                            {/* 完成者名單 */}
                                            {isExpanded && (
                                                <div className="mt-2 max-h-32 overflow-y-auto">
                                                    {rewardEarners.length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {rewardEarners.map((earner, idx) => (
                                                                <li 
                                                                    key={earner.student_id}
                                                                    className="text-xs text-gray-600 flex items-center gap-2"
                                                                >
                                                                    <span className="w-5 text-center font-mono text-gray-400">
                                                                        #{idx + 1}
                                                                    </span>
                                                                    <span className="font-medium">{earner.name}</span>
                                                                    <span className="text-gray-400 ml-auto">
                                                                        {new Date(earner.earned_at).toLocaleDateString('zh-TW')}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 text-center py-2">
                                                            尚無人完成此成就
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            ))}

            {/* 空狀態 */}
            {allRewards.length === 0 && (
                <div className="text-center py-12 text-secondary">
                    <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>尚未設定任何成就</p>
                </div>
            )}
        </div>
    );
};

export default Achievements;
