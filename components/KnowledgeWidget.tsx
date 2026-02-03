import React, { useState } from 'react';
import { Upload, Search, FileText, Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface KnowledgeWidgetProps {
    isEditing?: boolean;
}

export const KnowledgeWidget: React.FC<KnowledgeWidgetProps> = ({ isEditing }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus({ type: null, message: '' });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:8001/upload-document', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setUploadStatus({ type: 'success', message: `Document "${file.name}" uploaded successfully!` });
            } else {
                const errorMsg = data.detail || data.error || data.message || 'Upload failed';
                setUploadStatus({ type: 'error', message: `Upload failed: ${errorMsg}` });
            }
        } catch (error) {
            setUploadStatus({ type: 'error', message: 'Network error: Could not upload document' });
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchResults([]);

        try {
            const response = await fetch('http://localhost:8001/search-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            });

            const data = await response.json();

            if (response.ok) {
                setSearchResults(data.results || []);
            } else {
                setSearchResults([`Error: ${data.error || 'Search failed'}`]);
            }
        } catch (error) {
            setSearchResults(['Network error: Could not search documents']);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 gap-4">
            {/* Upload Section */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border-2 border-dashed border-gray-300 dark:border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Upload size={20} className="text-blue-500" />
                        <span className="font-bold text-sm">Upload Document</span>
                    </div>
                    {isUploading && <Loader size={16} className="animate-spin text-blue-500" />}
                </div>

                <input
                    type="file"
                    accept=".pdf,.txt,.docx,.doc"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer disabled:opacity-50"
                />

                {uploadStatus.type && (
                    <div className={`mt-3 flex items-center gap-2 text-sm ${uploadStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {uploadStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>{uploadStatus.message}</span>
                    </div>
                )}
            </div>

            {/* Search Section */}
            <div className="flex-1 flex flex-col gap-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search in documents..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSearching ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                        Search
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    {searchResults.length === 0 && !isSearching && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <FileText size={48} className="mb-2 opacity-50" />
                            <p className="text-sm">Search results will appear here</p>
                        </div>
                    )}

                    {isSearching && (
                        <div className="h-full flex items-center justify-center">
                            <Loader size={32} className="animate-spin text-blue-500" />
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="space-y-4">
                            {searchResults.map((result, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{result}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
