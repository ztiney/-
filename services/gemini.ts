import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleItem } from "../types";

// Initialize Gemini
// Note: In a production app, handle the missing API key more gracefully in the UI.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export interface AIScheduleRequest {
  prompt: string;
  currentDayIndex: number; // 0-6
  userId: string;
}

export const generateScheduleFromText = async (
  request: AIScheduleRequest
): Promise<Partial<ScheduleItem>[]> => {
  if (!apiKey) {
    console.error("No API Key provided");
    return [];
  }

  const model = "gemini-2.5-flash";
  
  const systemInstruction = `
    你是一个可爱的周计划应用程序的智能助手。
    请将用户的自然语言请求转换为日程安排项列表 (JSON格式)。
    用户可能会说“把我的周一安排上早上9点的2小时数学课” 或者 "明天下午3点去健身"。
    
    规则:
    - 'startTime' 是距离午夜的分钟数 (例如, 9:00 AM = 540, 14:00 = 840)。
    - 'duration' 是分钟数。
    - 'dayIndex' 是 0 (周一) 到 6 (周日)。
    - 如果用户没有指定具体哪一天，请根据提示中提供的 'Current Day Index' 推断 (例如用户说"今天"或"明天")，或者默认为 'Current Day Index'。
    - 'color' 应该是匹配活动氛围的十六进制代码（首选柔和的马卡龙色系）。
    - 'templateId' 设置为 'ai-generated'。
    - 'title' 请使用中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Current Day Index: ${request.currentDayIndex}. User Request: ${request.prompt}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              startTime: { type: Type.INTEGER },
              duration: { type: Type.INTEGER },
              dayIndex: { type: Type.INTEGER },
              color: { type: Type.STRING },
            },
            required: ["title", "startTime", "duration", "dayIndex", "color"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text);
    // Add missing IDs and fixed fields
    return data.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      userId: request.userId,
      templateId: 'ai-gen',
    }));

  } catch (error) {
    console.error("Error generating schedule:", error);
    return [];
  }
};