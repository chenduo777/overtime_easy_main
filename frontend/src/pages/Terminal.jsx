import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Terminal as TerminalIcon, Play } from 'lucide-react';

const Terminal = () => {
    const { user } = useAuth();
    const [sql, setSql] = useState('');
    const [queryResults, setQueryResults] = useState(null);
    const [queryError, setQueryError] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);

    const handleExecuteQuery = async () => {
        if (!sql.trim()) return;

        setIsExecuting(true);
        setQueryError(null);
        setQueryResults(null);

        try {
            const response = await api.post('/terminal/query', { sql });
            setQueryResults(response.data.results);
        } catch (err) {
            setQueryError(err.response?.data?.error || err.message);
        } finally {
            setIsExecuting(false);
        }
    };

    // 按 Ctrl+Enter 執行查詢
    const handleKeyDown = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleExecuteQuery();
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <TerminalIcon className="w-8 h-8" />
                SQL Terminal
            </h1>
            <p className="text-secondary mb-6">管理員專用的 SQL 查詢終端機</p>

            <div className="grid gap-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        SQL Query
                        <span className="text-gray-400 ml-2 font-normal">(Ctrl+Enter 執行)</span>
                    </label>
                    <textarea
                        value={sql}
                        onChange={(e) => setSql(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-40 font-mono text-sm p-4 bg-gray-900 text-green-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="SELECT * FROM Student LIMIT 10..."
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleExecuteQuery}
                            disabled={isExecuting || !sql.trim()}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Play className="w-4 h-4" />
                            {isExecuting ? 'Running...' : 'Run Query'}
                        </button>
                    </div>
                </div>

                {queryError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4">
                        <p className="text-red-700 font-mono text-sm">{queryError}</p>
                    </div>
                )}

                {queryResults && (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <span className="text-sm text-gray-600">
                                {queryResults.length} 筆結果
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {queryResults.length > 0 && Object.keys(queryResults[0]).map((key) => (
                                            <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {queryResults.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {val === null ? <span className="text-gray-300 italic">NULL</span> : 
                                                     typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {queryResults.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    Query executed successfully. No rows returned.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Terminal;
