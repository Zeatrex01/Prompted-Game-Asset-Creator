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
    assetType: 'logo' | 'banner' | 'texture' | 'ui' | 'cookie' | 'noise',
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

// --- UI/GUI Studio Services ---

export const extractUiStyle = async (referenceImage: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(referenceImage);
    const prompt = `
    Analyze this image to create a "UI Design System" document.
    Extract the following visual rules:
    - Color Palette (Primary, Secondary, Accent)
    - Shape Language (Rounded, Sharp, Organic)
    - Border/Frame Styles (Metallic, Glowing, Minimal)
    - Texture/Backgrounds within UI elements
    
    Summarize this into a single descriptive paragraph that can be used as a style guide for generating other matching UI components.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
    });

    return response.text || "Cyberpunk minimalist interface with neon blue accents.";
};

export const generateUiComponent = async (styleGuide: string, componentType: string): Promise<string> => {
    const prompt = `
    Create a game UI asset: ${componentType}.
    
    Adhere strictly to this Style Guide:
    ${styleGuide}
    
    Requirements:
    - High resolution, crisp edges.
    - Isolated on a plain background (easy to crop).
    - Professional game UI quality (e.g., RPG, Sci-Fi, Fantasy).
    - If it's a panel/window, ensure the content area is clear.
    `;

    return generateProfessionalAsset(prompt, 'ui', 'Game User Interface', '1:1');
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

export const generateNoiseTexture = async (noiseType: string): Promise<string> => {
    const prompt = `Seamless tileable ${noiseType} noise texture. Technical requirements: Grayscale heightmap, high contrast, mathematical procedural pattern, flat lighting, no shading, 4k resolution. Suitable for VFX shaders and displacement maps.`;
    return generateProfessionalAsset(prompt, 'noise', 'Procedural Math', '1:1');
};

export const generateLightCookie = async (cookieType: string): Promise<string> => {
    const prompt = `Light cookie texture (gobo) pattern: ${cookieType}. Technical requirements: High contrast Black and White only. Pure black background (blocks light), White shapes (allows light). Sharp defined edges for shadow projection. Viewed from front, flat projection.`;
    return generateProfessionalAsset(prompt, 'cookie', 'Light Cookie / Gobo', '1:1');
};