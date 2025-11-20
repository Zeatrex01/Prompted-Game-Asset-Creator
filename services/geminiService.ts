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
// This uses Gemini 3 Pro's reasoning capabilities to turn a simple user intent
// into a professional-grade prompt for the image generator.
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
            thinkingConfig: { thinkingBudget: 2048 }, // Allow some thinking for creative expansion
        }
    });

    return response.text || userPrompt;
};

// --- Image Generation Services ---

export const generateProfessionalAsset = async (
    userPrompt: string, 
    assetType: 'logo' | 'banner' | 'texture',
    styleProfile: string,
    aspectRatio: string = '1:1'
): Promise<string> => {
    
    // 1. Refine the prompt using the "Art Director"
    const enhancedPrompt = await enhancePrompt(
        userPrompt,
        `Generating a professional ${assetType} for a video game. Style goal: ${styleProfile}.`,
        `Ensure the asset is high-resolution. For logos: vector style, clean background. For textures: seamless, tileable. For banners: cinematic composition.`
    );

    console.log(`[Art Director] Enhanced Prompt: ${enhancedPrompt}`);

    // 2. Generate using Imagen 4.0 for maximum quality
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio as any, // Type casting for SDK compatibility
            outputMimeType: 'image/jpeg'
        }
    });

    const image = response.generatedImages?.[0]?.image;
    if (image && image.imageBytes) {
        return `data:image/jpeg;base64,${image.imageBytes}`;
    }

    throw new Error("Failed to generate professional asset.");
};

// --- Editing & Ref-Based Services (Gemini 2.5 Flash) ---

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
      model: 'gemini-2.5-flash-image', // Best for multimodal editing
      contents: { parts: parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
  
    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart?.inlineData) {
      return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    
    throw new Error("Edit generation failed.");
};

export const generateConceptFromRef = async (
    referenceImage: File,
    prompt: string,
    style: string
): Promise<string> => {
    const imagePart = await fileToGenerativePart(referenceImage);
    const finalPrompt = `
    Analyze the reference image. Use its color palette and composition as inspiration to create a new game asset.
    Prompt: ${prompt}
    Style: ${style}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: finalPrompt }] },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart?.inlineData) {
      return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    
    throw new Error("Reference-based generation failed.");
};

// --- Analysis & Ideation (Gemini 3 Pro) ---

export const analyzeAssetForDev = async (image: File): Promise<{
    style: string;
    mood: string;
    technicalNotes: string;
    usageSuggestions: string[];
}> => {
    const imagePart = await fileToGenerativePart(image);
    const prompt = `
    Act as a Lead Technical Artist. Analyze this image for a game asset library.
    Provide the output in JSON format with the following keys:
    - style: The visual style (e.g., Low Poly, Pixel Art, Hyperrealistic).
    - mood: The emotional tone.
    - technicalNotes: Notes on lighting, texture quality, or perspective.
    - usageSuggestions: An array of 3 potential uses in a game (e.g., "Inventory Icon", "Loading Screen").
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 1024 }
        }
    });

    return JSON.parse(response.text || "{}");
};

export const brainstormGameMechanics = async (concept: string): Promise<string> => {
    const prompt = `
    Act as a Senior Game Designer. 
    Brainstorm 3 unique game mechanics or loop ideas based on this concept: "${concept}".
    Format the output as a clean Markdown list with bold headers.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 4096 } }
    });

    return response.text;
};
