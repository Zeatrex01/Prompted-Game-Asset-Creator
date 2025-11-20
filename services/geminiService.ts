import { GoogleGenAI, Modality, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Utilities ---

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// --- The "Art Director" Agent ---
const enhancePrompt = async (userPrompt: string, context: string, specificDetails: string): Promise<string> => {
    const systemPrompt = `
    You are an expert Lead Game Artist and Technical Artist. 
    Your task is to take a basic user concept and rewrite it into a highly detailed, professional image generation prompt suitable for high-end AI models (like Imagen 4).
    
    Context: ${context}
    User Concept: "${userPrompt}"
    Specific Constraints: ${specificDetails}
    
    Rules:
    1. Describe lighting, composition, material properties (PBR), and rendering style (e.g., "Unreal Engine 5", "Vector", "Hand-painted").
    2. Ensure the output is a single, coherent paragraph.
    3. Do NOT add conversational text. Output ONLY the prompt.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: systemPrompt,
        config: {
            thinkingConfig: { thinkingBudget: 2048 }, 
        }
    });

    return response.text || userPrompt;
};

// --- Image Generation Services ---

export const generateProfessionalAsset = async (
    userPrompt: string, 
    assetType: 'logo' | 'banner' | 'texture' | 'ui' | 'cookie' | 'noise' | 'ui-visual',
    styleProfile: string,
    aspectRatio: string = '1:1'
): Promise<string> => {
    
    let specificConstraints = `Ensure the asset is high-resolution.`;
    
    if (assetType === 'logo') specificConstraints += " Vector style, clean lines, iconic.";
    if (assetType === 'texture') specificConstraints += " Seamless, tileable, PBR material, flat lighting.";
    if (assetType === 'banner') specificConstraints += " Cinematic, atmospheric, highly detailed environment.";
    if (assetType === 'ui') specificConstraints += " Isolatable elements on plain background, user interface design.";
    if (assetType === 'noise') specificConstraints += " Grayscale heightmap, high contrast, mathematical procedural pattern, flat lighting, no shading, 4k resolution. Suitable for VFX shaders.";
    if (assetType === 'cookie') specificConstraints += " High contrast Black and White only (Gobo). Pure black background (blocks light), White shapes (allows light). Sharp defined edges for shadow projection. No greyscale unless specified for softness.";
    
    // New Visual-Only UI Constraint
    if (assetType === 'ui-visual') {
        specificConstraints += " STRICTLY NO TEXT. NO NUMBERS. NO ALPHABET. Purely graphical game asset. High fidelity rendering. Isolated on a solid plain background (easy to mask). Focus on material, shape, and lighting. Iconography or abstract UI shapes only.";
    }

    const enhancedPrompt = await enhancePrompt(
        userPrompt,
        `Generating a professional ${assetType} for a video game. Style goal: ${styleProfile}.`,
        specificConstraints
    );

    console.log(`[Art Director] Enhanced Prompt: ${enhancedPrompt}`);

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio as any,
            outputMimeType: 'image/jpeg'
        }
    });

    const image = response.generatedImages?.[0]?.image;
    if (image && image.imageBytes) {
        return `data:image/jpeg;base64,${image.imageBytes}`;
    }

    throw new Error("Failed to generate professional asset.");
};

// --- Texture Extraction & Seamless Tiling ---

export const extractTextureFromImage = async (referenceImage: File, makeSeamless: boolean = false): Promise<{ textureUrl: string, materialAnalysis: string }> => {
    // 1. Analyze the surface properties using Vision
    const imagePart = await fileToGenerativePart(referenceImage);
    
    let analysisPrompt = `
    Analyze this image for game texture usage. 
    Describe the surface material in technical detail (Albedo, Roughness, Normal details).
    Focus on the pattern, material age, and surface imperfections.
    `;
    
    if (makeSeamless) {
        analysisPrompt += " Explicitly describe how to make this pattern seamless and tileable, removing any vignetting or uneven lighting.";
    }

    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: analysisPrompt }] },
    });

    const materialDescription = analysisResponse.text || "A detailed game texture";

    // 2. Re-synthesize using Imagen
    const textureUrl = await generateProfessionalAsset(
        materialDescription,
        'texture',
        makeSeamless ? 'Seamless Tiled PBR Material' : 'Photorealistic PBR',
        '1:1'
    );

    return { textureUrl, materialAnalysis: materialDescription };
};

// --- Inspector: Engine-Specific Analysis & Remastering ---

export interface AnalysisReport {
    critique: string;
    technicalIssues: string[];
    engineSuggestions: string;
    remasterPrompt: string;
}

export const analyzeForEngine = async (image: File, engine: string): Promise<AnalysisReport> => {
    const imagePart = await fileToGenerativePart(image);
    
    const prompt = `
    Act as a Senior Technical Artist specializing in ${engine}.
    Analyze this game asset.
    
    1. Critique: Evaluate the visual quality, style consistency, and suitability for ${engine}.
    2. Technical Issues: List specific flaws (e.g., "Low texel density", "Baked-in lighting shadows", "Noisy normals", "Bad composition").
    3. Improvements: Suggest specific changes to meet ${engine} "AAA" standards.
    4. Remaster Prompt: Write a highly detailed image generation prompt to recreate this asset with all the suggested improvements applied.
    
    Output Format: JSON with keys: "critique", "technicalIssues" (array of strings), "engineSuggestions", "remasterPrompt".
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 4096 }
        }
    });

    try {
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse JSON", response.text);
        throw new Error("Analysis failed to produce valid report.");
    }
};

// --- UI/GUI Studio Services (Visual Only Redesign) ---

export const extractVisualStyle = async (referenceImage: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(referenceImage);
    const prompt = `
    Analyze the visual art style of this image to create a "Visual Style Clone" description.
    
    IGNORE all text, numbers, fonts, and labels. Pretend they do not exist.
    
    Focus ONLY on:
    - Rendering technique (e.g., flat vector, 3D glossy, hand-painted, pixel art, holographic).
    - Material properties (e.g., brushed metal, glass, neon light, stone, wood).
    - Lighting and effects (e.g., bloom, rim lighting, soft shadows).
    - Shape language (e.g., rounded corners, sharp angular spikes, intricate filigree).
    - Color palette.
    
    Summarize this into a single, dense visual description paragraph that can be used to generate NEW objects in this EXACT style.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
    });

    return response.text || "High quality game art style.";
};

export const generateVisualElement = async (styleGuide: string, itemDescription: string): Promise<string> => {
    const prompt = `
    Create a Game UI Visual Asset: ${itemDescription}.
    
    Target Visual Style:
    ${styleGuide}
    
    CRITICAL CONSTRAINTS:
    - ABSOLUTELY NO TEXT. NO NUMBERS. NO LETTERS. NO SYMBOLS.
    - The image must be PURELY graphical/pictorial.
    - If the request implies a button or panel, draw ONLY the background shape, frame, or icon art.
    - High resolution, isolated on a plain solid background.
    `;

    return generateProfessionalAsset(prompt, 'ui-visual', 'Visual Style Clone', '1:1');
};


// --- Reverse Engineering (Image to Prompt) ---

export const reverseEngineerPrompt = async (image: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(image);
    const prompt = `
    Act as a Prompt Engineer. Analyze this image and write the exact prompt used to generate it.
    Include details on: Subject, Art Style, Lighting, Color Palette, and Composition.
    Format it as a single, high-quality prompt string ready for an image generator.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] }
    });

    return response.text || "Could not analyze image.";
};

// --- Editing Services ---

export const editGameAsset = async (image: File, mask: File | null, instruction: string): Promise<string> => {
    const imagePart = await fileToGenerativePart(image);
    const parts: any[] = [imagePart];
    let finalPrompt = instruction;
  
    if (mask) {
      const maskPart = await fileToGenerativePart(mask);
      parts.push(maskPart);
      finalPrompt = `Game Asset Editing Task. Using the mask, apply this change: "${instruction}". Maintain the existing art style perfectly.`;
    } else {
        finalPrompt = `Game Asset Editing Task. Apply this change globally: "${instruction}". Maintain visual consistency.`;
    }
  
    parts.push({ text: finalPrompt });
  
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
  
    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart?.inlineData) {
      return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    
    throw new Error("Edit generation failed.");
};

// --- VFX & Tech Art Services ---

export interface VfxParams {
    type: string;
    category: 'noise' | 'cookie';
    scale?: string; // for noise
    contrast?: string; // for noise
    complexity?: string; // for noise
    edge?: string; // for cookie
    aperture?: string; // for cookie
    vibe?: string; // for cookie
}

export const generateVfxAsset = async (params: VfxParams, quality: 'draft' | 'pro'): Promise<string> => {
    let prompt = "";
    let techSpecs = "";

    if (params.category === 'noise') {
        prompt = `Seamless tileable ${params.type} noise texture. `;
        prompt += `Scale: ${params.scale || 'Standard'}. `;
        prompt += `Contrast: ${params.contrast || 'High'}. `;
        prompt += `Complexity: ${params.complexity || 'Standard'}. `;
        techSpecs = "Technical requirements: Grayscale heightmap, mathematical procedural pattern, flat lighting, no shading, square 1:1. Suitable for VFX shaders.";
    } else {
        prompt = `Light cookie texture (gobo) pattern: ${params.type}. `;
        prompt += `Aperture Shape: ${params.aperture || 'Square'}. `;
        prompt += `Edge Softness: ${params.edge || 'Sharp'}. `;
        prompt += `Cleanliness: ${params.vibe || 'Clean'}. `;
        techSpecs = "Technical requirements: High contrast Black and White only. Pure black background (blocks light), White shapes (allows light). Defines shadow projection.";
        
        // Force specific constraint for flashlights to ensure they work
        if (params.aperture === 'Circular (Flashlight)') {
            techSpecs += " MUST be a circular beam in the center of a black square. Edges must fade to black.";
        }
    }

    if (quality === 'draft') {
        // Fast generation with Gemini Flash Image
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Generate a preview texture: ${prompt} ${techSpecs}` }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart?.inlineData) {
            return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
        }
        throw new Error("Draft generation failed.");
    } else {
        // Professional generation with Imagen
        return generateProfessionalAsset(prompt, params.category, 'Technical Art', '1:1');
    }
};

// --- UV Painting Services ---

export const paintUVTexture = async (uvImage: File, objectType: string, style: string, colors: string): Promise<string> => {
    const imagePart = await fileToGenerativePart(uvImage);
    
    // Specialized prompt for UV mapping
    const prompt = `
    Act as a 3D Texture Artist. 
    Task: Paint a diffuse texture map based directly on the provided UV Layout image.
    
    Target Object: ${objectType}
    Art Style: ${style}
    Color Palette: ${colors}
    
    Instructions:
    1. Analyze the UV islands (wireframe shapes) in the input image to understand the 3D geometry.
    2. Generate a full-color texture map that perfectly aligns with these UV islands.
    3. Apply detailed materials (e.g., metal scratches, fabric weave, skin pores) inside the islands.
    4. Maintain the exact position and scale of the UV islands.
    5. Background (void space) should be distinct from the texture.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart?.inlineData) {
        return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    throw new Error("UV Painting failed. Please try a different image or prompt.");
};

// Deprecated wrappers
export const generateNoiseTexture = async (noiseType: string): Promise<string> => {
    return generateVfxAsset({ type: noiseType, category: 'noise' }, 'pro');
};
export const generateLightCookie = async (cookieType: string): Promise<string> => {
    return generateVfxAsset({ type: cookieType, category: 'cookie' }, 'pro');
};
// Backwards compatibility for App.tsx until it's updated
export const extractUiStyle = async (f: File) => extractVisualStyle(f);
export const generateUiComponent = async (s: string, c: string) => generateVisualElement(s, c);
