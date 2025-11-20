
import React, { useState, useRef, useEffect } from 'react';
import { 
    generateProfessionalAsset, 
    editGameAsset, 
    analyzeAssetForDev, 
    brainstormGameMechanics,
    generateConceptFromRef
} from './services/geminiService';

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
        <span className="font-display font-medium tracking-wide text-sm">{label}</span>
    </button>
);

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-game-accent"></div>
);

// --- Modules ---

// 1. Logo Studio Module
const LogoStudio = () => {
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
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-4 flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Logo Forge</h2>
                    <p className="text-gray-400 text-sm">Create professional branding assets using high-fidelity models.</p>
                </div>
                
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand Concept</label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A cybernetic wolf head, aggressive, neon blue accents"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent focus:ring-1 focus:ring-game-accent outline-none transition-all h-32 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Art Direction</label>
                        <select 
                            value={style} 
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent outline-none"
                        >
                            <option value="Vector Minimalist">Vector Minimalist (App Icon)</option>
                            <option value="Esports Mascot">Esports Mascot (Bold, Outline)</option>
                            <option value="3D Rendered Glossy">3D Rendered (Glossy, Mobile)</option>
                            <option value="Pixel Art 16-bit">Pixel Art (Retro)</option>
                            <option value="Corporate Geometric">Corporate Geometric</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg font-display font-bold text-white shadow-lg shadow-indigo-900/20 hover:shadow-indigo-600/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Forging Asset...' : 'GENERATE LOGO'}
                    </button>
                </div>
            </div>

            <div className="lg:col-span-8 bg-game-panel rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                {result ? (
                    <div className="relative z-10 text-center">
                         <img src={result} alt="Generated Logo" className="max-w-md max-h-[600px] rounded-xl shadow-2xl border border-gray-700" />
                         <a href={result} download={`logo-${Date.now()}.png`} className="inline-block mt-6 text-sm text-game-accent hover:text-white transition-colors font-bold cursor-pointer">DOWNLOAD ASSET</a>
                    </div>
                ) : (
                    <div className="text-center z-10 opacity-30">
                        <div className="text-6xl mb-4">⚜️</div>
                        <p className="font-display text-xl">Awaiting Input</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 2. Environment & Banner Studio
const EnvironmentStudio = () => {
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
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-4 flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">World Builder</h2>
                    <p className="text-gray-400 text-sm">Generate promotional art, loading screens, and backgrounds.</p>
                </div>
                
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scene Description</label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A ruined cyberpunk city at sunset, rain slicked streets, neon reflections"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent focus:ring-1 focus:ring-game-accent outline-none transition-all h-32 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rendering Engine</label>
                        <select 
                            value={style} 
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent outline-none"
                        >
                            <option value="Unreal Engine 5 Realistic">Unreal Engine 5 (Photoreal)</option>
                            <option value="Digital Painting Fantasy">Digital Painting (Fantasy)</option>
                            <option value="Sci-Fi Concept Art">Sci-Fi Concept Art (Matte Paint)</option>
                            <option value="Anime Cel Shaded">Anime (Cel Shaded)</option>
                            <option value="Low Poly Isometric">Low Poly (Isometric)</option>
                        </select>
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['16:9', '9:16', '4:3'].map(r => (
                                <button 
                                    key={r}
                                    onClick={() => setAspect(r)}
                                    className={`py-2 text-sm rounded border ${aspect === r ? 'bg-game-accent border-game-accent text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg font-display font-bold text-white shadow-lg shadow-emerald-900/20 hover:shadow-emerald-600/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Rendering World...' : 'GENERATE ENVIRONMENT'}
                    </button>
                </div>
            </div>

            <div className="lg:col-span-8 bg-game-panel rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden p-4">
                {result ? (
                    <div className="relative z-10 text-center w-full h-full flex flex-col items-center justify-center">
                         <img src={result} alt="Generated Env" className="max-w-full max-h-full object-contain rounded shadow-2xl border border-gray-700" />
                         <a href={result} download={`environment-${Date.now()}.jpg`} className="inline-block mt-4 text-sm text-game-accent hover:text-white transition-colors font-bold cursor-pointer">DOWNLOAD HIGH RES</a>
                    </div>
                ) : (
                    <div className="text-center z-10 opacity-30">
                        <div className="text-6xl mb-4">🏔️</div>
                        <p className="font-display text-xl">Viewport Empty</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Texture Forge
const TextureForge = () => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            const url = await generateProfessionalAsset(prompt, 'texture', 'PBR Material', '1:1');
            setResult(url);
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-4 flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Texture Forge</h2>
                    <p className="text-gray-400 text-sm">Generate seamless, tileable PBR-ready textures.</p>
                </div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Material Description</label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Ancient mossy stone wall, cracked, wet surface"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent focus:ring-1 focus:ring-game-accent outline-none transition-all h-32 resize-none"
                        />
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg font-display font-bold text-white shadow-lg shadow-amber-900/20 hover:shadow-amber-600/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Forging Material...' : 'GENERATE TEXTURE'}
                    </button>
                </div>
            </div>
            <div className="lg:col-span-8 bg-game-panel rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
                 {result ? (
                    <div className="relative z-10 text-center w-full h-full p-8">
                         <div 
                            className="w-full h-full rounded shadow-2xl border border-gray-700"
                            style={{
                                backgroundImage: `url(${result})`,
                                backgroundSize: '256px'
                            }}
                         ></div>
                         <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                            <span className="bg-black/70 px-4 py-1 rounded text-xs text-white">Preview (Tiled)</span>
                         </div>
                         <a href={result} download={`texture-${Date.now()}.jpg`} className="absolute bottom-4 right-4 pointer-events-auto bg-game-accent px-4 py-2 rounded text-sm text-white font-bold hover:bg-white hover:text-game-accent transition-colors">SAVE TEXTURE</a>
                    </div>
                ) : (
                    <div className="text-center z-10 opacity-30">
                        <div className="text-6xl mb-4">🧱</div>
                        <p className="font-display text-xl">Material Slot Empty</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// 4. Asset Editor (Canvas Logic)
const AssetEditor = () => {
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [brushSize, setBrushSize] = useState(30);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            
            // Auto Analyze
            analyzeAssetForDev(file).then(setAnalysis);
        }
    };

    // Canvas Drawing Logic
    useEffect(() => {
        if (!canvasRef.current || !previewUrl) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = previewUrl;
        img.onload = () => {
            canvas.width = canvas.parentElement?.clientWidth || 500;
            canvas.height = (img.height / img.width) * canvas.width;
        };
    }, [previewUrl]);

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    };

    const getMask = async (): Promise<File | null> => {
        if (!canvasRef.current) return null;
        // Create a black/white mask from the canvas
        const offscreen = document.createElement('canvas');
        offscreen.width = canvasRef.current.width;
        offscreen.height = canvasRef.current.height;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        // Draw black background
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        
        // Draw current canvas content as white
        ctx.drawImage(canvasRef.current, 0, 0);
        const imageData = ctx.getImageData(0,0, offscreen.width, offscreen.height);
        const data = imageData.data;
        // Check if anything is drawn (simple check for non-black pixels)
        let hasMask = false;
        for(let i=0; i<data.length; i+=4) {
            // If pixel has alpha/color (our brush is pink rgba(255, 0, 255, 0.5))
            // We want to turn it WHITE for the mask
            if (data[i] > 50) { // R channel check
                data[i] = 255;
                data[i+1] = 255;
                data[i+2] = 255;
                data[i+3] = 255;
                hasMask = true;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        
        if (!hasMask) return null;

        return new Promise(resolve => {
            offscreen.toBlob(blob => {
                resolve(blob ? new File([blob], 'mask.png', { type: 'image/png' }) : null);
            });
        });
    };

    const handleEdit = async () => {
        if (!image || !prompt) return;
        setLoading(true);
        try {
            const mask = await getMask();
            const newUrl = await editGameAsset(image, mask, prompt);
            // Update preview to new image, clear mask
            setPreviewUrl(newUrl);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            ctx?.clearRect(0,0, canvas!.width, canvas!.height);
            
            // Convert base64 to file for next edit
            const res = await fetch(newUrl);
            const blob = await res.blob();
            setImage(new File([blob], "edited.png", { type: "image/png" }));

        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-8 bg-game-panel rounded-2xl border border-gray-800 p-6 flex flex-col relative">
                 {!previewUrl ? (
                     <div 
                        className="flex-1 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-game-accent transition-colors"
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                         <input type="file" id="file-upload" className="hidden" onChange={handleUpload} />
                         <div className="text-5xl mb-4">📤</div>
                         <p className="font-display text-xl text-gray-400">Drop Asset Here or Click to Upload</p>
                     </div>
                 ) : (
                     <div className="flex-1 relative flex items-center justify-center bg-black/50 rounded-xl overflow-hidden">
                         <img src={previewUrl} className="absolute max-w-full max-h-full pointer-events-none select-none opacity-60" alt="Base" />
                         <img src={previewUrl} className="relative max-w-full max-h-full pointer-events-none select-none z-0" alt="Reference" />
                         <canvas 
                            ref={canvasRef}
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-crosshair touch-none"
                            onMouseDown={(e) => { setIsDrawing(true); draw(e); }}
                            onMouseMove={draw}
                            onMouseUp={() => setIsDrawing(false)}
                            onMouseLeave={() => setIsDrawing(false)}
                         />
                     </div>
                 )}
                 {previewUrl && (
                     <div className="mt-4 flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                         <div className="flex items-center gap-4">
                             <span className="text-xs uppercase font-bold text-gray-500">Brush Size</span>
                             <input 
                                type="range" 
                                min="5" max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-32 accent-game-accent"
                             />
                         </div>
                         <button 
                            onClick={() => {
                                const ctx = canvasRef.current?.getContext('2d');
                                ctx?.clearRect(0,0, canvasRef.current!.width, canvasRef.current!.height);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 font-bold"
                        >
                             CLEAR MASK
                         </button>
                     </div>
                 )}
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Asset Editor</h2>
                    <p className="text-gray-400 text-sm">Inpaint, edit, and analyze existing assets.</p>
                </div>

                {analysis && (
                    <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-lg text-sm">
                        <h3 className="font-bold text-game-accent mb-2">AI Analysis</h3>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-black/40 p-2 rounded">
                                <span className="block text-xs text-gray-500">Style</span>
                                {analysis.style}
                            </div>
                            <div className="bg-black/40 p-2 rounded">
                                <span className="block text-xs text-gray-500">Mood</span>
                                {analysis.mood}
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs italic">{analysis.technicalNotes}</p>
                    </div>
                )}

                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Edit Instruction</label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Make the eyes glow red, add a scar"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent focus:ring-1 focus:ring-game-accent outline-none transition-all h-32 resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tip: Paint over the area you want to change.</p>
                    </div>

                    <button 
                        onClick={handleEdit}
                        disabled={loading || !image}
                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-lg font-display font-bold text-white shadow-lg shadow-pink-900/20 hover:shadow-pink-600/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing Edit...' : 'APPLY CHANGES'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// 5. Ideation & Mechanics
const IdeationStudio = () => {
    const [concept, setConcept] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBrainstorm = async () => {
        if(!concept) return;
        setLoading(true);
        try {
            const text = await brainstormGameMechanics(concept);
            setResult(text);
        } catch(e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
             <div className="lg:col-span-4 flex flex-col gap-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Game Brain</h2>
                    <p className="text-gray-400 text-sm">Turn loose concepts into solid game mechanics using AI reasoning.</p>
                </div>
                <div className="space-y-4 bg-game-panel p-6 rounded-2xl border border-gray-800">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Core Concept</label>
                        <textarea 
                            value={concept}
                            onChange={(e) => setConcept(e.target.value)}
                            placeholder="e.g., A racing game where you drive backwards in time"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-game-accent focus:ring-1 focus:ring-game-accent outline-none transition-all h-32 resize-none"
                        />
                    </div>
                    <button 
                        onClick={handleBrainstorm}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-display font-bold text-white shadow-lg shadow-cyan-900/20 hover:shadow-cyan-600/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Thinking...' : 'BRAINSTORM MECHANICS'}
                    </button>
                </div>
             </div>
             <div className="lg:col-span-8 bg-game-panel rounded-2xl border border-gray-800 p-8 overflow-y-auto">
                 {loading ? (
                     <div className="flex items-center justify-center h-full">
                         <Spinner />
                     </div>
                 ) : result ? (
                     <div className="prose prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{__html: result.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong class="text-game-accent">$1</strong>')}} />
                     </div>
                 ) : (
                     <div className="flex items-center justify-center h-full opacity-30 flex-col">
                         <div className="text-6xl mb-4">💡</div>
                         <p className="font-display text-xl">Ready for Ideas</p>
                     </div>
                 )}
             </div>
        </div>
    )
}


// --- Main Layout ---

const App: React.FC = () => {
    const [activeModule, setActiveModule] = useState<'logo' | 'environment' | 'texture' | 'editor' | 'ideation'>('logo');

    return (
        <div className="flex h-screen bg-game-dark font-sans text-gray-200 selection:bg-game-accent selection:text-white">
            {/* Sidebar */}
            <aside className="w-64 bg-game-panel border-r border-gray-800 flex flex-col p-4 z-20">
                <div className="mb-10 px-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-game-accent to-purple-600 rounded-lg flex items-center justify-center text-white font-bold font-display">G</div>
                    <h1 className="text-xl font-display font-bold text-white tracking-wider">GEMINI<span className="text-game-accent">STUDIO</span></h1>
                </div>

                <nav className="space-y-2 flex-1">
                    <SidebarItem 
                        icon="⚜️" label="Logo Forge" 
                        active={activeModule === 'logo'} 
                        onClick={() => setActiveModule('logo')} 
                    />
                    <SidebarItem 
                        icon="🏔️" label="World Builder" 
                        active={activeModule === 'environment'} 
                        onClick={() => setActiveModule('environment')} 
                    />
                    <SidebarItem 
                        icon="🧱" label="Texture Forge" 
                        active={activeModule === 'texture'} 
                        onClick={() => setActiveModule('texture')} 
                    />
                    <SidebarItem 
                        icon="🎨" label="Asset Editor" 
                        active={activeModule === 'editor'} 
                        onClick={() => setActiveModule('editor')} 
                    />
                    <SidebarItem 
                        icon="💡" label="Game Brain" 
                        active={activeModule === 'ideation'} 
                        onClick={() => setActiveModule('ideation')} 
                    />
                </nav>

                <div className="mt-auto px-4 py-4 bg-gray-900/50 rounded-xl border border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">AI Models Active</p>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-gray-300">Gemini 3.0 Pro</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-gray-300">Imagen 4.0</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noisy-grid.png')] opacity-5 pointer-events-none z-0"></div>
                
                {/* Content Area */}
                <div className="relative z-10 h-full p-8 overflow-y-auto">
                    {activeModule === 'logo' && <LogoStudio />}
                    {activeModule === 'environment' && <EnvironmentStudio />}
                    {activeModule === 'texture' && <TextureForge />}
                    {activeModule === 'editor' && <AssetEditor />}
                    {activeModule === 'ideation' && <IdeationStudio />}
                </div>
            </main>
        </div>
    );
};

export default App;
