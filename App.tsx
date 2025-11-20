import React, { useState, useRef, useEffect } from 'react';
import { 
    generateProfessionalAsset, 
    editGameAsset, 
    extractTextureFromImage,
    reverseEngineerPrompt,
    analyzeForEngine,
    extractVisualStyle,
    generateVisualElement,
    generateVfxAsset,
    paintUVTexture,
    AnalysisReport
} from './services/geminiService';

// --- Types ---
interface Asset {
    id: string;
    type: 'logo' | 'banner' | 'texture' | 'edit' | 'ui' | 'remaster' | 'noise' | 'cookie' | 'uv';
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

// 2. Interface Studio (REDESIGNED - Visual Only)
const InterfaceStudio: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [refImage, setRefImage] = useState<File | null>(null);
    const [refPreview, setRefPreview] = useState<string | null>(null);
    const [targetPrompt, setTargetPrompt] = useState('');
    const [extractedStyle, setExtractedStyle] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedItem, setGeneratedItem] = useState<Asset | null>(null);
    const [analysisStatus, setAnalysisStatus] = useState('');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setRefImage(file);
            setRefPreview(URL.createObjectURL(file));
            
            // Auto-analyze on upload
            setLoading(true);
            setAnalysisStatus("Scanning visual features...");
            try {
                const style = await extractVisualStyle(file);
                setExtractedStyle(style);
                setAnalysisStatus("Style cloned successfully.");
            } catch (e) {
                setAnalysisStatus("Failed to extract style.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleGenerate = async () => {
        if (!targetPrompt) return;
        setLoading(true);
        try {
            // If no image, we use a generic high-quality style, or the user can type style in prompt
            const styleToUse = extractedStyle || "High-quality generic game UI style. Clean, modern, functional.";
            const url = await generateVisualElement(styleToUse, targetPrompt);
            
            const newAsset: Asset = {
                id: Date.now().toString(),
                type: 'ui',
                url,
                prompt: `[Visual Gen] ${targetPrompt}`,
                createdAt: new Date()
            };
            setGeneratedItem(newAsset);
            onSave(newAsset);
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Controls */}
            <div className="lg:w-1/3 flex flex-col gap-4 overflow-y-auto">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-1">Visual Interface</h2>
                    <p className="text-gray-400 text-sm">Create strictly visual, text-free UI assets.</p>
                </div>

                <div className="bg-game-panel p-5 rounded-xl border border-gray-800 space-y-6 shadow-xl">
                    
                    {/* Step 1: Style Source */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">1. Style Source (Optional)</label>
                            {refPreview && <button onClick={() => {setRefImage(null); setRefPreview(null); setExtractedStyle('');}} className="text-[10px] text-red-400 hover:underline">CLEAR</button>}
                        </div>
                        
                        <div className={`border-2 border-dashed rounded-lg transition-all relative overflow-hidden h-32 flex items-center justify-center cursor-pointer group
                            ${refPreview ? 'border-blue-500 bg-black' : 'border-gray-700 hover:border-blue-400 bg-black/20'}`}>
                            
                            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                            
                            {refPreview ? (
                                <img src={refPreview} className="h-full w-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                            ) : (
                                <div className="text-center pointer-events-none">
                                    <div className="text-2xl mb-1">🧬</div>
                                    <p className="text-xs font-bold text-gray-400">Drop Image to Clone Style</p>
                                </div>
                            )}
                            
                            {refPreview && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="bg-blue-600/90 text-white text-[10px] px-2 py-1 rounded shadow uppercase font-bold">Style Locked</span>
                                </div>
                            )}
                        </div>
                        {analysisStatus && <p className="text-[10px] text-gray-500 text-right italic">{analysisStatus}</p>}
                    </div>

                    {/* Step 2: Generation Prompt */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">2. Visual Element Description</label>
                        <textarea 
                            value={targetPrompt}
                            onChange={(e) => setTargetPrompt(e.target.value)}
                            placeholder="Describe the visual object: e.g., 'A glowing shield icon', 'A hexagonal frame', 'A health orb'."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-28 resize-none focus:border-blue-500 outline-none text-sm"
                        />
                        <p className="text-[10px] text-gray-500">
                            <span className="text-red-400 font-bold">NOTE:</span> AI is strictly instructed to generate NO TEXT. 
                            Describe visuals only.
                        </p>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={loading || !targetPrompt}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg font-display font-bold text-white shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                    >
                        {loading ? <Spinner /> : 'GENERATE VISUAL'}
                    </button>
                </div>
            </div>

            {/* Output Area */}
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden p-8">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-10 pointer-events-none"></div>
                
                {generatedItem ? (
                    <div className="relative z-10 flex flex-col items-center w-full h-full animate-in zoom-in-95 duration-300">
                        <div className="relative bg-[url('https://www.transparenttextures.com/patterns/ps-neutral.png')] bg-gray-800 p-1 rounded shadow-2xl border border-gray-700">
                            <img src={generatedItem.url} className="max-h-[500px] rounded object-contain bg-gray-900/50" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded border border-white/10 backdrop-blur-sm">NO TEXT MODE</span>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex gap-4">
                            <a href={generatedItem.url} download={`visual-ui-${Date.now()}.png`} className="px-8 py-3 bg-blue-600 rounded-full font-bold text-white hover:bg-blue-500 shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
                                <span>Download Asset</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center opacity-30 z-10 select-none">
                        <div className="text-8xl mb-4">👁️</div>
                        <p className="font-display text-2xl tracking-widest">VISUAL REPLICATOR</p>
                        <p className="text-sm mt-2">Upload reference style or describe object</p>
                    </div>
                )}
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

// 6. VFX & Lighting Studio (Overhauled for Modularity)
const VFXStudio: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [mode, setMode] = useState<'noise' | 'cookie'>('noise');
    const [selectedType, setSelectedType] = useState('Perlin Noise');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isDraft, setIsDraft] = useState(false);

    // Modules / Parameters
    // Noise Params
    const [scale, setScale] = useState('Standard');
    const [contrast, setContrast] = useState('High');
    const [complexity, setComplexity] = useState('Standard');
    // Cookie Params
    const [edge, setEdge] = useState('Sharp');
    const [aperture, setAperture] = useState('Square');
    const [vibe, setVibe] = useState('Clean');

    const noiseTypes = ["Perlin Noise", "Voronoi / Cellular", "Simplex Noise", "White Noise (Static)", "Curl Noise", "Caustics Water"];
    const cookieTypes = ["Venetian Blinds", "Tree Foliage", "Window Frame", "Industrial Grate", "Abstract Caustics", "Flashlight"];

    useEffect(() => {
        // Reset defaults when mode changes
        if (mode === 'noise') {
            setSelectedType(noiseTypes[0]);
        } else {
            setSelectedType(cookieTypes[0]);
            // Smart defaults for cookie types
            if (cookieTypes[0] === 'Flashlight') setAperture('Circular (Flashlight)');
        }
        setResult(null);
    }, [mode]);

    // Auto-set aperture for Flashlight type
    useEffect(() => {
        if (selectedType === 'Flashlight') setAperture('Circular (Flashlight)');
        else if (mode === 'cookie' && aperture === 'Circular (Flashlight)') setAperture('Square');
    }, [selectedType]);

    const handleGenerate = async (quality: 'draft' | 'pro') => {
        setLoading(true);
        setIsDraft(quality === 'draft');
        try {
            const url = await generateVfxAsset({
                type: selectedType,
                category: mode,
                scale, contrast, complexity, // noise params
                edge, aperture, vibe // cookie params
            }, quality);
            
            setResult(url);
            // Only auto-save PRO assets to library, not drafts
            if (quality === 'pro') {
                onSave({ 
                    id: Date.now().toString(), 
                    type: mode, 
                    url, 
                    prompt: `[${mode} - ${selectedType}] ${quality === 'pro' ? 'Final' : 'Draft'}`, 
                    createdAt: new Date() 
                });
            }
        } catch (e) { alert(e); } 
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">VFX Lab 2.0</h2>
                    <p className="text-gray-400 text-sm">Modular generation with live draft preview.</p>
                </div>
                
                <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
                    <button onClick={() => setMode('noise')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${mode === 'noise' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}>Math Noise</button>
                    <button onClick={() => setMode('cookie')} className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-all ${mode === 'cookie' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}>Light Projection</button>
                </div>

                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800 shadow-xl">
                    {/* Base Type Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Base Pattern</label>
                        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
                            {(mode === 'noise' ? noiseTypes : cookieTypes).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Modular Controls - Dynamic based on Mode */}
                    <div className="p-4 bg-black/20 rounded-lg border border-gray-700 space-y-4">
                        <p className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest mb-2 border-b border-gray-700 pb-1">Parameter Modules</p>
                        
                        {mode === 'noise' ? (
                            <>
                                <div>
                                    <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Scale / Zoom</span><span className="text-white">{scale}</span></label>
                                    <input type="range" min="0" max="2" step="1" 
                                        value={scale === 'Macro (Close)' ? 0 : scale === 'Standard' ? 1 : 2} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setScale(val === 0 ? 'Macro (Close)' : val === 1 ? 'Standard' : 'Micro (Far)');
                                        }}
                                        className="w-full accent-fuchsia-500"
                                    />
                                </div>
                                <div>
                                    <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Contrast</span><span className="text-white">{contrast}</span></label>
                                    <select value={contrast} onChange={(e) => setContrast(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded text-xs p-1">
                                        <option value="Low (Soft)">Low (Soft)</option>
                                        <option value="Standard">Standard</option>
                                        <option value="High (Hard)">High (Hard)</option>
                                        <option value="Binary (Black/White)">Binary (Black/White)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Complexity</span><span className="text-white">{complexity}</span></label>
                                    <select value={complexity} onChange={(e) => setComplexity(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded text-xs p-1">
                                        <option value="Simple">Simple</option>
                                        <option value="Standard">Standard</option>
                                        <option value="Chaotic">Chaotic</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Aperture Shape</span><span className="text-white">{aperture.split(' ')[0]}</span></label>
                                    <select value={aperture} onChange={(e) => setAperture(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded text-xs p-1">
                                        <option value="Square">Square (Window/General)</option>
                                        <option value="Circular (Flashlight)">Circular (Flashlight)</option>
                                        <option value="Irregular (Organic)">Irregular (Organic)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Edge Softness</span><span className="text-white">{edge}</span></label>
                                    <input type="range" min="0" max="2" step="1" 
                                        value={edge === 'Razor Sharp' ? 0 : edge === 'Sharp' ? 1 : 2} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setEdge(val === 0 ? 'Razor Sharp' : val === 1 ? 'Sharp' : 'Soft/Diffused');
                                        }}
                                        className="w-full accent-fuchsia-500"
                                    />
                                </div>
                                <div>
                                    <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Style / Vibe</span><span className="text-white">{vibe}</span></label>
                                    <select value={vibe} onChange={(e) => setVibe(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded text-xs p-1">
                                        <option value="Clean">Clean</option>
                                        <option value="Dirty/Grungy">Dirty/Grungy</option>
                                        <option value="Old/Damaged">Old/Damaged</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button onClick={() => handleGenerate('draft')} disabled={loading} className="py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white text-sm transition-colors border border-gray-600">
                            {loading && isDraft ? <Spinner /> : '⚡ LIVE PREVIEW'}
                        </button>
                        <button onClick={() => handleGenerate('pro')} disabled={loading} className="py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-lg font-bold text-white text-sm shadow-lg hover:shadow-fuchsia-500/20 transition-all">
                            {loading && !isDraft ? <Spinner /> : 'RENDER FINAL'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[400px]">
                 {result ? (
                    <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-300">
                         <div className="relative">
                             <img src={result} className={`max-w-[500px] rounded shadow-2xl border ${isDraft ? 'border-yellow-500/50' : 'border-gray-700'} ${mode === 'cookie' ? 'bg-black' : ''}`} alt="VFX Asset" />
                             {isDraft && <div className="absolute top-2 right-2 bg-yellow-500/80 text-black px-2 py-1 rounded text-xs font-bold uppercase">Draft Preview</div>}
                         </div>
                         
                         <div className="mt-4 flex gap-4 items-center">
                            {isDraft ? (
                                <div className="text-yellow-500 text-sm flex items-center gap-2">
                                    <span>⚠️ Low Resolution Preview.</span>
                                    <button onClick={() => handleGenerate('pro')} className="underline hover:text-white font-bold">Render Final</button>
                                </div>
                            ) : (
                                <a href={result} download={`vfx-${Date.now()}.jpg`} className="px-6 py-2 bg-fuchsia-600 rounded font-bold text-white hover:bg-fuchsia-500 shadow-lg">Download 4K Asset</a>
                            )}
                         </div>
                    </div>
                ) : (
                    <div className="text-center opacity-30">
                        <div className="text-8xl mb-4">💡</div>
                        <p className="font-display text-2xl tracking-widest">CONFIGURE MODULES</p>
                        <p className="text-sm mt-2">Set parameters and click Preview</p>
                    </div>
                )}
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

// 8. UV Painter (New)
const UVPainter: React.FC<{ onSave: (asset: Asset) => void }> = ({ onSave }) => {
    const [uvImage, setUvImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [objectType, setObjectType] = useState('');
    const [style, setStyle] = useState('');
    const [colors, setColors] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setUvImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResultUrl(null);
        }
    };

    const handlePaint = async () => {
        if (!uvImage || !objectType) return;
        setLoading(true);
        
        // Simulated Status Sequence for "Logical" Feel
        const sequence = ["Analyzing UV Islands...", "Calculating Geometry...", "Generating Base Coat...", "Applying Detail Pass..."];
        let step = 0;
        setStatus(sequence[0]);
        
        const interval = setInterval(() => {
            step++;
            if (step < sequence.length) setStatus(sequence[step]);
        }, 2000); // Change message every 2s while waiting

        try {
            const url = await paintUVTexture(uvImage, objectType, style || "Realistic", colors || "Standard");
            setResultUrl(url);
            onSave({
                id: Date.now().toString(),
                type: 'uv',
                url: url,
                prompt: `[UV Paint] ${objectType} - ${style}`,
                createdAt: new Date()
            });
        } catch (e) {
            alert(e);
        } finally {
            clearInterval(interval);
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">UV Atelier</h2>
                    <p className="text-gray-400 text-sm">Texture painting on existing UV layouts.</p>
                </div>

                <div className="bg-game-panel p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
                    {/* Input 1: Upload */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. UV Wireframe</label>
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-teal-500 transition-colors relative cursor-pointer bg-black/20">
                            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            {previewUrl ? (
                                <img src={previewUrl} className="max-h-24 mx-auto opacity-70" />
                            ) : (
                                <>
                                    <div className="text-2xl mb-1">🕸️</div>
                                    <span className="text-xs text-gray-400">Upload UV Layout</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Input 2: Object Def */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Object Definition</label>
                        <input 
                            type="text" 
                            value={objectType}
                            onChange={(e) => setObjectType(e.target.value)}
                            placeholder="e.g., Sci-Fi Crate, Medieval Shield"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-teal-500 outline-none"
                        />
                    </div>

                    {/* Input 3: Style */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Style</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-white">
                                <option value="">Select Style...</option>
                                <option value="PBR Realistic">PBR Realistic</option>
                                <option value="Hand Painted (Stylized)">Hand Painted</option>
                                <option value="Cyberpunk / Neon">Cyberpunk</option>
                                <option value="Rusty / Worn">Rusty / Worn</option>
                                <option value="Clean Vector">Clean Vector</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Color</label>
                            <input 
                                type="text" 
                                value={colors}
                                onChange={(e) => setColors(e.target.value)}
                                placeholder="e.g., Gold & Red"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-white focus:border-teal-500 outline-none"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handlePaint} 
                        disabled={loading || !uvImage || !objectType}
                        className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-lg font-display font-bold text-white shadow-lg disabled:opacity-50 mt-4"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center">
                                <Spinner />
                                <span className="text-[10px] mt-1 font-mono text-teal-200">{status}</span>
                            </div>
                        ) : 'PAINT TEXTURE'}
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div className="lg:w-2/3 bg-black/40 rounded-2xl border border-gray-800 flex items-center justify-center min-h-[400px] relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2 pointer-events-none opacity-20">
                     {/* Background Grid */}
                     <div className="border-r border-gray-700 h-full"></div>
                     <div className="h-full"></div>
                </div>

                {resultUrl ? (
                    <div className="relative z-10 flex flex-col items-center w-full h-full p-6">
                         <div className="flex-1 flex gap-4 w-full justify-center items-center">
                            {/* Compare View */}
                            <div className="relative w-1/2 aspect-square bg-gray-900 rounded border border-gray-700 overflow-hidden">
                                <img src={previewUrl!} className="w-full h-full object-contain opacity-50" />
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 rounded text-[10px] text-gray-400">INPUT UV</div>
                            </div>
                            <div className="text-2xl text-gray-600">➔</div>
                            <div className="relative w-1/2 aspect-square bg-gray-900 rounded border border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.2)] overflow-hidden">
                                <img src={resultUrl} className="w-full h-full object-contain" />
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 rounded text-[10px] text-teal-400 font-bold">OUTPUT TEXTURE</div>
                            </div>
                         </div>
                         <a href={resultUrl} download="uv-texture.png" className="mt-6 px-8 py-3 bg-teal-600 rounded font-bold text-white hover:bg-teal-500 shadow-lg">Download Texture Map</a>
                    </div>
                ) : (
                    <div className="text-center opacity-30 z-10">
                        <div className="text-8xl mb-4">🎨</div>
                        <p className="font-display text-2xl tracking-widest">UV WORKSPACE</p>
                        <p className="text-sm mt-2">Upload a UV map to begin painting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// 9. Asset Library (Standard)
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
    const [activeModule, setActiveModule] = useState<'logo' | 'environment' | 'texture' | 'editor' | 'library' | 'inspector' | 'interface' | 'vfx' | 'uv'>('uv');
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
                        <SidebarItem icon="🎨" label="UV Atelier" active={activeModule === 'uv'} onClick={() => setActiveModule('uv')} />
                        <SidebarItem icon="👁️" label="Visual Interface" active={activeModule === 'interface'} onClick={() => setActiveModule('interface')} />
                        <SidebarItem icon="⚜️" label="Logo Forge" active={activeModule === 'logo'} onClick={() => setActiveModule('logo')} />
                        <SidebarItem icon="🏔️" label="World Builder" active={activeModule === 'environment'} onClick={() => setActiveModule('environment')} />
                        <SidebarItem icon="🧱" label="Texture Forge" active={activeModule === 'texture'} onClick={() => setActiveModule('texture')} />
                        <SidebarItem icon="💡" label="VFX Lab" active={activeModule === 'vfx'} onClick={() => setActiveModule('vfx')} />
                        <SidebarItem icon="🛠️" label="Asset Editor" active={activeModule === 'editor'} onClick={() => setActiveModule('editor')} />
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
                    {activeModule === 'uv' && <UVPainter onSave={addToLibrary} />}
                    {activeModule === 'editor' && <AssetEditor onSave={addToLibrary} />}
                    {activeModule === 'library' && <AssetLibrary assets={library} onDelete={deleteFromLibrary} />}
                </div>
            </main>
        </div>
    );
};

export default App;