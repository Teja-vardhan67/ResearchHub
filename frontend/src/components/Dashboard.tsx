import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const Dashboard = () => {
    const { logout, token } = useAuth();
    const [activeTab, setActiveTab] = useState('papers');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Workspace State
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Papers State
    const [papers, setPapers] = useState<any[]>([]);

    const fetchPapers = async () => {
        let url = 'http://localhost:8000/research/papers';
        if (currentWorkspace) url += `?workspace_id=${currentWorkspace.id}`;

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPapers(data);
            }
        } catch (err) {
            console.error("Failed to fetch papers");
        }
    };

    // Fetch Workspaces on Init
    React.useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await fetch('http://localhost:8000/workspaces', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setWorkspaces(data);
                if (data.length > 0) setCurrentWorkspace(data[0]);
            } catch (err) {
                console.error("Failed to fetch workspaces");
            }
        };
        fetchWorkspaces();
    }, [token]);

    // Fetch Data when Workspace Changes
    React.useEffect(() => {
        const fetchHistory = async () => {
            let url = 'http://localhost:8000/research/chat/history';
            if (currentWorkspace) url += `?workspace_id=${currentWorkspace.id}`;

            try {
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
            } catch (err) {
                console.error("Failed to fetch chat history");
            }
        };
        fetchHistory();
        fetchPapers();
    }, [token, currentWorkspace]);

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        try {
            const res = await fetch('http://localhost:8000/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newWorkspaceName })
            });
            const data = await res.json();
            setWorkspaces([...workspaces, data]);
            setCurrentWorkspace(data);
            setNewWorkspaceName('');
            setShowWorkspaceInput(false);
            showNotification('Workspace created successfully', 'success');
        } catch (err) {
            showNotification('Failed to create workspace', 'error');
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!currentWorkspace) return;
        if (!confirm(`Are you sure you want to delete workspace "${currentWorkspace.name}"? This will delete all chat history.`)) return;

        try {
            const res = await fetch(`http://localhost:8000/workspaces/${currentWorkspace.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const updatedWorkspaces = workspaces.filter(w => w.id !== currentWorkspace.id);
                setWorkspaces(updatedWorkspaces);
                setCurrentWorkspace(updatedWorkspaces.length > 0 ? updatedWorkspaces[0] : null);
                showNotification('Workspace deleted', 'success');
            } else {
                showNotification('Failed to delete workspace', 'error');
            }
        } catch (err) {
            showNotification('Error deleting workspace', 'error');
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);
        if (currentWorkspace) {
            formData.append('workspace_id', currentWorkspace.id.toString());
        }

        try {
            const res = await fetch('http://localhost:8000/research/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (!res.ok) showNotification('Upload failed', 'error');
            else {
                showNotification('Paper uploaded successfully!', 'success');
                fetchPapers();
            }
        } catch (err) {
            showNotification('Error uploading paper', 'error');
        }
        setUploading(false);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8000/research/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMsg.content,
                    workspace_id: currentWorkspace ? currentWorkspace.id : null
                })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with AI." }]);
        }
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`http://localhost:8000/search/arxiv?query=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSearchResults(data);
        } catch (err) {
            showNotification('Search failed', 'error');
        }
        setSearching(false);
    };

    const handleImport = async (paper: any) => {
        try {
            const res = await fetch('http://localhost:8000/research/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pdf_url: paper.pdf_url,
                    title: paper.title,
                    workspace_id: currentWorkspace ? currentWorkspace.id : null
                })
            });
            if (res.ok) {
                showNotification('Paper imported successfully!', 'success');
                fetchPapers();
            }
            else showNotification('Import failed', 'error');
        } catch (err) {
            showNotification('Error importing paper', 'error');
        }
    };

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all transform animate-fade-in-down ${notification.type === 'success'
                        ? 'bg-green-500/20 border-green-500/50 text-green-200'
                        : 'bg-red-500/20 border-red-500/50 text-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{notification.type === 'success' ? '✨' : '⚠️'}</span>
                        <span className="font-medium">{notification.message}</span>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className="w-72 bg-slate-800/40 backdrop-blur-xl border-r border-slate-700/50 flex flex-col transition-all duration-300">
                <div className="p-6 border-b border-slate-700/50">
                    <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                        ResearchHub AI
                    </h1>

                    {/* Workspace Selector */}
                    <div className="mt-8">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Workspace</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 group">
                                <select
                                    className="w-full appearance-none bg-slate-700/50 border border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer hover:bg-slate-700 hover:border-slate-500"
                                    value={currentWorkspace?.id || ''}
                                    onChange={(e) => {
                                        const ws = workspaces.find(w => w.id === parseInt(e.target.value));
                                        setCurrentWorkspace(ws);
                                    }}
                                >
                                    <option value="" disabled className="bg-slate-800">Select Workspace</option>
                                    {workspaces.map(w => (
                                        <option key={w.id} value={w.id} className="bg-slate-800">{w.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3 pointer-events-none text-slate-400 group-hover:text-blue-400 transition-colors">
                                    ▼
                                </div>
                            </div>

                            <button
                                onClick={() => setShowWorkspaceInput(true)}
                                className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
                                title="New Workspace"
                            >
                                +
                            </button>
                            {currentWorkspace && (
                                <button
                                    onClick={handleDeleteWorkspace}
                                    className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200"
                                    title="Delete Current Workspace"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>

                        {showWorkspaceInput && (
                            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600 animate-fade-in-down">
                                <input
                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:ring-2 focus:ring-green-500/50 outline-none mb-2"
                                    placeholder="Workspace Name..."
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowWorkspaceInput(false)} className="px-3 py-1 text-xs text-slate-400 hover:text-white transition">Cancel</button>
                                    <button onClick={handleCreateWorkspace} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500 transition shadow-lg shadow-green-900/20">Create</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="p-4 flex-1 overflow-y-auto space-y-2">
                    {[
                        { id: 'papers', label: 'My Papers', icon: '📄' },
                        { id: 'chat', label: 'AI Assistant', icon: '🤖' },
                        { id: 'search', label: 'Search arXiv', icon: '🔍' }
                    ].map((tab) => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-3 font-medium ${activeTab === tab.id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/20'
                                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </div>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-700/50">
                    <button
                        onClick={logout}
                        className="w-full py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-200 font-medium flex items-center justify-center gap-2 group"
                    >
                        <span>Run Away</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto w-full relative">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
                    {activeTab === 'papers' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">My Library</h2>
                                    <p className="text-slate-400">
                                        {currentWorkspace ? `Managing papers in "${currentWorkspace.name}"` : 'Select a workspace to view papers'}
                                    </p>
                                </div>
                                <label className={`px-6 py-3 rounded-xl font-medium cursor-pointer transition-all duration-300 flex items-center gap-2 shadow-lg shadow-blue-900/30 ${uploading ? 'bg-slate-700 text-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
                                    }`}>
                                    {uploading ? (
                                        <><span>⏳</span> Uploading...</>
                                    ) : (
                                        <><span>☁️</span> Upload PDF</>
                                    )}
                                    <input type="file" onChange={handleUpload} accept=".pdf" className="hidden" disabled={uploading} />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {papers.length === 0 ? (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20">
                                        <div className="text-6xl mb-4 opacity-50">📚</div>
                                        <p className="text-slate-300 text-lg font-medium">No papers found</p>
                                        <p className="text-slate-500 mt-2">Upload a PDF or search arXiv to get started</p>
                                    </div>
                                ) : (
                                    papers.map((paper: any) => (
                                        <div key={paper.id} className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-300 flex flex-col">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl">
                                                    📄
                                                </div>
                                                <span className="text-xs font-mono bg-slate-700/50 text-slate-300 py-1 px-2 rounded-md border border-slate-600/50">
                                                    {new Date(paper.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-100 mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors" title={paper.title}>{paper.title}</h3>
                                            <p className="text-sm text-slate-400 mb-4 line-clamp-3">{paper.abstract}</p>
                                            <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center text-sm">
                                                <span className="text-slate-500 truncate max-w-[150px]">{paper.authors || "Unknown Author"}</span>
                                                <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded text-xs font-medium">Indexed</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="h-full flex flex-col animate-fade-in overflow-hidden">
                            <div className="mb-6">
                                <h2 className="text-3xl font-bold text-white">AI Research Assistant</h2>
                                <p className="text-slate-400">Ask questions about your {papers.length} papers</p>
                            </div>

                            <div className="flex-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden shadow-2xl">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-60">
                                            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center text-4xl mb-6 text-blue-400">
                                                🤖
                                            </div>
                                            <h3 className="text-xl font-medium text-white mb-2">Ready to assist</h3>
                                            <p className="text-slate-400 max-w-sm">
                                                Ask me to summarize papers, compare methodologies, or explain complex concepts from your library.
                                            </p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                        ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-900/20'
                                                        : 'bg-slate-700/80 text-slate-200 rounded-bl-none border border-slate-600/50'
                                                    }`}>
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {loading && (
                                        <div className="flex justify-start animate-pulse">
                                            <div className="bg-slate-700/50 p-4 rounded-2xl rounded-bl-none text-slate-400 text-sm flex gap-2 items-center">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-800 border-t border-slate-700/50">
                                    <div className="relative flex items-center gap-3">
                                        <input
                                            type="text"
                                            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-5 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all shadow-inner"
                                            placeholder="Ask a question..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                            disabled={loading}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={loading}
                                            className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-200"
                                        >
                                            <span className="text-xl">➤</span>
                                        </button>
                                    </div>
                                    <div className="mt-2 text-center text-xs text-slate-500">
                                        AI can make mistakes. Verify important information.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="h-full flex flex-col animate-fade-in overflow-hidden">
                            <div className="mb-8 text-center max-w-2xl mx-auto">
                                <h2 className="text-3xl font-bold text-white mb-3">Global Knowledge Base</h2>
                                <p className="text-slate-400">Search millions of papers on arXiv and import them directly to your workspace.</p>
                            </div>

                            <div className="flex gap-4 mb-10 max-w-3xl mx-auto w-full">
                                <div className="flex-1 relative">
                                    <span className="absolute left-4 top-4 text-slate-500 text-lg">🔍</span>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all shadow-lg"
                                        placeholder="Search topics (e.g., 'Quantum Computing', 'LLM Optimizations')..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={searching}
                                    className="px-8 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:scale-100"
                                >
                                    {searching ? 'Parsing...' : 'Search'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                                <div className="max-w-4xl mx-auto space-y-4">
                                    {searchResults.map((paper, idx) => (
                                        <div key={idx} className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-900/10 group">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-purple-400 transition-colors">
                                                        <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="hover:underline">{paper.title}</a>
                                                    </h3>
                                                    <div className="flex gap-3 text-xs text-slate-400 mb-3 font-mono">
                                                        <span className="bg-slate-700/50 px-2 py-1 rounded border border-slate-600">{paper.published}</span>
                                                        <span className="flex items-center text-slate-500">{paper.authors.join(', ')}</span>
                                                    </div>
                                                    <p className="text-slate-300 leading-relaxed mb-4 text-sm">{paper.summary}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleImport(paper)}
                                                    className="px-5 py-2.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-green-600 hover:text-white border border-slate-600 hover:border-green-500 transition-all whitespace-nowrap font-medium shadow-sm hover:shadow-green-900/30 flex items-center gap-2"
                                                >
                                                    <span>+</span> Import
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && !searching && (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                            <div className="text-5xl mb-4 opacity-30">🌐</div>
                                            <p>Enter a query above to explore the archives.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
