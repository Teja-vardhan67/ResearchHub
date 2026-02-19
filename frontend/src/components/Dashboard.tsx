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
        } catch (err) {
            alert('Failed to create workspace');
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
                alert('Workspace deleted');
            } else {
                alert('Failed to delete workspace');
            }
        } catch (err) {
            alert('Error deleting workspace');
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
            if (!res.ok) alert('Upload failed');
            else {
                alert('Paper uploaded successfully!');
                fetchPapers();
            }
        } catch (err) {
            alert('Error uploading paper');
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
            alert('Search failed');
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
                alert('Paper imported successfully!');
                fetchPapers();
            }
            else alert('Import failed');
        } catch (err) {
            alert('Error importing paper');
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-4 border-b">
                    <h1 className="text-xl font-bold text-blue-600">ResearchHub AI</h1>
                    {/* Workspace Selector */}
                    <div className="mt-4">
                        <label className="text-xs text-gray-500 uppercase font-semibold">Workspace</label>
                        <div className="mt-1 flex gap-2">
                            <select
                                className="w-full p-2 border rounded text-sm bg-gray-50 bg-white"
                                value={currentWorkspace?.id || ''}
                                onChange={(e) => {
                                    const ws = workspaces.find(w => w.id === parseInt(e.target.value));
                                    setCurrentWorkspace(ws);
                                }}
                            >
                                <option value="" disabled>Select Workspace</option>
                                {workspaces.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => setShowWorkspaceInput(true)}
                                className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                title="New Workspace"
                            >
                                +
                            </button>
                            {currentWorkspace && (
                                <button
                                    onClick={handleDeleteWorkspace}
                                    className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                    title="Delete Workspace"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                        {showWorkspaceInput && (
                            <div className="mt-2 flex gap-1">
                                <input
                                    className="w-full p-1 border rounded text-sm"
                                    placeholder="Name..."
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                />
                                <button onClick={handleCreateWorkspace} className="px-2 bg-green-500 text-white rounded text-sm">✓</button>
                                <button onClick={() => setShowWorkspaceInput(false)} className="px-2 bg-gray-300 text-gray-700 rounded text-sm">✕</button>
                            </div>
                        )}
                    </div>
                </div>
                <nav className="p-4 flex-1">
                    <ul>
                        <li className={`mb-2 p-2 rounded cursor-pointer ${activeTab === 'papers' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`} onClick={() => setActiveTab('papers')}>
                            My Papers
                        </li>
                        <li className={`mb-2 p-2 rounded cursor-pointer ${activeTab === 'chat' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`} onClick={() => setActiveTab('chat')}>
                            AI Assistant
                        </li>
                        <li className={`mb-2 p-2 rounded cursor-pointer ${activeTab === 'search' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`} onClick={() => setActiveTab('search')}>
                            Search arXiv
                        </li>
                    </ul>
                </nav>
                <div className="p-4 border-t">
                    <button onClick={logout} className="w-full text-red-500 hover:text-red-700 font-medium">Logout</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'papers' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">My Papers {currentWorkspace ? `(${currentWorkspace.name})` : ''}</h2>
                            <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
                                {uploading ? 'Uploading...' : '+ Upload PDF'}
                                <input type="file" onChange={handleUpload} accept=".pdf" className="hidden" disabled={uploading} />
                            </label>
                        </div>
                        {/* Paper List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {papers.length === 0 ? (
                                <div className="col-span-full text-center text-gray-500 py-10">
                                    <p>No papers yet. Upload one or search arXiv!</p>
                                </div>
                            ) : (
                                papers.map((paper: any) => (
                                    <div key={paper.id} className="bg-white p-6 rounded shadow border hover:shadow-md transition">
                                        <h3 className="font-bold mb-2 truncate" title={paper.title}>{paper.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4">{paper.authors || "Unknown Author"} • {new Date(paper.created_at).toLocaleDateString()}</p>
                                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded inline-block">Processed</div>
                                        <p className="text-xs text-gray-400 mt-2 line-clamp-3">{paper.abstract}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="h-full flex flex-col max-h-[calc(100vh-4rem)]">
                        <h2 className="text-2xl font-bold mb-4">Research Assistant</h2>
                        <div className="flex-1 bg-white rounded shadow p-4 border mb-4 overflow-y-auto">
                            {messages.length === 0 ? (
                                <div className="text-gray-400 text-center mt-20">
                                    <p>Start a conversation with your research assistant...</p>
                                    <p className="text-sm mt-2">Try: "Summarize the key findings of my uploaded papers"</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            {loading && <div className="text-gray-500 text-sm ml-2">Thinking...</div>}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ask a question..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={loading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="h-full flex flex-col">
                        <h2 className="text-2xl font-bold mb-6">Search arXiv {currentWorkspace ? `Into ${currentWorkspace.name}` : ''}</h2>
                        <div className="flex gap-4 mb-8">
                            <input
                                type="text"
                                className="flex-1 p-3 border rounded shadow-sm"
                                placeholder="Search for papers (e.g., 'Attention Is All You Need')..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching}
                                className="px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        <div className="grid gap-4 overflow-y-auto pb-10">
                            {searchResults.map((paper, idx) => (
                                <div key={idx} className="bg-white p-6 rounded shadow border hover:shadow-md transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-blue-900 mb-2">
                                                <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="hover:underline">{paper.title}</a>
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-2">{paper.authors.join(', ')} • {paper.published}</p>
                                            <p className="text-gray-700 line-clamp-2 mb-4">{paper.summary}</p>
                                        </div>
                                        <button
                                            onClick={() => handleImport(paper)}
                                            className="ml-4 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium whitespace-nowrap"
                                        >
                                            + Import
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {searchResults.length === 0 && !searching && (
                                <p className="text-gray-500 text-center mt-10">No results yet. Try searching for a topic!</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
