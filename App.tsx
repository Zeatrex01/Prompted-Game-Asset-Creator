import React, { useState, useCallback, useRef, useEffect } from 'react';
import { editImageWithPrompt, analyzeImage, getQuickResponse, generateTexture, generateLogoConcepts, generateBanners, extractTexturesFromImage, generateSceneIdeas } from './services/geminiService';

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center rounded-lg z-10">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-fuchsia-500"></div>
    </div>
);

type Mode = 'editor' | 'texture' | 'logo' | 'banner' | 'inspiration';
type IdeaType = 'Game Concept' | 'Character Idea' | 'Quest/Mission Idea' | 'Item/Weapon Idea' | 'Location/Environment Idea';

const App: React.FC = () => {
    const [mode, setMode] = useState<Mode>('editor');

    const [originalImage, setOriginalImage] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [textureImageUrl, setTextureImageUrl] = useState<string | null>(null);

    const [editPrompt, setEditPrompt] = useState<string>('');
    const [ideaPrompt, setIdeaPrompt] = useState<string>('');
    const [texturePrompt, setTexturePrompt] = useState<string>('');
    
    // Logo state
    const [logoPrompt, setLogoPrompt] = useState('');
    const [logoStyle, setLogoStyle] = useState('Minimalist');
    const [logoColors, setLogoColors] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [logoReferenceImage, setLogoReferenceImage] = useState<File | null>(null);
    const [logoReferenceImageUrl, setLogoReferenceImageUrl] = useState<string | null>(null);
    const [logoTransparentBg, setLogoTransparentBg] = useState<boolean>(false);

    // Banner state
    const [bannerPrompt, setBannerPrompt] = useState('');
    const [bannerStyle, setBannerStyle] = useState('Cinematic');
    const [bannerAspectRatio, setBannerAspectRatio] = useState('16:9');
    const [bannerColors, setBannerColors] = useState('');
    const [bannerNegativePrompt, setBannerNegativePrompt] = useState('');
    const [bannerReferenceImage, setBannerReferenceImage] = useState<File | null>(null);
    const [bannerReferenceImageUrl, setBannerReferenceImageUrl] = useState<string | null>(null);
    const [bannerTextOverlay, setBannerTextOverlay] = useState('');


    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [ideaResult, setIdeaResult] = useState<string>('');
    const [generatedLogos, setGeneratedLogos] = useState<string[]>([]);
    const [generatedBanners, setGeneratedBanners] = useState<string[]>([]);
    const [textureHistory, setTextureHistory] = useState<{ imageUrl: string; prompt: string; }[]>([]);


    const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(false);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
    const [isLoadingIdea, setIsLoadingIdea] = useState<boolean>(false);
    const [isLoadingTexture, setIsLoadingTexture] = useState<boolean>(false);
    const [isLoadingLogos, setIsLoadingLogos] = useState<boolean>(false);
    const [isLoadingBanners, setIsLoadingBanners] = useState<boolean>(false);

    // Inspiration Tab State
    const [ideaType, setIdeaType] = useState<IdeaType>('Game Concept');
    const [isLoadingTextureExtraction, setIsLoadingTextureExtraction] = useState<boolean>(false);
    const [extractedTextures, setExtractedTextures] = useState<{name: string; description: string}[]>([]);
    const [generatingTextureIndex, setGeneratingTextureIndex] = useState<number | null>(null);
    const [generatedInspirationTextureUrl, setGeneratedInspirationTextureUrl] = useState<string | null>(null);
    const [isLoadingSceneIdeas, setIsLoadingSceneIdeas] = useState<boolean>(false);
    const [sceneIdeasResult, setSceneIdeasResult] = useState<string>('');

    const [error, setError] = useState<string | null>(null);

    // Brush tool state
    const [brushSize, setBrushSize] = useState(40);
    const [isErasing, setIsErasing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoReferenceFileInputRef = useRef<HTMLInputElement>(null);
    const bannerReferenceFileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

    const ideaPlaceholders: Record<IdeaType, string> = {
        'Game Concept': "e.g., 'An underwater city builder'",
        'Character Idea': "e.g., 'A rogue AI that pilots a mech'",
        'Quest/Mission Idea': "e.g., 'Retrieve a stolen star map from pirates'",
        'Item/Weapon Idea': "e.g., 'A cursed sword that whispers secrets'",
        'Location/Environment Idea': "e.g., 'A floating island made of crystal'",
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setOriginalImage(file);
            setOriginalImageUrl(URL.createObjectURL(file));
            setEditedImageUrl(null);
            setAnalysisResult('');
            setExtractedTextures([]);
            setGeneratedInspirationTextureUrl(null);
            setSceneIdeasResult('');
            setError(null);
            // Clear canvas when new image is uploaded
            setTimeout(clearCanvas, 100);
        }
    };
    
    const handleLogoReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setLogoReferenceImage(file);
            setLogoReferenceImageUrl(URL.createObjectURL(file));
        }
    };
    
    const handleBannerReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setBannerReferenceImage(file);
            setBannerReferenceImageUrl(URL.createObjectURL(file));
        }
    };

    const clearLogoReference = () => {
        setLogoReferenceImage(null);
        setLogoReferenceImageUrl(null);
        if(logoReferenceFileInputRef.current) {
            logoReferenceFileInputRef.current.value = '';
        }
    }
    
    const clearBannerReference = () => {
        setBannerReferenceImage(null);
        setBannerReferenceImageUrl(null);
        if(bannerReferenceFileInputRef.current) {
            bannerReferenceFileInputRef.current.value = '';
        }
    }


    const getMaskFile = async (): Promise<File | null> => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return null;
    
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
    
        const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        if (!pixelBuffer.some(color => color !== 0)) {
            return null; // Canvas is blank
        }
    
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return null;
    
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.drawImage(canvas, 0, 0);
    
        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) { // If pixel has any opacity
                data[i] = 255;     // R
                data[i + 1] = 255; // G
                data[i + 2] = 255; // B
                data[i + 3] = 255; // A (fully opaque)
            }
        }
        maskCtx.putImageData(imageData, 0, 0);
    
        return new Promise(resolve => {
            maskCanvas.toBlob(blob => {
                if (!blob) { resolve(null); return; }
                resolve(new File([blob], 'mask.png', { type: 'image/png' }));
            }, 'image/png');
        });
    };

    const handleEditImage = useCallback(async () => {
        if (!originalImage || !editPrompt) {
            setError("Please upload an image and enter an edit prompt.");
            return;
        }
        setIsLoadingEdit(true);
        setError(null);
        try {
            const maskFile = await getMaskFile();
            const resultUrl = await editImageWithPrompt(originalImage, maskFile, editPrompt);
            setEditedImageUrl(resultUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingEdit(false);
        }
    }, [originalImage, editPrompt]);

    const handleAnalyzeImage = useCallback(async () => {
        if (!originalImage) {
            setError("Please upload an image to analyze.");
            return;
        }
        setIsLoadingAnalysis(true);
        setError(null);
        try {
            const result = await analyzeImage(originalImage);
            setAnalysisResult(result);
        // Fix: Corrected syntax for catch block. The fat arrow `=>` is not valid here.
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingAnalysis(false);
        }
    }, [originalImage]);

    const handleGetIdea = useCallback(async () => {
        if (!ideaPrompt) {
            setError("Please enter a prompt to generate ideas.");
            return;
        }
        setIsLoadingIdea(true);
        setError(null);
        try {
            const result = await getQuickResponse(ideaPrompt, ideaType);
            setIdeaResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingIdea(false);
        }
    }, [ideaPrompt, ideaType]);

    const handleGenerateTexture = useCallback(async () => {
        if (!texturePrompt) {
            setError("Please enter a prompt to generate a texture.");
            return;
        }
        setIsLoadingTexture(true);
        setError(null);
        try {
            const resultUrl = await generateTexture(texturePrompt);
            setTextureImageUrl(resultUrl);
            setTextureHistory(prevHistory => [{ imageUrl: resultUrl, prompt: texturePrompt }, ...prevHistory]);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingTexture(false);
        }
    }, [texturePrompt]);

    const handleGenerateLogos = useCallback(async () => {
        if (!logoPrompt) {
            setError("Please enter a prompt for your logo.");
            return;
        }
        setIsLoadingLogos(true);
        setGeneratedLogos([]);
        setError(null);
        try {
            const resultUrls = await generateLogoConcepts(logoPrompt, logoStyle, logoColors, negativePrompt, logoReferenceImage, logoTransparentBg);
            setGeneratedLogos(resultUrls);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingLogos(false);
        }
    }, [logoPrompt, logoStyle, logoColors, negativePrompt, logoReferenceImage, logoTransparentBg]);
    
    const handleGenerateBanners = useCallback(async () => {
        if (!bannerPrompt) {
            setError("Please enter a prompt for your banner.");
            return;
        }
        setIsLoadingBanners(true);
        setGeneratedBanners([]);
        setError(null);
        try {
            const resultUrls = await generateBanners(bannerPrompt, bannerStyle, bannerAspectRatio, bannerColors, bannerNegativePrompt, bannerReferenceImage, bannerTextOverlay);
            setGeneratedBanners(resultUrls);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingBanners(false);
        }
    }, [bannerPrompt, bannerStyle, bannerAspectRatio, bannerColors, bannerNegativePrompt, bannerReferenceImage, bannerTextOverlay]);

    const handleExtractTextures = useCallback(async () => {
        if (!originalImage) {
            setError("Please upload an image first.");
            return;
        }
        setIsLoadingTextureExtraction(true);
        setExtractedTextures([]);
        setGeneratedInspirationTextureUrl(null);
        setSceneIdeasResult('');
        setError(null);
        try {
            const result = await extractTexturesFromImage(originalImage);
            setExtractedTextures(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingTextureExtraction(false);
        }
    }, [originalImage]);

    const handleGenerateInspirationTexture = useCallback(async (description: string, index: number) => {
        if (!description) {
            setError("Texture description is empty.");
            return;
        }
        setGeneratingTextureIndex(index);
        setGeneratedInspirationTextureUrl(null);
        setSceneIdeasResult('');
        setError(null);
        try {
            const resultUrl = await generateTexture(description);
            setGeneratedInspirationTextureUrl(resultUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setGeneratingTextureIndex(null);
        }
    }, []);

    const handleGenerateSceneIdeas = useCallback(async (textures: {name: string, description: string}[]) => {
        if (textures.length === 0) {
            setError("No textures available to generate scene ideas.");
            return;
        }
        setIsLoadingSceneIdeas(true);
        setSceneIdeasResult('');
        setError(null);
        try {
            const result = await generateSceneIdeas(textures);
            setSceneIdeasResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsLoadingSceneIdeas(false);
        }
    }, []);

    const handleSaveImage = (imageUrl: string, defaultName: string, format: 'png' | 'jpeg') => {
        if (!imageUrl) return;
    
        const fileName = `${defaultName.replace(/ /g, '_')}-${Date.now()}.${format}`;
    
        const link = document.createElement('a');
    
        const processAndDownload = (url: string) => {
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    
        if (format === 'jpeg' && imageUrl.startsWith('data:image/png')) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    const jpegUrl = canvas.toDataURL('image/jpeg', 0.9);
                    processAndDownload(jpegUrl);
                } else {
                    setError("Could not process image for saving. Canvas context unavailable.");
                }
            };
            img.onerror = () => {
                 setError("Could not load image for saving. The image data might be corrupted.");
            }
            img.src = imageUrl;
        } else {
            processAndDownload(imageUrl);
        }
    };
    
    const clearCanvas = () => {
        const canvas = maskCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    useEffect(() => {
        const image = imageRef.current;
        const canvas = maskCanvasRef.current;
        if (!image || !canvas) return;
    
        const resizeObserver = new ResizeObserver(() => {
            canvas.width = image.clientWidth;
            canvas.height = image.clientHeight;
        });
    
        resizeObserver.observe(image);
        return () => resizeObserver.disconnect();
    }, [originalImageUrl]);

    useEffect(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;

        const getCoords = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        };

        const startDrawing = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            isDrawingRef.current = true;
            lastPositionRef.current = getCoords(e);
        };

        const draw = (e: MouseEvent | TouchEvent) => {
            if (!isDrawingRef.current) return;
            e.preventDefault();
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const currentPosition = getCoords(e);
            
            ctx.beginPath();
            ctx.moveTo(lastPositionRef.current!.x, lastPositionRef.current!.y);
            ctx.lineTo(currentPosition.x, currentPosition.y);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = brushSize;
            
            if (isErasing) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            }
            ctx.stroke();

            lastPositionRef.current = currentPosition;
        };

        const stopDrawing = () => {
            isDrawingRef.current = false;
            lastPositionRef.current = null;
        };

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseout', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [brushSize, isErasing]);
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noisy-grid.png')] opacity-10 pointer-events-none"></div>
            
            <div className="container mx-auto p-4 md:p-8 relative z-10">
                <header className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400 tracking-wider">
                        Gemini Game Asset Creator
                    </h1>
                    <p className="text-gray-400 mt-2">Bring your game's vision to life with AI-powered creation and editing.</p>
                </header>

                {error && (
                    <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="mb-8 p-1.5 flex flex-wrap justify-center bg-gray-800/50 border border-gray-700 rounded-xl max-w-5xl mx-auto">
                    <button onClick={() => setMode('editor')} className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-lg transition-colors ${mode === 'editor' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        🎨 Asset Editor
                    </button>
                    <button onClick={() => setMode('logo')} className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-lg transition-colors ${mode === 'logo' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        ⚜️ Logo Creator
                    </button>
                    <button onClick={() => setMode('banner')} className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-lg transition-colors ${mode === 'banner' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        🖼️ Banner Creator
                    </button>
                    <button onClick={() => setMode('texture')} className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-lg transition-colors ${mode === 'texture' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        🧱 Texture Maker
                    </button>
                    <button onClick={() => setMode('inspiration')} className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-lg transition-colors ${mode === 'inspiration' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                        💡 Inspiration
                    </button>
                </div>


                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {mode === 'editor' && (
                        <>
                            <div className="flex flex-col gap-6 p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                <div>
                                    <label className="block text-lg font-semibold mb-2 text-fuchsia-400">1. Upload Your Base Image</label>
                                    <div 
                                        className="relative flex justify-center items-center w-full h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-fuchsia-500 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
                                        {originalImageUrl ? (
                                            <>
                                                <img ref={imageRef} src={originalImageUrl} alt="Original" className="w-full h-full object-contain rounded-lg" />
                                                <canvas ref={maskCanvasRef} className="absolute top-0 left-0 w-full h-full cursor-crosshair rounded-lg"></canvas>
                                            </>
                                        ) : (
                                            <div className="text-center text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                <p>Click to upload an image</p>
                                                <span className="text-xs">PNG, JPG, WEBP</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {originalImage && (
                                    <>
                                        <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg">
                                            <h3 className="text-md font-semibold text-fuchsia-400">Brush Masking Tools</h3>
                                            <div className="flex items-center gap-2 text-sm">
                                                <label htmlFor="brush-size" className="whitespace-nowrap">Size:</label>
                                                <input type="range" id="brush-size" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
                                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button onClick={() => setIsErasing(false)} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${!isErasing ? 'bg-fuchsia-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Brush</button>
                                                <button onClick={() => setIsErasing(true)} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${isErasing ? 'bg-fuchsia-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Eraser</button>
                                                <button onClick={clearCanvas} className="px-4 py-2 text-sm font-bold rounded-md bg-gray-700 hover:bg-red-500 transition-colors">Clear</button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label htmlFor="edit-prompt" className="block text-lg font-semibold mb-2 text-fuchsia-400">2. Edit with a Prompt</label>
                                            <textarea id="edit-prompt" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)}
                                                placeholder="e.g., 'Add a neon glow to the masked area'"
                                                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all text-gray-200 placeholder-gray-500"
                                                rows={3} />
                                            <button onClick={handleEditImage} disabled={isLoadingEdit}
                                                className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-lg hover:from-fuchsia-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isLoadingEdit ? 'Generating...' : '✨ Generate Edit'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="relative flex-1 p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm min-h-[300px]">
                                    <h2 className="text-xl font-semibold mb-4 text-fuchsia-400">Edited Image</h2>
                                    <div className="relative flex justify-center items-center w-full min-h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg">
                                        {isLoadingEdit && <LoadingSpinner />}
                                        {editedImageUrl ? (
                                            <img src={editedImageUrl} alt="Edited" className="w-full h-full object-contain rounded-lg" />
                                        ) : (
                                            <p className="text-gray-500">Your edited image will appear here</p>
                                        )}
                                    </div>
                                    {editedImageUrl && (
                                        <div className="flex gap-2 mt-4">
                                            <button onClick={() => handleSaveImage(editedImageUrl!, 'edited-asset', 'png')}
                                                className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all transform hover:scale-105">
                                                💾 Save as PNG
                                            </button>
                                            <button onClick={() => handleSaveImage(editedImageUrl!, 'edited-asset', 'jpeg')}
                                                className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-lg hover:from-teal-700 hover:to-green-700 transition-all transform hover:scale-105">
                                                💾 Save as JPG
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {mode === 'logo' && (
                        <div className="lg:col-span-2 flex flex-col gap-8">
                             <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                <h2 className="text-xl font-semibold mb-4 text-indigo-400">Logo Creator</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label htmlFor="logo-prompt" className="text-sm font-bold text-gray-400">Prompt</label>
                                        <textarea id="logo-prompt" value={logoPrompt} onChange={(e) => setLogoPrompt(e.target.value)}
                                            placeholder="e.g., 'A roaring cyber wolf'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-200 placeholder-gray-500"
                                            rows={2} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="logo-style" className="text-sm font-bold text-gray-400">Style</label>
                                        <select id="logo-style" value={logoStyle} onChange={(e) => setLogoStyle(e.target.value)} className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-200">
                                            <option>Minimalist</option>
                                            <option>Mascot</option>
                                            <option>Emblem</option>
                                            <option>Abstract</option>
                                            <option>Lettermark</option>
                                            <option>Wordmark</option>
                                            <option>Pictorial</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="logo-colors" className="text-sm font-bold text-gray-400">Colors (optional)</label>
                                        <input type="text" id="logo-colors" value={logoColors} onChange={(e) => setLogoColors(e.target.value)}
                                            placeholder="e.g., 'blue, gold, white'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-200 placeholder-gray-500"/>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="negative-prompt" className="text-sm font-bold text-gray-400">Negative Prompt (optional)</label>
                                         <input type="text" id="negative-prompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                                            placeholder="e.g., 'text, complex details'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-200 placeholder-gray-500"/>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-800 border border-gray-600 rounded-lg">
                                        <input type="checkbox" id="transparent-bg" checked={logoTransparentBg} onChange={(e) => setLogoTransparentBg(e.target.checked)}
                                            className="h-5 w-5 rounded bg-gray-700 border-gray-500 text-indigo-500 focus:ring-indigo-500" />
                                        <label htmlFor="transparent-bg" className="text-sm font-bold text-gray-300">Transparent Background</label>
                                    </div>
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label className="text-sm font-bold text-gray-400">Visual Example (optional)</label>
                                        <div 
                                            className="relative flex justify-center items-center w-full h-32 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors"
                                            onClick={() => logoReferenceFileInputRef.current?.click()}
                                        >
                                            <input type="file" accept="image/*" onChange={handleLogoReferenceUpload} ref={logoReferenceFileInputRef} className="hidden" />
                                            {logoReferenceImageUrl ? (
                                                <>
                                                    <img src={logoReferenceImageUrl} alt="Logo Reference" className="w-full h-full object-contain rounded-lg p-1" />
                                                    <button onClick={(e) => { e.stopPropagation(); clearLogoReference(); }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-700">&times;</button>
                                                </>
                                            ) : (
                                                <div className="text-center text-gray-500">
                                                    <p>Click to upload a reference</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateLogos}
                                    disabled={isLoadingLogos}
                                    className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingLogos ? 'Generating...' : '⚜️ Generate 4 Concepts'}
                                </button>
                            </div>
                            <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm min-h-[400px]">
                                 <h2 className="text-xl font-semibold mb-4 text-indigo-400">Generated Concepts</h2>
                                 <div className="relative">
                                    {isLoadingLogos && <LoadingSpinner />}
                                    {generatedLogos.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {generatedLogos.map((logoUrl, index) => (
                                                <div key={index} className="flex flex-col gap-2 p-2 bg-gray-800/50 rounded-lg">
                                                    <img src={logoUrl} alt={`Logo concept ${index + 1}`} className="w-full h-auto object-contain rounded-md aspect-square bg-cover" style={{backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%23333' stroke-width='2' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}/>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleSaveImage(logoUrl, `${logoPrompt.substring(0,20)}_${index+1}`, 'png')} className="w-full px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-md hover:bg-sky-700 transition-colors">
                                                            Save PNG
                                                        </button>
                                                        <button onClick={() => handleSaveImage(logoUrl, `${logoPrompt.substring(0,20)}_${index+1}`, 'jpeg')} className="w-full px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-md hover:bg-teal-700 transition-colors">
                                                            Save JPG
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                       <div className="flex justify-center items-center w-full h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg">
                                            <p className="text-gray-500 text-center">Your logo concepts will appear here</p>
                                       </div>
                                    )}
                                 </div>
                            </div>
                        </div>
                    )}

                    {mode === 'banner' && (
                        <div className="lg:col-span-2 flex flex-col gap-8">
                            <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                <h2 className="text-xl font-semibold mb-4 text-green-400">Banner Creator</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label htmlFor="banner-prompt" className="text-sm font-bold text-gray-400">Prompt</label>
                                        <textarea id="banner-prompt" value={bannerPrompt} onChange={(e) => setBannerPrompt(e.target.value)}
                                            placeholder="e.g., 'A cinematic splash screen for a fantasy game'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200 placeholder-gray-500"
                                            rows={2} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="banner-style" className="text-sm font-bold text-gray-400">Style</label>
                                        <select id="banner-style" value={bannerStyle} onChange={(e) => setBannerStyle(e.target.value)} className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200">
                                            <option>Cinematic</option>
                                            <option>Photorealistic</option>
                                            <option>Cartoon</option>
                                            <option>Pixel Art</option>
                                            <option>Watercolor</option>
                                            <option>Abstract</option>
                                        </select>
                                    </div>
                                     <div className="flex flex-col gap-2">
                                        <label htmlFor="banner-aspect" className="text-sm font-bold text-gray-400">Aspect Ratio</label>
                                        <select id="banner-aspect" value={bannerAspectRatio} onChange={(e) => setBannerAspectRatio(e.target.value)} className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200">
                                            <option>16:9</option>
                                            <option>9:16</option>
                                            <option>1:1</option>
                                            <option>4:1</option>
                                        </select>
                                    </div>
                                     <div className="flex flex-col gap-2">
                                        <label htmlFor="banner-text" className="text-sm font-bold text-gray-400">Text Overlay (optional)</label>
                                        <input type="text" id="banner-text" value={bannerTextOverlay} onChange={(e) => setBannerTextOverlay(e.target.value)}
                                            placeholder="e.g., 'Coming Soon'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200 placeholder-gray-500"/>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="banner-colors" className="text-sm font-bold text-gray-400">Colors (optional)</label>
                                        <input type="text" id="banner-colors" value={bannerColors} onChange={(e) => setBannerColors(e.target.value)}
                                            placeholder="e.g., 'deep blues, fiery orange'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200 placeholder-gray-500"/>
                                    </div>
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label htmlFor="banner-negative-prompt" className="text-sm font-bold text-gray-400">Negative Prompt (optional)</label>
                                         <input type="text" id="banner-negative-prompt" value={bannerNegativePrompt} onChange={(e) => setBannerNegativePrompt(e.target.value)}
                                            placeholder="e.g., 'blurry, low quality'"
                                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200 placeholder-gray-500"/>
                                    </div>
                                    <div className="flex flex-col gap-2 md:col-span-2">
                                        <label className="text-sm font-bold text-gray-400">Visual Example (optional)</label>
                                        <div 
                                            className="relative flex justify-center items-center w-full h-32 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-green-500 transition-colors"
                                            onClick={() => bannerReferenceFileInputRef.current?.click()}
                                        >
                                            <input type="file" accept="image/*" onChange={handleBannerReferenceUpload} ref={bannerReferenceFileInputRef} className="hidden" />
                                            {bannerReferenceImageUrl ? (
                                                <>
                                                    <img src={bannerReferenceImageUrl} alt="Banner Reference" className="w-full h-full object-contain rounded-lg p-1" />
                                                    <button onClick={(e) => { e.stopPropagation(); clearBannerReference(); }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-red-700">&times;</button>
                                                </>
                                            ) : (
                                                <div className="text-center text-gray-500">
                                                    <p>Click to upload a reference</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateBanners}
                                    disabled={isLoadingBanners}
                                    className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingBanners ? 'Generating...' : '🖼️ Generate 2 Concepts'}
                                </button>
                            </div>
                            <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm min-h-[400px]">
                                 <h2 className="text-xl font-semibold mb-4 text-green-400">Generated Concepts</h2>
                                 <div className="relative">
                                    {isLoadingBanners && <LoadingSpinner />}
                                    {generatedBanners.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {generatedBanners.map((bannerUrl, index) => (
                                                <div key={index} className="flex flex-col gap-2 p-2 bg-gray-800/50 rounded-lg">
                                                    <img src={bannerUrl} alt={`Banner concept ${index + 1}`} className="w-full h-auto object-contain rounded-md bg-cover" style={{backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%23333' stroke-width='2' stroke-dasharray='6%2c 14' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}/>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleSaveImage(bannerUrl, `${bannerPrompt.substring(0,20)}_${index+1}`, 'png')} className="w-full px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-md hover:bg-sky-700 transition-colors">
                                                            Save PNG
                                                        </button>
                                                        <button onClick={() => handleSaveImage(bannerUrl, `${bannerPrompt.substring(0,20)}_${index+1}`, 'jpeg')} className="w-full px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-md hover:bg-teal-700 transition-colors">
                                                            Save JPG
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                       <div className="flex justify-center items-center w-full h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg">
                                            <p className="text-gray-500 text-center">Your banner concepts will appear here</p>
                                       </div>
                                    )}
                                 </div>
                            </div>
                        </div>
                    )}

                    {mode === 'texture' && (
                        <div className="lg:col-span-2 flex flex-col gap-8">
                            <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                <h2 className="text-xl font-semibold mb-4 text-amber-400">Game Texture Creator</h2>
                                <p className="text-gray-400 mb-4 text-sm">Describe the seamless, tileable texture you want to create. Be descriptive for the best results!</p>
                                <textarea
                                    value={texturePrompt}
                                    onChange={(e) => setTexturePrompt(e.target.value)}
                                    placeholder="e.g., 'Stylized medieval cobblestone, mossy, PBR-ready'"
                                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-gray-200 placeholder-gray-500"
                                    rows={3}
                                />
                                <button
                                    onClick={handleGenerateTexture}
                                    disabled={isLoadingTexture}
                                    className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingTexture ? 'Generating...' : '🧱 Generate Texture'}
                                </button>
                            </div>

                            <div className="relative flex-1 p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm min-h-[300px]">
                                <h2 className="text-xl font-semibold mb-4 text-amber-400">Generated Texture</h2>
                                <div className="relative flex justify-center items-center w-full min-h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg">
                                    {isLoadingTexture && <LoadingSpinner />}
                                    {textureImageUrl ? (
                                        <div style={{ backgroundImage: `url(${textureImageUrl})`, backgroundSize: '256px 256px' }} className="absolute inset-0 rounded-lg">
                                            <img src={textureImageUrl} alt="Generated Texture" className="w-full h-full object-contain rounded-lg backdrop-blur-sm bg-black/50" />
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">Your generated texture will appear here</p>
                                    )}
                                </div>
                                {textureImageUrl && (
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => handleSaveImage(textureImageUrl!, 'game-texture', 'png')} className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all transform hover:scale-105">
                                            💾 Save as PNG
                                        </button>
                                        <button onClick={() => handleSaveImage(textureImageUrl!, 'game-texture', 'jpeg')} className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-lg hover:from-teal-700 hover:to-green-700 transition-all transform hover:scale-105">
                                            💾 Save as JPG
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {textureHistory.length > 0 && (
                                <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                    <h2 className="text-xl font-semibold mb-4 text-amber-400">Generation History</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                                        {textureHistory.map((item, index) => (
                                            <div key={index} className="flex flex-col gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                                <img src={item.imageUrl} alt={`History item ${index + 1}`} className="w-full h-32 object-cover rounded-md" />
                                                <p className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded-md font-mono h-20 overflow-y-auto">{item.prompt}</p>
                                                <button onClick={() => setTexturePrompt(item.prompt)} className="w-full px-3 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-md hover:bg-sky-700 transition-colors">
                                                    Reuse Prompt
                                                </button>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSaveImage(item.imageUrl, 'history-texture', 'png')} className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors">
                                                        Save PNG
                                                    </button>
                                                    <button onClick={() => handleSaveImage(item.imageUrl, 'history-texture', 'jpeg')} className="w-full px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-md hover:bg-teal-700 transition-colors">
                                                        Save JPG
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {mode === 'inspiration' && (
                         <div className="lg:col-span-2 flex flex-col gap-8">
                             {originalImage && (
                                <>
                                <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                    <h2 className="text-xl font-semibold mb-4 text-cyan-400">Analyze Image</h2>
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <img src={originalImageUrl!} alt="Original for analysis" className="w-full md:w-48 h-auto object-contain rounded-lg border border-gray-700"/>
                                        <div className='flex-1'>
                                            <button onClick={handleAnalyzeImage} disabled={isLoadingAnalysis}
                                                className="w-full mb-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-sky-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isLoadingAnalysis ? 'Analyzing...' : '🧠 Analyze Style & Mood'}
                                            </button>
                                            <div className="relative w-full h-full bg-gray-800/50 rounded-lg p-4 overflow-y-auto min-h-[100px] max-h-48">
                                                {isLoadingAnalysis && <LoadingSpinner />}
                                                {analysisResult ? (
                                                    <p className="text-gray-300 whitespace-pre-wrap">{analysisResult}</p>
                                                ) : (
                                                    <p className="text-gray-500">Analysis results will appear here</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                    <h2 className="text-xl font-semibold mb-4 text-cyan-400">Texture Extractor</h2>
                                    <p className="text-gray-400 mb-4 text-sm">Identify and recreate textures from your uploaded image.</p>
                                    <button 
                                        onClick={handleExtractTextures} 
                                        disabled={isLoadingTextureExtraction}
                                        className="w-full mb-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-sky-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isLoadingTextureExtraction ? 'Extracting...' : '🔬 Extract Textures from Image'}
                                    </button>
                                    <div className="relative">
                                        {isLoadingTextureExtraction && <LoadingSpinner />}
                                        {extractedTextures.length > 0 && (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {extractedTextures.map((texture, index) => (
                                                        <div key={index} className="flex flex-col justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                                            <div>
                                                                <h3 className="font-bold text-cyan-300">{texture.name}</h3>
                                                                <p className="text-sm text-gray-400 mt-1">{texture.description}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleGenerateInspirationTexture(texture.description, index)}
                                                                disabled={generatingTextureIndex !== null}
                                                                className="w-full mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {(generatingTextureIndex === index) ? 'Generating...' : 'Generate Tileable Texture'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => handleGenerateSceneIdeas(extractedTextures)} 
                                                    disabled={isLoadingSceneIdeas}
                                                    className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                                    {isLoadingSceneIdeas ? 'Thinking...' : '💡 Generate Scene Ideas'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                </>
                             )}

                            {(generatingTextureIndex !== null || generatedInspirationTextureUrl) && (
                                <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                    <h2 className="text-xl font-semibold mb-4 text-teal-400">Generated Texture</h2>
                                    <div className="relative flex justify-center items-center w-full min-h-64 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg overflow-hidden">
                                        {generatingTextureIndex !== null && <LoadingSpinner />}
                                        {generatedInspirationTextureUrl && (
                                            <div style={{ backgroundImage: `url(${generatedInspirationTextureUrl})`, backgroundSize: '128px 128px' }} className="absolute inset-0"></div>
                                        )}
                                        {generatedInspirationTextureUrl ? (
                                            <img src={generatedInspirationTextureUrl} alt="Generated Texture from inspiration" className="relative w-64 h-64 object-cover rounded-lg shadow-2xl border-2 border-gray-500" />
                                        ) : (
                                            generatingTextureIndex === null && <p className="text-gray-500">Your generated texture will appear here</p>
                                        )}
                                    </div>
                                    {generatedInspirationTextureUrl && (
                                        <>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => handleSaveImage(generatedInspirationTextureUrl!, 'inspired-texture', 'png')} className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all transform hover:scale-105">
                                                    💾 Save as PNG
                                                </button>
                                                <button onClick={() => handleSaveImage(generatedInspirationTextureUrl!, 'inspired-texture', 'jpeg')} className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white font-bold rounded-lg hover:from-teal-700 hover:to-green-700 transition-all transform hover:scale-105">
                                                    💾 Save as JPG
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => handleGenerateSceneIdeas([{ name: 'Generated Texture', description: 'The user-generated texture' }])} 
                                                disabled={isLoadingSceneIdeas}
                                                className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold rounded-lg hover:from-sky-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isLoadingSceneIdeas ? 'Thinking...' : '💡 Generate Scene Ideas'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {(isLoadingSceneIdeas || sceneIdeasResult) && (
                                <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                    <h2 className="text-xl font-semibold mb-4 text-sky-400">Scene & Environment Concepts</h2>
                                    <div className="relative w-full bg-gray-800/50 rounded-lg p-4 overflow-y-auto min-h-[150px] max-h-96">
                                        {isLoadingSceneIdeas && <LoadingSpinner />}
                                        {sceneIdeasResult ? (
                                            <p className="text-gray-300 whitespace-pre-wrap">{sceneIdeasResult}</p>
                                        ) : (
                                            !isLoadingSceneIdeas && <p className="text-gray-500">Scene ideas will appear here</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="relative p-6 bg-gray-900/50 border border-gray-700 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm">
                                <h2 className="text-xl font-semibold mb-4 text-teal-400">Idea Generator</h2>
                                <div className="flex flex-col md:flex-row gap-2 mb-2">
                                    <select value={ideaType} onChange={(e) => setIdeaType(e.target.value as IdeaType)} className="md:w-1/3 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-200">
                                        <option>Game Concept</option>
                                        <option>Character Idea</option>
                                        <option>Quest/Mission Idea</option>
                                        <option>Item/Weapon Idea</option>
                                        <option>Location/Environment Idea</option>
                                    </select>
                                    <textarea id="idea-prompt" value={ideaPrompt} onChange={(e) => setIdeaPrompt(e.target.value)}
                                        placeholder={ideaPlaceholders[ideaType]}
                                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-200 placeholder-gray-500"
                                        rows={2}/>
                                </div>
                                 <button onClick={handleGetIdea} disabled={isLoadingIdea}
                                    className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-lg hover:from-teal-700 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoadingIdea ? 'Thinking...' : '💡 Generate Idea'}
                                </button>
                                 <div className="relative w-full bg-gray-800/50 rounded-lg p-4 overflow-y-auto min-h-[150px] max-h-56 mt-4">
                                    {isLoadingIdea && <LoadingSpinner />}
                                    {ideaResult ? (
                                        <p className="text-gray-300 whitespace-pre-wrap">{ideaResult}</p>
                                    ) : (
                                        <p className="text-gray-500">Creative concepts will appear here</p>
                                    )}
                                 </div>
                                  {!originalImage && (
                                    <div className="text-center text-gray-500 p-8 mt-4 bg-gray-800/30 rounded-lg">
                                        <p>Upload an image in the <span className='font-bold text-fuchsia-400'>Asset Editor</span> tab to use the analysis and texture extraction tools.</p>
                                    </div>
                                )}
                            </div>
                         </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
