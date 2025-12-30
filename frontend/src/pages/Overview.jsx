import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import api from '../api/axios';
import clsx from 'clsx';

const Overview = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [records, setRecords] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecords();
    }, [currentDate]);

    const fetchRecords = async () => {
        try {
            const response = await api.get('/attendance/records');
            setRecords(response.data.records);
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setLoading(false);
        }
    };

    // 生成完整的日曆網格（包含前後月份的日期）
    const generateCalendarDays = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        
        return eachDayOfInterval({
            start: calendarStart,
            end: calendarEnd,
        });
    };

    const calendarDays = generateCalendarDays();

    // 根據 work_date 過濾記錄（跨日記錄歸屬於上班日）
    const getRecordsForDate = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return records.filter(r => {
            // 使用小寫的 work_date
            const recordDate = r.work_date.includes('T') ? r.work_date.split('T')[0] : r.work_date;
            return recordDate === dateStr;
        });
    };

    const selectedRecords = getRecordsForDate(selectedDate);

    // 計算當天總計（使用後端回傳的 overtime_minutes）
    const calculateDayTotal = (dayRecords) => {
        if (!dayRecords || dayRecords.length === 0) return { totalWork: 0, totalOvertime: 0 };

        const totalWorkMinutes = dayRecords.reduce((sum, r) => sum + (r.work_minutes || 0), 0);
        const totalOvertimeMinutes = dayRecords.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);

        return {
            totalWork: (totalWorkMinutes / 60).toFixed(1),
            totalOvertime: (totalOvertimeMinutes / 60).toFixed(1)
        };
    };

    // 格式化時間（支援跨日標記）
    const formatTime = (timeString, workDate = null) => {
        if (!timeString) return '--:--';
        
        const time = new Date(timeString);
        const formattedTime = format(time, 'HH:mm');
        
        // 如果提供了 workDate，檢查是否跨日
        if (workDate) {
            const workDateStr = workDate.includes('T') ? workDate.split('T')[0] : workDate;
            const timeDate = format(time, 'yyyy-MM-dd');
            
            if (timeDate !== workDateStr) {
                return `${formattedTime} +1`;  // 顯示隔日標記
            }
        }
        
        return formattedTime;
    };

    return (
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 min-h-[calc(100vh-8rem)]">
            {/* Calendar Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        <span className="hidden sm:inline">{format(currentDate, 'yyyy年 MMMM', { locale: zhTW })}</span>
                        <span className="sm:hidden">{format(currentDate, 'yyyy/MM', { locale: zhTW })}</span>
                    </h2>
                    <div className="flex gap-1 sm:gap-2">
                        <button
                            onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                            今天
                        </button>
                        <button
                            onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}
                            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4 mb-2 sm:mb-4">
                    {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                        <div key={day} className="text-center text-xs sm:text-sm font-medium text-secondary py-1 sm:py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4 flex-1">
                    {calendarDays.map((day) => {
                        const dayRecords = getRecordsForDate(day);
                        const dayTotal = calculateDayTotal(dayRecords);
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, currentDate);

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={clsx(
                                    'relative p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all duration-200 flex flex-col items-center justify-start min-h-[50px] sm:min-h-[60px] md:min-h-[80px]',
                                    isSelected
                                        ? 'border-primary bg-primary/5 ring-1 sm:ring-2 ring-primary/20'
                                        : 'border-transparent hover:bg-gray-50',
                                    isToday && !isSelected && 'bg-yellow-50 font-bold text-primary',
                                    !isCurrentMonth && 'opacity-30'
                                )}
                            >
                                <span className={clsx(
                                    'text-xs sm:text-sm w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full mb-0.5 sm:mb-1',
                                    isSelected ? 'bg-primary text-white' : 'text-gray-700'
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {dayRecords.length > 0 && (
                                    <div className="flex flex-col gap-0.5 sm:gap-1 w-full px-0.5 sm:px-1">
                                        {dayTotal.totalOvertime > 0 && (
                                            <div className="text-[8px] sm:text-[10px] font-medium text-orange-600 bg-orange-100 rounded px-0.5 sm:px-1 py-0.5 text-center truncate w-full">
                                                +{dayTotal.totalOvertime}h
                                            </div>
                                        )}
                                        {dayRecords.length > 1 && (
                                            <div className="hidden sm:block text-[9px] font-medium text-yellow-700 bg-yellow-100 rounded px-1 py-0.5 text-center truncate w-full">
                                                {dayRecords.length}段
                                            </div>
                                        )}
                                        {parseFloat(dayTotal.totalOvertime) > 0 ? (
                                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-500 mx-auto" />
                                        ) : (
                                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 mx-auto" />
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Details Section */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-y-auto max-h-[50vh] lg:max-h-none">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        {format(selectedDate, 'MM月dd日', { locale: zhTW })} 詳細資料
                    </h3>
                    {selectedRecords.length > 0 && (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                            <img
                                src={parseFloat(calculateDayTotal(selectedRecords).totalOvertime) > 0 ? "/tired.jpg" : "/happy.jpg"}
                                alt="Mood"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>

                {selectedRecords.length > 0 ? (
                    <div className="space-y-6">
                        {/* 多段工作記錄 */}
                        <div className="space-y-4">
                            {selectedRecords.map((record, index) => (
                                <div key={record.record_id} className="border border-gray-200 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-700">
                                            工作段 {index + 1}
                                        </span>
                                        {record.is_overnight && (
                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                跨日
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-secondary">上班</span>
                                        <span className="font-mono font-bold text-gray-900">
                                            {formatTime(record.clock_in)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-secondary">下班</span>
                                        <span className="font-mono font-bold text-gray-900">
                                            {formatTime(record.clock_out, record.work_date)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div className="text-center p-2 bg-yellow-50 rounded-lg">
                                            <div className="text-lg font-bold text-primary">
                                                {((record.work_minutes || 0) / 60).toFixed(1)}
                                            </div>
                                            <div className="text-[10px] text-yellow-700">工時</div>
                                        </div>
                                        <div className="text-center p-2 bg-orange-50 rounded-lg">
                                            <div className="text-lg font-bold text-orange-500">
                                                {((record.overtime_minutes || 0) / 60).toFixed(1)}
                                            </div>
                                            <div className="text-[10px] text-orange-600">加班</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 當天總計 */}
                        {selectedRecords.length > 1 && (
                            <div className="border-t-2 border-gray-200 pt-6">
                                <h4 className="text-sm font-medium text-secondary mb-4">當天總計</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-yellow-50 rounded-2xl text-center">
                                        <div className="text-2xl font-bold text-primary mb-1">
                                            {calculateDayTotal(selectedRecords).totalWork}
                                        </div>
                                        <div className="text-xs text-yellow-700">總工作時數</div>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-2xl text-center">
                                        <div className="text-2xl font-bold text-orange-500 mb-1">
                                            {calculateDayTotal(selectedRecords).totalOvertime}
                                        </div>
                                        <div className="text-xs text-orange-600">總加班時數</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-secondary pb-20">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <CalendarIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p>本日無打卡紀錄</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Overview;
