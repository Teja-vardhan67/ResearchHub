import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Search,
    Bot,
    Upload,
    FileText,
    Plus,
    CheckCircle2,
    XCircle,
    StopCircle,
    Network,
    ArrowLeftRight,
    Brain,
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
    Headphones
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Workspace {
    id: number;
    name: string;
    created_at: string;
}

interface Paper {
    id: number;
    title: string;
    abstract: string;
    authors: string;
    pdf_url?: string;
    created_at: string;
}

const Dashboard = () => {
    const { token } = useAuth();

    // View State
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [activeRightTab, setActiveRightTab] = useState<'chat' | 'graph' | 'compare'>('chat');

    // Data States
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [allPapers, setAllPapers] = useState<Paper[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [input, setInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Feature States
    const [selectedPapers, setSelectedPapers] = useState<number[]>([]);
    const [activeAudioId, setActiveAudioId] = useState<number | null>(null);
    const [comparisonResult, setComparisonResult] = useState<string | null>(null);
    const [isComparing, setIsComparing] = useState(false);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- API Interactions ---

    const fetchPapers = async () => {
        let url = 'http://localhost:8000/research/papers';
        if (currentWorkspace) url += `?workspace_id=${currentWorkspace.id}`;
        try {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setAllPapers(await res.json());
        } catch (err) { console.error("Failed to fetch papers"); }
    };

    const fetchWorkspaces = async () => {
        try {
            const res = await fetch('http://localhost:8000/workspaces', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            setWorkspaces(data);
            if (data.length > 0 && !currentWorkspace) setCurrentWorkspace(data[0]);
        } catch (err) { console.error("Failed to fetch workspaces"); }
    };

    useEffect(() => { fetchWorkspaces(); }, [token]);

    useEffect(() => {
        const fetchHistory = async () => {
            let url = 'http://localhost:8000/research/chat/history';
            if (currentWorkspace) url += `?workspace_id=${currentWorkspace.id}`;
            try {
                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) setMessages(await res.json());
            } catch (err) { console.error("Failed to fetch chat history"); }
        };
        if (currentWorkspace) {
            fetchHistory();
            fetchPapers();
        }
    }, [token, currentWorkspace]);

    // --- Handlers ---

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) return;
        try {
            const res = await fetch('http://localhost:8000/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newWorkspaceName })
            });
            const data = await res.json();
            setWorkspaces([...workspaces, data]);
            setCurrentWorkspace(data);

            setNewWorkspaceName('');
            setShowWorkspaceInput(false);
            showNotification('Workspace created successfully', 'success');
        } catch (err) { showNotification('Failed to create workspace', 'error'); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);
        if (currentWorkspace) formData.append('workspace_id', currentWorkspace.id.toString());

        try {
            const res = await fetch('http://localhost:8000/research/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                showNotification('Paper uploaded successfully!', 'success');
                fetchPapers();
            } else showNotification('Upload failed', 'error');
        } catch (err) { showNotification('Error uploading paper', 'error'); }
        setUploading(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await fetch(`http://localhost:8000/search/arxiv?query=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSearchResults(await res.json());
        } catch (err) { showNotification('Search failed', 'error'); }
    };

    const handleImport = async (paper: any) => {
        try {
            const res = await fetch('http://localhost:8000/research/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    pdf_url: paper.pdf_url,
                    title: paper.title,
                    workspace_id: currentWorkspace ? currentWorkspace.id : null
                })
            });
            if (res.ok) {
                showNotification('Paper imported!', 'success');
                fetchPapers();
                setSearchResults([]); // Clear search after import
                setSearchQuery('');
            } else showNotification('Import failed', 'error');
        } catch (err) { showNotification('Error importing paper', 'error'); }
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

    // --- NEW FEATURE HANDLERS ---

    const handlePlayAudio = (paper: Paper) => {
        if (activeAudioId === paper.id) {
            window.speechSynthesis.cancel();
            setActiveAudioId(null);
        } else {
            window.speechSynthesis.cancel();
            const text = `Title: ${paper.title}. Abstract: ${paper.abstract}`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => setActiveAudioId(null);
            window.speechSynthesis.speak(utterance);
            setActiveAudioId(paper.id);
        }
    };

    const handleCompare = async () => {
        if (selectedPapers.length < 2) return;
        setIsComparing(true);
        setActiveRightTab('compare');
        try {
            const response = await fetch('http://localhost:8000/research/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ paper_ids: selectedPapers }),
            });
            if (!response.ok) throw new Error('Comparison failed');
            const data = await response.json();
            setComparisonResult(data.comparison);
            setNotification({ message: 'Comparison generated!', type: 'success' });
        } catch (error) {
            setNotification({ message: 'Failed to compare papers.', type: 'error' });
        } finally {
            setIsComparing(false);
        }
    };

    const togglePaperSelection = (id: number) => {
        setSelectedPapers(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    // --- GRAPH LOGIC (Smart Cluster) ---
    const graphData = React.useMemo(() => {
        if (allPapers.length === 0) return { nodes: [], links: [] };

        const centerId = 'center-hub';
        const centerNode = { id: centerId, name: currentWorkspace?.name || 'My Library', val: 5, type: 'hub' };

        const paperNodes = allPapers.map(p => ({
            id: p.id,
            name: p.title,
            val: 2,
            type: 'paper',
            authors: p.authors
        }));

        // 1. Link everything to Center
        const centerLinks = allPapers.map(p => ({ source: centerId, target: p.id }));

        // 2. Link papers with same authors (Simple overlap check)
        const authorLinks: any[] = [];
        for (let i = 0; i < allPapers.length; i++) {
            for (let j = i + 1; j < allPapers.length; j++) {
                const p1 = allPapers[i];
                const p2 = allPapers[j];
                // basic intersection check (assuming comma separated)
                const a1 = p1.authors.split(',').map(s => s.trim());
                const a2 = p2.authors.split(',').map(s => s.trim());
                const intersection = a1.filter(x => a2.includes(x));

                if (intersection.length > 0) {
                    authorLinks.push({ source: p1.id, target: p2.id, color: '#e879f9' }); // Pink links for authors
                }
            }
        }

        return {
            nodes: [centerNode, ...paperNodes],
            links: [...centerLinks, ...authorLinks]
        };
    }, [allPapers, currentWorkspace]);

    // --- RESIZE HANDLER ---
    const graphContainerRef = React.useRef<HTMLDivElement>(null);
    const [graphDimensions, setGraphDimensions] = useState({ w: 600, h: 600 });

    useEffect(() => {
        const updateDims = () => {
            if (graphContainerRef.current) {
                setGraphDimensions({
                    w: graphContainerRef.current.offsetWidth,
                    h: graphContainerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateDims);
        setTimeout(updateDims, 100);
        return () => window.removeEventListener('resize', updateDims);
    }, [activeRightTab, leftPanelOpen]);

    // ---------------- UI COMPONENTS -----------------

    return (
        <div className="flex h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in-down ${notification.type === 'success' ? 'bg-white border-l-4 border-green-500 text-green-700' : 'bg-white border-l-4 border-red-500 text-red-700'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    <span className="font-medium">{notification.message}</span>
                </div>
            )}

            {/* --- LEFT PANEL (Library & Nav) --- */}
            <div className={`${leftPanelOpen ? 'w-[400px]' : 'w-[80px]'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 shadow-lg relative`}>

                {/* Header / Brand */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between h-16">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="min-w-[40px] h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <Brain className="text-white" size={24} />
                        </div>
                        {leftPanelOpen && (
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 whitespace-nowrap">
                                ResearchHub
                            </span>
                        )}
                    </div>
                    {leftPanelOpen && (
                        <button
                            onClick={() => setLeftPanelOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    )}
                </div>

                {!leftPanelOpen && (
                    <div className="w-full flex justify-center mt-4">
                        <button
                            onClick={() => setLeftPanelOpen(true)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-purple-600"
                        >
                            <PanelLeftOpen size={20} />
                        </button>
                    </div>
                )}

                {/* Toolbar (Search & Workspace) */}
                {leftPanelOpen && (
                    <div className="p-4 space-y-3">
                        {/* Workspace Selector */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <select
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={currentWorkspace?.id || ''}
                                    onChange={(e) => {
                                        const ws = workspaces.find(w => w.id === parseInt(e.target.value));
                                        if (ws) setCurrentWorkspace(ws);
                                    }}
                                >
                                    {workspaces.map(w => <option key={w.id} value={w.id}>Workspace: {w.name}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => setShowWorkspaceInput(true)}
                                className="flex-shrink-0 bg-purple-50 text-purple-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors flex items-center gap-1"
                                title="Create New Workspace"
                            >
                                <Plus size={16} /> New
                            </button>
                        </div>

                        {/* New Workspace Input */}
                        {showWorkspaceInput && (
                            <div className="flex gap-2 animate-fade-in-down">
                                <input
                                    className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-1 text-sm focus:outline-none"
                                    placeholder="Name..."
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={handleCreateWorkspace} className="text-green-600"><CheckCircle2 size={18} /></button>
                                <button onClick={() => setShowWorkspaceInput(false)} className="text-red-500"><XCircle size={18} /></button>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="relative">
                            <input
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Search library or arXiv..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                        </div>

                        {/* Feature Navigation (Left Toggle) */}
                        <div className="pt-2 border-t border-gray-100 space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Features</label>
                            <button
                                onClick={() => setActiveRightTab('chat')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeRightTab === 'chat' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <MessageSquare size={18} /> Chat Assistant
                            </button>
                            <button
                                onClick={() => setActiveRightTab('graph')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeRightTab === 'graph' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <Network size={18} /> Knowledge Graph
                            </button>
                            <button
                                onClick={() => setActiveRightTab('compare')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeRightTab === 'compare' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <ArrowLeftRight size={18} /> Compare Papers
                                {selectedPapers.length >= 2 && <span className="ml-auto bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{selectedPapers.length}</span>}
                            </button>
                        </div>
                    </div>
                )}

                {/* Main List Area (Papers or Search Results) */}
                <div className="flex-1 overflow-y-auto px-2 border-t border-gray-100 mt-2 pt-2">
                    {/* Search Results Mode */}
                    {searchResults.length > 0 ? (
                        <div className="space-y-2 p-2">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-gray-500 uppercase">Search Results</h3>
                                <button onClick={() => { setSearchResults([]); setSearchQuery(''); }} className="text-xs text-red-500 hover:underline">Clear</button>
                            </div>
                            {searchResults.map((paper, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-purple-300 transition-all shadow-sm">
                                    <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{paper.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{paper.authors.join(', ')}</p>
                                    <button
                                        onClick={() => handleImport(paper)}
                                        className="mt-2 w-full py-1.5 bg-purple-50 text-purple-600 text-xs font-bold rounded hover:bg-purple-100 transition-colors"
                                    >
                                        Import to Library
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Paper Library Mode
                        <div className="space-y-1 p-2">
                            {leftPanelOpen && <h3 className="text-xs font-bold text-gray-500 uppercase px-2 mb-2">Your Library ({allPapers.length})</h3>}
                            {allPapers.map(paper => (
                                <div
                                    key={paper.id}
                                    className={`relative group p-3 rounded-lg border cursor-pointer transition-all ${leftPanelOpen ? 'flex items-start gap-3' : 'flex justify-center'} ${selectedPapers.includes(paper.id)
                                        ? 'bg-purple-50 border-purple-300'
                                        : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    {/* Selection Checkbox */}
                                    {leftPanelOpen && (
                                        <div
                                            onClick={() => togglePaperSelection(paper.id)}
                                            className={`mt-1 min-w-[16px] h-4 rounded border flex items-center justify-center transition-colors ${selectedPapers.includes(paper.id) ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}
                                        >
                                            {selectedPapers.includes(paper.id) && <CheckCircle2 size={10} />}
                                        </div>
                                    )}

                                    {leftPanelOpen ? (
                                        <div className="flex-1 overflow-hidden" onClick={() => { /* Maybe preview later */ }}>
                                            <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{paper.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400 truncate max-w-[100px]">{paper.authors}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePlayAudio(paper); }}
                                                    className={`ml-auto p-1 rounded-full ${activeAudioId === paper.id ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-300 hover:text-purple-600 hover:bg-purple-50'}`}
                                                    title="Listen to Podcast Summary"
                                                >
                                                    {activeAudioId === paper.id ? <StopCircle size={14} /> : <Headphones size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Collapsed View (Tooltip or Icon)
                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 group-hover:text-purple-600">
                                            <FileText size={16} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upload Button Area */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className={`w-full bg-white border border-gray-200 text-gray-700 font-medium py-2 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-all flex items-center justify-center gap-2 shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Upload size={18} /> {leftPanelOpen && (uploading ? 'Uploading...' : 'Upload PDF')}
                    </button>
                    <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={handleUpload} />
                </div>
            </div>


            {/* --- RIGHT PANEL (Active Workspace) --- */}
            <div className="flex-1 flex flex-col bg-gray-50 h-full relative">

                {/* Header (Context Title + Actions) */}
                <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3 text-gray-800">
                        {activeRightTab === 'chat' && <><MessageSquare size={20} className="text-purple-600" /><h2 className="font-bold text-lg">Research Assistant</h2></>}
                        {activeRightTab === 'graph' && <><Network size={20} className="text-purple-600" /><h2 className="font-bold text-lg">Knowledge Graph</h2></>}
                        {activeRightTab === 'compare' && <><ArrowLeftRight size={20} className="text-purple-600" /><h2 className="font-bold text-lg">Paper Comparison</h2></>}
                    </div>

                    {/* Compare Action Button (only if multiple selected and in compare tab) */}
                    {selectedPapers.length >= 2 && (
                        <button
                            onClick={handleCompare}
                            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md animate-fade-in flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <ArrowLeftRight size={16} /> Run Comparison
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">

                    {/* 1. CHAT VIEW */}
                    {activeRightTab === 'chat' && (
                        <div className="h-full flex flex-col">
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                            <Bot size={48} className="text-purple-200" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-600">Research Assistant</h3>
                                        <p className="text-gray-400 mt-2 max-w-md text-center">Select papers from the left to ask questions, or just start typing to search across your workspace.</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-2xl p-5 rounded-2xl shadow-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-purple-600 text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                }`}>
                                                <div className="prose prose-sm max-w-none text-inherit dark:prose-invert">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 flex items-center gap-2 text-gray-500">
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75" />
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-6 bg-white border-t border-gray-100">
                                <div className="max-w-4xl mx-auto relative cursor-text" onClick={() => document.getElementById('chat-input')?.focus()}>
                                    <input
                                        id="chat-input"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-6 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-inner text-gray-700 placeholder-gray-400"
                                        placeholder="Ask a question about your papers..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={loading || !input.trim()}
                                        className="absolute right-3 top-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all shadow-md"
                                    >
                                        <Bot size={20} />
                                    </button>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-3">
                                    AI can make mistakes. Verify important information.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 2. GRAPH VIEW */}
                    {activeRightTab === 'graph' && (
                        <div className="h-full bg-gray-50 relative flex items-center justify-center overflow-hidden">
                            <ForceGraph2D
                                graphData={graphData}
                                nodeLabel="name"
                                nodeColor={(node: any) => node.type === 'hub' ? '#4f46e5' : '#8b5cf6'}
                                nodeVal={(node: any) => node.val}
                                linkColor={(link: any) => link.color || '#cbd5e1'}
                                linkWidth={(link: any) => link.color ? 2 : 1}
                                backgroundColor="#f9fafb"
                                width={graphDimensions.w}
                                height={graphDimensions.h}
                                onNodeClick={(node: any) => {
                                    // Maybe jump to paper on click?
                                    if (node.type === 'paper') togglePaperSelection(node.id);
                                }}
                            />

                            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur p-4 rounded-xl border border-gray-200 shadow-sm pointer-events-none">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Network size={18} className="text-purple-600" /> Research Map
                                </h3>
                                <div className="text-xs text-gray-500 mt-1 space-y-1">
                                    <p>🟣 <b>Nodes:</b> Papers / Concepts</p>
                                    <p>🔵 <b>Center:</b> {currentWorkspace?.name}</p>
                                    <p>🩷 <b>Pink Links:</b> Shared Authors</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. COMPARE VIEW */}
                    {activeRightTab === 'compare' && (
                        <div className="h-full overflow-y-auto p-8 bg-gray-50">
                            {comparisonResult ? (
                                <div className="max-w-5xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                            <ArrowLeftRight size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">Comparative Analysis</h2>
                                            <p className="text-gray-500">AI-generated comparison of {selectedPapers.length} papers</p>
                                        </div>
                                    </div>
                                    <div className="prose prose-lg prose-indigo max-w-none">
                                        <ReactMarkdown>{comparisonResult}</ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    {isComparing ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
                                            <p className="font-medium text-gray-600">Analyzing papers...</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <ArrowLeftRight size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>Select multiple papers from the library and click "Compare" to start.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div >
    );
};

export default Dashboard;
