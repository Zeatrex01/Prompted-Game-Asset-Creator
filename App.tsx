import React, { useState, useRef, useEffect } from 'react';
import { 
    generateProfessionalAsset, 
    editGameAsset, 
    extractTextureFromImage,
    reverseEngineerPrompt,
    analyzeForEngine,
    extractUiStyle,
    generateUiComponent,
    generateNoiseTexture,
    generateLightCookie,
    AnalysisReport
} from './services/geminiService';

// --- Types ---
interface Asset {
    id: string;
    type: 'logo' | 'banner' | 'texture' | 'edit' | 'ui' | 'remaster' | 'noise' | 'cookie';
    url: string;
    prompt: string;
    createdAt: Date;
}

// --- UI Components ---

const SidebarItem: React.FC<{ 
    icon: string; 
    label: string; 
    active: boolean; 
    onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${active ? 'bg-game-accent text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
    >
        <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
        <span className="font-display font-medium tracking-wide text-sm text-left">{label}</span>
    </button>
);

const Spinner: React.FC = () => (
    <div className="flex items-center justify-center gap-2 text-game-accent">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
        <span className="font-bold font-display uppercase text-sm tracking-widest">Processing</span>
    </div>
);

// --- Modules ---

// 1. The Inspector (Analysis & Remastering)
const Inspector: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [engine, setEngine] = useState('Unreal Engine 5');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<AnalysisReport | null>(null);
    const [remasteredUrl, setRemasteredUrl] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setReport(null);
            setRemasteredUrl(null);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setLoading(true);
        try {
            const data = await analyzeForEngine(image, engine);
            setReport(data);
        } catch (e) {
            alert("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemaster = async () => {
        if (!report) return;
        setLoading(true);
        try {
            const url = await generateProfessionalAsset(
                report.remasterPrompt,
                'banner', 
                `${engine} Professional`, 
                '1:1'
            );
            setRemasteredUrl(url);
            onSave({
                id: Date.now().toString(),
                type: 'remaster',
                url,
                prompt: `[Remastered for ${engine}] ${report.remasterPrompt}`,
                createdAt: new Date()
            });
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Input Column */}
            <div className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                <h2 className="text-3xl font-display font-bold text-white">The Inspector</h2>
                <p className="text-gray-400 text-sm">Technical analysis & Engine optimization.</p>
                
                <div className="bg-game-panel p-4 rounded-xl border border-gray-800">
                     {!previewUrl ? (
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors relative cursor-pointer">
                            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            <div className="text-4xl mb-2">🕵️</div>
                            <p className="font-bold text-sm text-gray-300">Upload Asset for Analysis</p>
                        </div>
                     ) : (
                        <div className="relative">
                            <img src={previewUrl} className="w-full rounded-lg border border-gray-700" alt="Subject" />
                            <button onClick={() => {setImage(null); setPreviewUrl(null); setReport(null);}} className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 p-1 rounded-full text-white transition-colors">✕</button>
                        </div>
                     )}
                </div>

                <div className="bg-game-panel p-4 rounded-xl border border-gray-800">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Target Engine</label>
                    <select 
                        value={engine} 
                        onChange={(e) => setEngine(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-4"
                    >
                        <option value="Unreal Engine 5">Unreal Engine 5 (Nanite/Lumen)</option>
                        <option value="Unity HDRP">Unity HDRP (High Fidelity)</option>
                        <option value="Godot 4">Godot 4 (Indie/Stylized)</option>
                        <option value="Mobile (iOS/Android)">Mobile (Optimized/Baked)</option>
                        <option value="Retro / Pixel Engine">Retro (Limited Palette)</option>
                    </select>
                    
                    <button 
                        onClick={handleAnalyze} 
                        disabled={!image || loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded font-bold text-white transition-colors disabled:opacity-50"
                    >
                        {loading ? <Spinner /> : 'RUN DIAGNOSTICS'}
                    </button>
                </div>
            </div>

            {/* Analysis & Output Column */}
            <div className="lg:w-2/3 flex flex-col gap-4 h-full overflow-hidden">
                {report ? (
                    <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-right-4">
                        <div className="flex-1 bg-black/30 rounded-xl border border-gray-800 p-6 overflow-y-auto font-mono text-sm">
                             <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-display text-indigo-400">Diagnostic Report</h3>
                                <span className="bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded text-xs border border-indigo-700">{engine}</span>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-gray-500 uppercase font-bold text-xs mb-2 border-b border-gray-800 pb-1">Critique</h4>
                                    <p className="text-gray-300 leading-relaxed mb-4">{report.critique}</p>
                                    
                                    <h4 className="text-red-400 uppercase font-bold text-xs mb-2 border-b border-red-900/30 pb-1">Detected Issues</h4>
                                    <ul className="list-disc list-inside text-red-200/80 space-y-1">
                                        {report.technicalIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-emerald-400 uppercase font-bold text-xs mb-2 border-b border-emerald-900/30 pb-1">Optimization Plan</h4>
                                    <p className="text-gray-300 leading-relaxed mb-4">{report.engineSuggestions}</p>
                                    
                                    {remasteredUrl ? (
                                         <div className="mt-4">
                                            <p className="text-xs text-gray-500 uppercase mb-2">Remastered Result</p>
                                            <img src={remasteredUrl} className="w-full rounded border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]" alt="Remastered" />
                                            <a href={remasteredUrl} download="remastered.jpg" className="block text-center mt-2 bg-emerald-600 py-2 rounded text-white font-bold hover:bg-emerald-500">Download</a>
                                         </div>
                                    ) : (
                                        <div className="mt-4 bg-gray-900 p-4 rounded border border-gray-700 text-center">
                                            <p className="text-gray-400 text-xs mb-3">AI can attempt to fix these issues and regenerate the asset.</p>
                                            <button 
                                                onClick={handleRemaster}
                                                disabled={loading}
                                                className="w-full py-2 border border-emerald-500 text-emerald-400 hover:bg-emerald-900/30 rounded font-bold transition-colors"
                                            >
                                                {loading ? <Spinner /> : '✨ AUTO-REMASTER'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-700 bg-black/20 rounded-xl border border-gray-800 border-dashed">
                         <div className="text-6xl mb-4 grayscale opacity-20">📊</div>
                         <p>Waiting for Asset Analysis...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// 2. Interface Studio (GUI Generator)
const InterfaceStudio: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [styleRef, setStyleRef] = useState<File | null>(null);
    const [styleDesc, setStyleDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedItems, setGeneratedItems] = useState<Asset[]>([]);
    
    // Quick select components
    const components = [
        "Main Menu Button", "Health Bar", "Inventory Grid Slot", 
        "Dialog Box Background", "Skill Icon Frame", "Settings Toggle Switch"
    ];
    const [selectedComp, setSelectedComp] = useState(components[0]);

    const handleAnalyzeStyle = async (file: File) => {
        setLoading(true);
        try {
            const desc = await extractUiStyle(file);
            setStyleDesc(desc);
            setStyleRef(file);
        } catch (e) {
            alert("Failed to analyze UI style.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!styleDesc) return;
        setLoading(true);
        try {
            const url = await generateUiComponent(styleDesc, selectedComp);
            const newAsset: Asset = {
                id: Date.now().toString(),
                type: 'ui',
                url,
                prompt: `[${selectedComp}] ${styleDesc}`,
                createdAt: new Date()
            };
            setGeneratedItems([newAsset, ...generatedItems]);
            onSave(newAsset);
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto">
                <h2 className="text-3xl font-display font-bold text-white">Interface Studio</h2>
                <p className="text-gray-400 text-sm">Create consistent GUI packages.</p>

                <div className="bg-game-panel p-4 rounded-xl border border-gray-800 space-y-4">
                     <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Style Reference</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1 bg-gray-900 rounded h-20 flex items-center justify-center border border-gray-700 cursor-pointer hover:border-game-accent overflow-hidden">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && handleAnalyzeStyle(e.target.files[0])} />
                                {styleRef ? (
                                    <img src={URL.createObjectURL(styleRef)} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <span className="text-xs text-gray-400">Upload Image</span>
                                )}
                            </div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Style Guide (Editable)</label>
                        <textarea 
                            value={styleDesc}
                            onChange={(e) => setStyleDesc(e.target.value)}
                            placeholder="Or describe style here (e.g., Steampunk brass with rivets...)"
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-32 text-sm focus:border-game-accent outline-none"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">3. Component to Build</label>
                        <select 
                            value={selectedComp}
                            onChange={(e) => setSelectedComp(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-4"
                        >
                            {components.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button 
                            onClick={handleGenerate} 
                            disabled={loading || !styleDesc}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded font-bold text-white hover:shadow-lg hover:shadow-blue-900/20 transition-all disabled:opacity-50"
                        >
                            {loading ? <Spinner /> : 'GENERATE COMPONENT'}
                        </button>
                     </div>
                </div>
            </div>

            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 p-4 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {generatedItems.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-600">
                            <div className="text-4xl mb-2">🖥️</div>
                            <p>No UI assets generated yet.</p>
                        </div>
                    ) : (
                        generatedItems.map(item => (
                            <div key={item.id} className="bg-[url('https://www.transparenttextures.com/patterns/ps-neutral.png')] bg-gray-800 rounded-lg p-4 flex flex-col items-center relative group border border-gray-700 hover:border-blue-500 transition-colors">
                                <img src={item.url} className="max-h-32 object-contain drop-shadow-lg" />
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                     <a href={item.url} download="ui-asset.png" className="text-white font-bold text-sm hover:text-blue-400">Download</a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// 3. Logo Studio (Kept similar but cleaned up)
const LogoStudio: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Vector Minimalist');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            const url = await generateProfessionalAsset(prompt, 'logo', style, '1:1');
            setResult(url);
            onSave({ id: Date.now().toString(), type: 'logo', url, prompt: `[${style}] ${prompt}`, createdAt: new Date() });
        } catch (e) { alert(e); } 
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Logo Forge</h2>
                    <p className="text-gray-400 text-sm">Create professional branding assets.</p>
                </div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand Concept</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A cybernetic wolf head" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-32 resize-none focus:border-game-accent outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Style</label>
                        <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
                            <option value="Vector Minimalist">Vector Minimalist</option>
                            <option value="Esports Mascot">Esports Mascot</option>
                            <option value="3D Rendered Glossy">3D Rendered Glossy</option>
                            <option value="Chrome Metal">Chrome Metal</option>
                        </select>
                    </div>
                    <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg font-display font-bold text-white shadow-lg disabled:opacity-50">
                        {loading ? <Spinner /> : 'FORGE LOGO'}
                    </button>
                </div>
            </div>
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden min-h-[400px]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                {result ? (
                    <div className="relative z-10 flex flex-col items-center">
                         <img src={result} alt="Logo" className="max-h-[500px] rounded-xl shadow-2xl border border-gray-700" />
                         <a href={result} download={`logo-${Date.now()}.png`} className="mt-4 px-6 py-2 bg-game-accent rounded-full text-sm font-bold hover:bg-white hover:text-game-accent transition-colors">Download PNG</a>
                    </div>
                ) : (
                    <div className="text-center z-10 opacity-30 select-none"><div className="text-8xl mb-4">⚜️</div><p className="font-display text-2xl tracking-widest">AWAITING BLUEPRINT</p></div>
                )}
            </div>
        </div>
    );
};

// 4. Environment Studio
const EnvironmentStudio: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Unreal Engine 5 Realistic');
    const [aspect, setAspect] = useState('16:9');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            const url = await generateProfessionalAsset(prompt, 'banner', style, aspect);
            setResult(url);
            onSave({ id: Date.now().toString(), type: 'banner', url, prompt: `[${style}] ${prompt}`, createdAt: new Date() });
        } catch (e) { alert(e); } 
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">World Builder</h2>
                    <p className="text-gray-400 text-sm">Cinematic backgrounds.</p>
                </div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A ruined cyberpunk city" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-32 resize-none focus:border-game-accent outline-none" />
                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
                        <option value="Unreal Engine 5 Realistic">Unreal Engine 5</option>
                        <option value="Digital Painting Fantasy">Fantasy Painting</option>
                        <option value="Sci-Fi Concept Art">Sci-Fi Concept</option>
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                        {['16:9', '9:16', '4:3'].map(r => (
                            <button key={r} onClick={() => setAspect(r)} className={`py-2 text-sm rounded border ${aspect === r ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-700 text-gray-400'}`}>{r}</button>
                        ))}
                    </div>
                    <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg font-display font-bold text-white shadow-lg disabled:opacity-50">{loading ? <Spinner /> : 'RENDER WORLD'}</button>
                </div>
            </div>
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[400px]">
                {result ? <img src={result} className="max-w-full max-h-full object-contain rounded shadow-2xl" /> : <div className="text-center opacity-30"><div className="text-8xl mb-4">🏔️</div><p className="font-display text-2xl tracking-widest">VIEWPORT EMPTY</p></div>}
            </div>
        </div>
    );
};

// 5. Texture Forge (Upgraded)
const TextureForge: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [mode, setMode] = useState<'create' | 'extract' | 'seamless'>('create');
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState('');

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            const url = await generateProfessionalAsset(prompt, 'texture', 'PBR Material', '1:1');
            setResult(url);
            onSave({ id: Date.now().toString(), type: 'texture', url, prompt: `[Generated] ${prompt}`, createdAt: new Date() });
        } catch (e) { alert(e); } 
        finally { setLoading(false); }
    };

    const handleProcessImage = async (e: React.ChangeEvent<HTMLInputElement>, seamless: boolean) => {
        if (e.target.files?.[0]) {
            setLoading(true);
            setResult(null);
            try {
                const { textureUrl, materialAnalysis } = await extractTextureFromImage(e.target.files[0], seamless);
                setResult(textureUrl);
                setAnalysis(materialAnalysis);
                onSave({
                    id: Date.now().toString(),
                    type: 'texture',
                    url: textureUrl,
                    prompt: `[${seamless ? 'Seamless' : 'Extracted'}] ${materialAnalysis}`,
                    createdAt: new Date()
                });
            } catch (err) { alert(err); } 
            finally { setLoading(false); }
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Texture Forge</h2>
                    <p className="text-gray-400 text-sm">Create, extract, or tile materials.</p>
                </div>
                <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
                    <button onClick={() => setMode('create')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded transition-all ${mode === 'create' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>New</button>
                    <button onClick={() => setMode('extract')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded transition-all ${mode === 'extract' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>Extract</button>
                    <button onClick={() => setMode('seamless')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded transition-all ${mode === 'seamless' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>Make Seamless</button>
                </div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800 shadow-xl">
                    {mode === 'create' ? (
                        <>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Material description..." className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-32 resize-none focus:border-game-accent outline-none" />
                            <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg font-display font-bold text-white hover:shadow-amber-600/40 transition-all disabled:opacity-50">{loading ? <Spinner /> : 'FORGE MATERIAL'}</button>
                        </>
                    ) : (
                        <>
                            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-amber-500 transition-colors cursor-pointer relative">
                                <input type="file" onChange={(e) => handleProcessImage(e, mode === 'seamless')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                <div className="text-4xl mb-2">{mode === 'seamless' ? '🧩' : '📷'}</div>
                                <p className="font-bold text-white">{mode === 'seamless' ? 'Upload to Tile' : 'Upload Reference'}</p>
                                <p className="text-xs text-gray-500 mt-2">{mode === 'seamless' ? 'AI will remove seams & lighting artifacts.' : 'Analyze & recreate material.'}</p>
                            </div>
                            {loading && <div className="text-center text-amber-500 text-sm animate-pulse">Processing material data...</div>}
                        </>
                    )}
                    {analysis && <div className="bg-black/30 p-3 rounded border border-gray-700"><p className="text-xs text-gray-400 uppercase font-bold mb-1">Analysis</p><p className="text-xs text-gray-200 italic line-clamp-4">{analysis}</p></div>}
                </div>
            </div>
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[400px]">
                 {result ? (
                    <div className="relative w-full h-full p-8 flex flex-col items-center justify-center animate-in fade-in">
                         <div className="w-full h-full rounded shadow-2xl border border-gray-700 min-h-[300px]" style={{ backgroundImage: `url(${result})`, backgroundSize: '256px' }}></div>
                         <div className="mt-4 flex items-center gap-4">
                            <span className="bg-black/50 px-3 py-1 rounded text-xs text-gray-400">Preview Tiled 256px</span>
                            <a href={result} download={`texture-${Date.now()}.jpg`} className="text-amber-500 font-bold text-sm hover:text-white uppercase">Download Texture</a>
                         </div>
                    </div>
                ) : <div className="text-center opacity-30"><div className="text-8xl mb-4">🧱</div><p className="font-display text-2xl tracking-widest">MATERIAL SLOT EMPTY</p></div>}
            </div>
        </div>
    );
}

// 6. VFX & Lighting Studio
const VFXStudio: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [mode, setMode] = useState<'noise' | 'cookie'>('noise');
    const [selectedType, setSelectedType] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    // Options
    const noiseTypes = ["Perlin Noise", "Voronoi / Cellular", "Simplex Noise", "White Noise (Static)", "Value Noise", "Curl Noise", "Caustics Water"];
    const cookieTypes = ["Venetian Blinds", "Tree Foliage Shadows", "Window Frame (Cross)", "Jail Bars", "Industrial Grate", "Softbox Gradient", "Abstract Caustics", "Flashlight Soft"];

    useEffect(() => {
        setSelectedType(mode === 'noise' ? noiseTypes[0] : cookieTypes[0]);
        setResult(null);
    }, [mode]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            let url;
            if (mode === 'noise') url = await generateNoiseTexture(selectedType);
            else url = await generateLightCookie(selectedType);
            
            setResult(url);
            onSave({ 
                id: Date.now().toString(), 
                type: mode, 
                url, 
                prompt: `[${mode === 'noise' ? 'Noise' : 'Gobo'}] ${selectedType}`, 
                createdAt: new Date() 
            });
        } catch (e) { alert(e); } 
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">VFX & Lighting Lab</h2>
                    <p className="text-gray-400 text-sm">Generate technical maps and light masks.</p>
                </div>
                <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
                    <button onClick={() => setMode('noise')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${mode === 'noise' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}>Noise Generator</button>
                    <button onClick={() => setMode('cookie')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${mode === 'cookie' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}>Light Cookies</button>
                </div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{mode === 'noise' ? 'Pattern Type' : 'Projection Shape'}</label>
                        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
                            {(mode === 'noise' ? noiseTypes : cookieTypes).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    
                    <div className="text-xs text-gray-400 p-3 bg-black/20 rounded border border-gray-700">
                        {mode === 'noise' ? 'Generates seamless, high-contrast grayscale procedural noise maps suitable for shader math, erosion, and particle VFX.' : 'Generates high-contrast Black & White projection textures (Gobos) for Spotlights to create complex shadows.'}
                    </div>

                    <button onClick={handleGenerate} disabled={loading} className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-lg font-display font-bold text-white shadow-lg disabled:opacity-50">
                        {loading ? <Spinner /> : 'GENERATE ASSET'}
                    </button>
                </div>
            </div>
            
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[400px]">
                 {result ? (
                    <div className="relative flex flex-col items-center">
                         <img src={result} className={`max-w-[500px] rounded shadow-2xl border border-gray-700 ${mode === 'cookie' ? 'bg-black' : ''}`} alt="VFX Asset" />
                         <div className="mt-4 flex gap-4">
                            <a href={result} download={`vfx-${Date.now()}.jpg`} className="px-4 py-2 bg-fuchsia-600 rounded font-bold text-white hover:bg-fuchsia-500">Download Map</a>
                         </div>
                    </div>
                ) : <div className="text-center opacity-30"><div className="text-8xl mb-4">💡</div><p className="font-display text-2xl tracking-widest">LABORATORY IDLE</p></div>}
            </div>
        </div>
    );
}


// 7. Asset Editor
const AssetEditor: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [reversePrompt, setReversePrompt] = useState('');

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setImage(e.target.files[0]);
            setPreviewUrl(URL.createObjectURL(e.target.files[0]));
            setReversePrompt('');
        }
    };

    const handleEdit = async () => {
        if (!image || !prompt) return;
        setLoading(true);
        try {
            const newUrl = await editGameAsset(image, null, prompt); // Simplified editor for now
            setPreviewUrl(newUrl);
            // Convert back to file for further edits if needed...
            onSave({ id: Date.now().toString(), type: 'edit', url: newUrl, prompt: `[Edit] ${prompt}`, createdAt: new Date() });
        } catch (e) { alert(e); } finally { setLoading(false); }
    };
    
    const handleGetPrompt = async () => {
        if (!image) return;
        setLoading(true);
        try { const p = await reverseEngineerPrompt(image); setReversePrompt(p); } catch (e) { alert(e); } finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 p-6 flex flex-col relative min-h-[500px]">
                 {!previewUrl ? (
                     <div className="flex-1 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-game-accent transition-colors" onClick={() => document.getElementById('file-upload')?.click()}>
                         <input type="file" id="file-upload" className="hidden" onChange={handleUpload} />
                         <div className="text-5xl mb-4">📤</div>
                         <p className="font-display text-xl text-gray-400">Drop Asset Here</p>
                     </div>
                 ) : (
                     <div className="flex-1 relative flex items-center justify-center bg-black/50 rounded-xl overflow-hidden">
                         <img src={previewUrl} className="max-w-full max-h-full" alt="Edit Target" />
                     </div>
                 )}
            </div>
            <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6 overflow-y-auto">
                <div><h2 className="text-3xl font-display font-bold text-white mb-2">Smart Editor</h2><p className="text-gray-400 text-sm">Edit or reverse-engineer assets.</p></div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Instruction: e.g., Make it night time" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent outline-none h-24 resize-none" />
                    <button onClick={handleEdit} disabled={loading || !image} className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg font-display font-bold text-white disabled:opacity-50">{loading ? <Spinner /> : 'APPLY EDIT'}</button>
                    <div className="border-t border-gray-800 pt-4 mt-4">
                        <button onClick={handleGetPrompt} disabled={loading || !image} className="w-full py-2 border border-gray-600 rounded text-gray-300 text-xs font-bold uppercase hover:bg-gray-800 transition-colors">Get Prompt from Image</button>
                        {reversePrompt && <div className="mt-2 p-2 bg-black/40 rounded text-xs text-gray-300 border border-gray-700">{reversePrompt}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 8. Asset Library (Standard)
const AssetLibrary: React.FC<{ assets: Asset[], onDelete: (id: string) => void }> = ({ assets, onDelete }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="mb-6"><h2 className="text-3xl font-display font-bold text-white mb-2">Asset Inventory</h2><p className="text-gray-400 text-sm">Manage your generated game assets.</p></div>
            {assets.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-gray-600 opacity-50"><div className="text-6xl mb-4">📦</div><p className="text-xl font-display">Inventory Empty</p></div> : 
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-2 pb-20">
                {assets.map((asset) => (
                    <div key={asset.id} className="group relative bg-gray-900 rounded-lg border border-gray-800 overflow-hidden aspect-square hover:border-game-accent transition-all">
                        <img src={asset.url} alt={asset.type} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <div className="flex gap-2 justify-between items-end">
                                <span className="text-xs font-bold uppercase bg-game-accent px-2 py-0.5 rounded text-white">{asset.type}</span>
                                <div className="flex gap-2">
                                    <a href={asset.url} download={`${asset.type}-${asset.id}.png`} className="p-2 bg-gray-800 rounded-full hover:bg-white hover:text-black text-white transition-colors">⬇️</a>
                                    <button onClick={() => onDelete(asset.id)} className="p-2 bg-red-900/80 rounded-full hover:bg-red-600 text-white transition-colors">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>}
        </div>
    );
}

// --- Main Layout ---

const App: React.FC = () => {
    const [activeModule, setActiveModule] = useState<'logo' | 'environment' | 'texture' | 'editor' | 'library' | 'inspector' | 'interface' | 'vfx'>('inspector');
    const [library, setLibrary] = useState<Asset[]>([]);

    const addToLibrary = (asset: Asset) => { setLibrary(prev => [asset, ...prev]); };
    const deleteFromLibrary = (id: string) => { setLibrary(prev => prev.filter(a => a.id !== id)); };

    return (
        <div className="flex h-screen bg-game-dark font-sans text-gray-200 selection:bg-game-accent selection:text-white overflow-hidden">
            <aside className="w-64 bg-game-panel border-r border-gray-800 flex flex-col p-4 z-20 flex-shrink-0">
                <div className="mb-8 px-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-game-accent to-purple-600 rounded-lg flex items-center justify-center text-white font-bold font-display shadow-[0_0_15px_rgba(99,102,241,0.5)]">G</div>
                    <h1 className="text-xl font-display font-bold text-white tracking-wider">GEMINI<span className="text-game-accent">STUDIO</span></h1>
                </div>

                <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="mb-4">
                        <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Analysis</p>
                        <SidebarItem icon="🕵️" label="The Inspector" active={activeModule === 'inspector'} onClick={() => setActiveModule('inspector')} />
                    </div>
                    <div className="mb-4">
                        <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Production</p>
                        <SidebarItem icon="🖥️" label="Interface Studio" active={activeModule === 'interface'} onClick={() => setActiveModule('interface')} />
                        <SidebarItem icon="⚜️" label="Logo Forge" active={activeModule === 'logo'} onClick={() => setActiveModule('logo')} />
                        <SidebarItem icon="🏔️" label="World Builder" active={activeModule === 'environment'} onClick={() => setActiveModule('environment')} />
                        <SidebarItem icon="🧱" label="Texture Forge" active={activeModule === 'texture'} onClick={() => setActiveModule('texture')} />
                        <SidebarItem icon="💡" label="VFX Lab" active={activeModule === 'vfx'} onClick={() => setActiveModule('vfx')} />
                        <SidebarItem icon="🎨" label="Asset Editor" active={activeModule === 'editor'} onClick={() => setActiveModule('editor')} />
                    </div>
                    <div>
                        <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Storage</p>
                        <SidebarItem icon="📦" label="Inventory" active={activeModule === 'library'} onClick={() => setActiveModule('library')} />
                    </div>
                </nav>
            </aside>

            <main className="flex-1 relative flex flex-col min-w-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noisy-grid.png')] opacity-5 pointer-events-none z-0"></div>
                <div className="relative z-10 flex-1 p-6 overflow-hidden">
                    {activeModule === 'inspector' && <Inspector onSave={addToLibrary} />}
                    {activeModule === 'interface' && <InterfaceStudio onSave={addToLibrary} />}
                    {activeModule === 'logo' && <LogoStudio onSave={addToLibrary} />}
                    {activeModule === 'environment' && <EnvironmentStudio onSave={addToLibrary} />}
                    {activeModule === 'texture' && <TextureForge onSave={addToLibrary} />}
                    {activeModule === 'vfx' && <VFXStudio onSave={addToLibrary} />}
                    {activeModule === 'editor' && <AssetEditor onSave={addToLibrary} />}
                    {activeModule === 'library' && <AssetLibrary assets={library} onDelete={deleteFromLibrary} />}
                </div>
            </main>
        </div>
    );
};

export default App;