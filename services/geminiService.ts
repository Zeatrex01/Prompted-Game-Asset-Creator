import { GoogleGenAI, Modality, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const editImageWithPrompt = async (image: File, mask: File | null, prompt: string): Promise<string> => {
  const imagePart = await fileToGenerativePart(image);
  
  const parts: any[] = [imagePart];
  let finalPrompt = prompt;

  if (mask) {
    const maskPart = await fileToGenerativePart(mask);
    parts.push(maskPart);
    finalPrompt = `Using the provided B&W mask image, apply the following edit ONLY to the white areas of the mask. The black areas of the mask must remain completely unchanged in the final output. The user's edit instruction is: "${prompt}"`;
  }

  parts.push({ text: finalPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const firstPart = response.candidates?.[0]?.content?.parts?.[0];
  if (firstPart && firstPart.inlineData) {
    const base64ImageBytes: string = firstPart.inlineData.data;
    return `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
  }
  
  throw new Error("No image was generated. The model may have refused the request.");
};

export const analyzeImage = async (image: File): Promise<string> => {
  const imagePart = await fileToGenerativePart(image);
  const textPart = { text: "Describe this image for a game asset library. Focus on its style, mood, content, and potential use as a game logo, banner, or background. Be detailed." };

  // Using Gemini 3 Pro with thinking for deep image analysis as requested
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [imagePart, textPart] },
    config: {
        thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return response.text;
};

export const getQuickResponse = async (prompt: string, ideaType: string): Promise<string> => {
    let finalPrompt = '';
    switch(ideaType) {
        case 'Game Concept':
            finalPrompt = `Generate a short, creative game concept based on this idea: "${prompt}". Include a title, genre, and a brief description of the gameplay loop.`;
            break;
        case 'Character Idea':
            finalPrompt = `Generate a compelling game character concept from this prompt: "${prompt}". Include a name, a brief backstory, and a key ability.`;
            break;
        case 'Quest/Mission Idea':
            finalPrompt = `Generate an interesting quest or mission idea for a game, based on: "${prompt}". Provide a quest title, a summary, and the main objective.`;
            break;
        case 'Item/Weapon Idea':
            finalPrompt = `Generate a unique item or weapon concept for a game from this idea: "${prompt}". Give it a name, describe its appearance, and list its special properties or effects.`;
            break;
        case 'Location/Environment Idea':
            finalPrompt = `Generate an atmospheric game location or environment concept based on: "${prompt}". Describe the area, its key features, and the overall mood.`;
            break;
        default:
            finalPrompt = `Generate a short, creative concept for a game asset based on this idea: "${prompt}". Include a title and a brief description.`;
    }

  // Using Gemini 3 Pro with thinking for creative tasks to provide high quality ideas
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: finalPrompt,
    config: {
        thinkingConfig: { thinkingBudget: 32768 }
    }
  });
  return response.text;
};

export const generateTexture = async (prompt: string): Promise<string> => {
  const finalPrompt = `Create a high-quality, seamlessly tileable game texture based on the following description: "${prompt}"`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: finalPrompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const firstPart = response.candidates?.[0]?.content?.parts?.[0];
  if (firstPart && firstPart.inlineData) {
    const base64ImageBytes: string = firstPart.inlineData.data;
    return `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
  }

  throw new Error("No texture was generated. The model may have refused the request.");
};

export const generateLogoConcepts = async (
    prompt: string,
    style: string,
    colors: string,
    negativePrompt: string,
    referenceImage: File | null,
    transparentBg: boolean
): Promise<string[]> => {
    
    const parts: any[] = [];
    let finalPrompt: string;

    if (referenceImage) {
        const imagePart = await fileToGenerativePart(referenceImage);
        parts.push(imagePart);
        finalPrompt = `Analyze the provided reference image for its style, color palette, and composition. Using that as inspiration, generate a professional, clean, vector-style logo for: "${prompt}".\nStyle: ${style}.`;
    } else {
        finalPrompt = `Generate a professional, clean, vector-style logo for: "${prompt}".\nStyle: ${style}.`;
    }

    if (colors) {
        finalPrompt += `\nPrimary colors: ${colors}.`;
    }
    if (negativePrompt) {
        finalPrompt += `\nAvoid the following elements: ${negativePrompt}.`;
    }

    if (transparentBg) {
        finalPrompt += "\nThe logo MUST have a transparent background.";
    } else {
        finalPrompt += "\nThe logo should be on a solid, neutral background.";
    }
    
    parts.push({ text: finalPrompt });

    const generationPromises = Array(4).fill(0).map(() => 
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        })
    );

    const responses = await Promise.all(generationPromises);

    const imageUrls = responses.map(response => {
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const base64ImageBytes: string = firstPart.inlineData.data;
            return `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
        throw new Error("One or more logo concepts failed to generate.");
    });
    
    return imageUrls;
};

export const generateBanners = async (
    prompt: string,
    style: string,
    aspectRatio: string,
    colors: string,
    negativePrompt: string,
    referenceImage: File | null,
    textOverlay: string
): Promise<string[]> => {
    
    const parts: any[] = [];
    let finalPrompt: string;

    if (referenceImage) {
        const imagePart = await fileToGenerativePart(referenceImage);
        parts.push(imagePart);
        finalPrompt = `Analyze the provided reference image for its style, color palette, and composition. Using that as inspiration, generate a high-quality game banner or promotional artwork for: "${prompt}".\nStyle: ${style}.`;
    } else {
        finalPrompt = `Generate a high-quality game banner or promotional artwork for: "${prompt}".\nStyle: ${style}.`;
    }

    finalPrompt += `\nAspect Ratio: ${aspectRatio}.`;

    if (colors) {
        finalPrompt += `\nPrimary colors: ${colors}.`;
    }
    if (textOverlay) {
        finalPrompt += `\nTry to incorporate this text into the design: "${textOverlay}".`;
    }
    if (negativePrompt) {
        finalPrompt += `\nAvoid the following elements: ${negativePrompt}.`;
    }
    
    parts.push({ text: finalPrompt });

    const generationPromises = Array(2).fill(0).map(() => 
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        })
    );

    const responses = await Promise.all(generationPromises);

    const imageUrls = responses.map(response => {
        const firstPart = response.candidates?.[0]?.content?.parts?.[0];
        if (firstPart && firstPart.inlineData) {
            const base64ImageBytes: string = firstPart.inlineData.data;
            return `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
        throw new Error("One or more banner concepts failed to generate.");
    });
    
    return imageUrls;
};

export const extractTexturesFromImage = async (image: File): Promise<{name: string, description: string}[]> => {
    const imagePart = await fileToGenerativePart(image);
    const prompt = "Analyze the provided image and identify the distinct, repeating textures suitable for a video game. For each texture, provide a short, descriptive name and a detailed description for an AI image generator to recreate it as a seamless, tileable texture. Focus on materials like wood, stone, metal, fabric, ground, etc. Respond ONLY with a valid JSON array of objects.";
  
    const textPart = { text: prompt };
  
    // Using Gemini 3 Pro with thinking for complex image extraction and structuring
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "A short, descriptive name for the texture (e.g., 'Cracked Stone Wall')."
              },
              description: {
                type: Type.STRING,
                description: "A detailed prompt for an AI to generate this texture as a tileable asset."
              }
            },
            required: ['name', 'description']
          }
        },
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    
    try {
      const jsonText = response.text.trim();
      const textures = JSON.parse(jsonText);
      if (!Array.isArray(textures)) {
          throw new Error("Response from model is not a JSON array.");
      }
      return textures;
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", response.text, e);
      throw new Error("Could not extract textures. The model returned an unexpected format.");
    }
  };
  
  export const generateSceneIdeas = async (textures: {name: string, description: string}[]): Promise<string> => {
      if (textures.length === 0) {
          throw new Error("No textures provided to generate scene ideas.");
      }
  
      const textureList = textures.map(t => `- ${t.name}: ${t.description}`).join('\n');
  
      const prompt = `
          Based on the following game texture(s):
          ${textureList}
  
          Describe 2-3 distinct and atmospheric game scenes or environments where these textures could be used effectively. For each scene, explain how the textures contribute to the overall mood, storytelling, and visual design. Be creative and detailed.
      `;
  
      // Using Gemini 3 Pro with thinking for complex creative writing
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
      });
      return response.text;
  };