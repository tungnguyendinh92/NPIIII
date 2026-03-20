import { GoogleGenAI, Type } from "@google/genai";
import { ProjectPart } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const partSchema = {
  type: Type.OBJECT,
  properties: {
    project: { type: Type.STRING },
    partToolDes: { type: Type.STRING },
    partNo: { type: Type.STRING },
    toolNo: { type: Type.STRING },
    molder: { type: Type.STRING },
    faLocation: { type: Type.STRING },
    toolingStartDate: { type: Type.STRING, description: "ISO date string" },
    t1Date: { type: Type.STRING, description: "ISO date string" },
    tfDate: { type: Type.STRING, description: "ISO date string" },
    currentStage: { type: Type.STRING },
    tfTx: { type: Type.STRING },
    currentStageFinishDate: { type: Type.STRING, description: "ISO date string" },
    nextStage: { type: Type.STRING },
    latestStatusUpdate: { type: Type.STRING },
    threeDIssue: { type: Type.STRING },
    toolDFM: { type: Type.STRING },
    t1: { type: Type.STRING },
    t2: { type: Type.STRING },
    t3: { type: Type.STRING },
    t4: { type: Type.STRING },
    t5: { type: Type.STRING },
    t6: { type: Type.STRING },
    odm: { type: Type.STRING },
    pde: { type: Type.STRING },
    pe: { type: Type.STRING },
    pte: { type: Type.STRING },
    beta: { type: Type.STRING },
    pilotRun: { type: Type.STRING },
    fai: { type: Type.STRING },
    xf: { type: Type.STRING, description: "ISO date string" },
    threeDDate: { type: Type.STRING, description: "ISO date string for 3D stage" },
    dfmDate: { type: Type.STRING, description: "ISO date string for Tool DFM stage" },
    modelStatus: { type: Type.STRING, description: "Overall status for the entire project model" },
    picture: { type: Type.STRING, description: "URL to the part picture if available in the data" },
  },
  required: ["project", "partToolDes", "partNo", "toolNo"],
};

export async function extractPartsFromExcel(rawData: any[]): Promise<ProjectPart[]> {
  const prompt = `
    Extract project part information from the following raw Excel data.
    Raw Data: ${JSON.stringify(rawData)}
    
    CRITICAL INSTRUCTIONS:
    1. Map the fields correctly. 
    2. DATE HANDLING: Convert ALL dates to ISO format (YYYY-MM-DD). The source data might use various formats (e.g., "MM/DD/YYYY", "DD-MM-YYYY", "YYYY.MM.DD"). Standardize them.
    3. PICTURES: If there's a column with image URLs or paths, map it to the "picture" field.
    4. MODEL STATUS: If there's a general status for the whole project/model, map it to "modelStatus".
    5. STAGES: Extract dates for 3D, Tool DFM, T1, Beta, Pilot, FAI/MP, and XF.
    6. Return an array of parts.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: partSchema,
      },
    },
  });

  const parts = JSON.parse(response.text || "[]");
  return parts.map((t: any, i: number) => ({
    ...t,
    id: t.id || `part-${Date.now()}-${i}`,
  }));
}

export async function processChatUpdate(
  message: string,
  currentParts: ProjectPart[]
): Promise<{ updatedParts: ProjectPart[]; responseText: string }> {
  const prompt = `
    The user wants to update the project data or ask a question.
    Current Data: ${JSON.stringify(currentParts)}
    User Message: "${message}"
    
    If the user wants to update a part (e.g., "update T1 date for part 282-11071-01 to 2025-08-01"), return the updated parts array.
    If the user asks for a summary or a question, provide a helpful text response.
    
    Return a JSON object with:
    - updatedParts: The full array of parts (updated if necessary).
    - responseText: A text response for the user.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          updatedParts: {
            type: Type.ARRAY,
            items: partSchema,
          },
          responseText: { type: Type.STRING },
        },
        required: ["updatedParts", "responseText"],
      },
    },
  });

  const result = JSON.parse(response.text || '{"updatedParts":[], "responseText": "Error processing request"}');
  
  // Ensure IDs are preserved
  const updatedParts = result.updatedParts.map((t: any, i: number) => ({
    ...t,
    id: currentParts[i]?.id || t.id || `part-${Date.now()}-${i}`,
  }));

  return { updatedParts, responseText: result.responseText };
}

export async function getSummary(parts: ProjectPart[]): Promise<string> {
  const prompt = `
    Provide a concise executive summary of the following project parts.
    Highlight key milestones, delays, and overall progress.
    Data: ${JSON.stringify(parts)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "No summary available.";
}
