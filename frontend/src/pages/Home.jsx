import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Clock, Play, Square, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import clsx from 'clsx';

// 個性化留言列表
const motivationalMessages = [
    "你今天不打算加班嗎，東西做完了嗎？還敢下班啊！",
    "別人都在加班，就你想當第一個跑的？真有出息喔～",
    "你下班這麼準時，是家裡有人死了嗎？沒有吧那就繼續坐著啊！",
    "哇這麼早要走喔？難怪讀碩四，原來是這種態度～",
    "你知道嗎？當年我做這個專案10分鐘就做完了，做那麼慢還想走？",
    "我們公司不養閒人，你看起來好像很閒喔？",
    "別人都加班到12點，你8點就要跑？想當公司最廢的那一個是嗎？",
    "你媽媽沒教你做人要負責到底嗎？工作沒做完就想溜",
    "你這樣怎麼進nvidia．",
    "我知道啦，不用講了啦，讀碩士就是來認真的，你看起來一點也不認真．"
];

const Home = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [status, setStatus] = useState({ clockIn: null, clockOut: null });
    const [loading, setLoading] = useState(true);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isMoodOpen, setIsMoodOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchStatus();
        return () => clearInterval(timer);
    }, []);

    // 心情小語 3 秒後自動收起
    useEffect(() => {
        if (isMoodOpen) {
            const autoCloseTimer = setTimeout(() => {
                setIsMoodOpen(false);
            }, 3000);
            return () => clearTimeout(autoCloseTimer);
        }
    }, [isMoodOpen]);

    // 頁面載入時隨機顯示一條留言
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
        setCurrentMessage(motivationalMessages[randomIndex]);
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/attendance/today');
            console.log('API Response:', response.data);
            const data = response.data;

            const workHours = data.record?.work_minutes ? (data.record.work_minutes / 60).toFixed(1) : null;
            const overtimeHours = data.record?.overtime_minutes ? (data.record.overtime_minutes / 60).toFixed(1) : null;

            if (data.hasClocked) {
                setStatus({
                    clockIn: data.record.clock_in,
                    clockOut: data.record.clock_out,
                    workHours,
                    overtimeHours,
                });
            } else {
                // If not clocked in, but we have records for today, show totals
                setStatus({
                    clockIn: null,
                    clockOut: null,
                    workHours,
                    overtimeHours
                });
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClock = async (type) => {
        try {
            await api.post('/attendance/clock', { type });
            await fetchStatus();
        } catch (error) {
            console.error('Clock action failed:', error);
            // alert(error.response?.data?.error || '操作失敗');
        }
    };

    const isCurrentlyClockedIn = status.clockIn && !status.clockOut;
    const canClockIn = !isCurrentlyClockedIn;
    const canClockOut = isCurrentlyClockedIn;

    if (loading) return <div className="p-8 text-center">載入中...</div>;

    const formatTime = (timeString) => {
        if (!timeString) return '--:--';
        // If it's already a full ISO string
        if (timeString.includes('T')) {
            return format(new Date(timeString), 'HH:mm');
        }
        // If it's just HH:mm:ss
        const [hours, minutes] = timeString.split(':');
        return `${hours}:${minutes}`;
    };

    return (
        <div className="relative space-y-4 sm:space-y-6 md:space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-primary to-warning rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                    <div className="text-center md:text-left">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
                            {format(currentTime, 'yyyy年MM月dd日', { locale: zhTW })}
                        </h2>
                        <p className="text-yellow-50 text-sm sm:text-base md:text-lg">
                            {format(currentTime, 'EEEE', { locale: zhTW })}
                        </p>
                    </div>
                    <div className="text-3xl sm:text-5xl md:text-7xl font-mono font-bold tracking-wider bg-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                        {format(currentTime, 'HH:mm:ss')}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <button
                    onClick={() => handleClock('in')}
                    disabled={!canClockIn}
                    className={clsx(
                        'group relative overflow-hidden p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 transform hover:-translate-y-1',
                        canClockIn
                            ? 'bg-white hover:shadow-xl border-2 border-primary/10 cursor-pointer'
                            : 'bg-gray-100 cursor-not-allowed opacity-60'
                    )}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={clsx(
                                'p-3 sm:p-4 rounded-xl sm:rounded-2xl',
                                canClockIn ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-400'
                            )}>
                                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                            </div>
                            <div className="text-left">
                                <h3 className={clsx(
                                    'text-lg sm:text-xl md:text-2xl font-bold',
                                    canClockIn ? 'text-gray-900' : 'text-gray-400'
                                )}>上班打卡</h3>
                                <p className={clsx(
                                    'text-xs sm:text-sm mt-1',
                                    canClockIn ? 'text-secondary' : 'text-gray-400'
                                )}>
                                    {isCurrentlyClockedIn
                                        ? `已於 ${formatTime(status.clockIn)} 打卡`
                                        : '開始今日的工作'}
                                </p>
                            </div>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => handleClock('out')}
                    disabled={!canClockOut}
                    className={clsx(
                        'group relative overflow-hidden p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 transform hover:-translate-y-1',
                        canClockOut
                            ? 'bg-white hover:shadow-xl border-2 border-orange-500/10 cursor-pointer'
                            : 'bg-gray-100 cursor-not-allowed opacity-60'
                    )}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={clsx(
                                'p-3 sm:p-4 rounded-xl sm:rounded-2xl',
                                canClockOut ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-200 text-gray-400'
                            )}>
                                <Square className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                            </div>
                            <div className="text-left">
                                <h3 className={clsx(
                                    'text-lg sm:text-xl md:text-2xl font-bold',
                                    canClockOut ? 'text-gray-900' : 'text-gray-400'
                                )}>下班打卡</h3>
                                <p className={clsx(
                                    'text-xs sm:text-sm mt-1',
                                    canClockOut ? 'text-secondary' : 'text-gray-400'
                                )}>
                                    {status.clockOut
                                        ? `已於 ${formatTime(status.clockOut)} 打卡`
                                        : '結束今日的工作'}
                                </p>
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            {/* Status Summary */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    今日概況
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 py-4 sm:py-6 md:py-8">
                    <div className="text-center border-r border-gray-100">
                        <p className="text-xs sm:text-sm text-secondary mb-2 sm:mb-3">本日總工時</p>
                        <p className="text-3xl sm:text-5xl md:text-6xl font-bold text-primary mb-1 sm:mb-2">
                            {status.workHours || '0.0'}
                        </p>
                        <p className="text-lg sm:text-xl md:text-2xl text-yellow-600 font-medium">小時</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs sm:text-sm text-secondary mb-2 sm:mb-3">本日加班時數</p>
                        <p className="text-3xl sm:text-5xl md:text-6xl font-bold text-orange-500 mb-1 sm:mb-2">
                            {status.overtimeHours || '0.0'}
                        </p>
                        <p className="text-lg sm:text-xl md:text-2xl text-orange-400 font-medium">小時</p>
                    </div>
                </div>
            </div>

            {/* 右下角心情小語 - 可收合，3秒自動關閉 */}
            {isMoodOpen ? (
                <div 
                    onClick={() => setIsMoodOpen(false)}
                    className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-56 sm:w-64 h-36 sm:h-40 rounded-2xl shadow-2xl overflow-hidden z-50 group cursor-pointer"
                    style={{ animation: 'fadeIn 0.3s ease-out' }}
                >
                    <img
                        src="/homepage.jpg"
                        alt="Mood Background"
                        className="absolute inset-0 w-full h-full object-cover brightness-50 group-hover:brightness-40 transition-all"
                    />
                    <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl sm:text-2xl">💬</span>
                            <p className="text-xs sm:text-sm font-bold text-yellow-300">心情小語</p>
                            <span className="ml-auto text-[10px] text-white/60">點擊關閉</span>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed font-medium line-clamp-3">
                            {currentMessage}
                        </p>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsMoodOpen(true)}
                    className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-warning shadow-lg z-50 flex items-center justify-center hover:scale-110 transition-transform duration-300"
                >
                    <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </button>
            )}
        </div>
    );
};

export default Home;
