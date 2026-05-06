import { GoogleGenAI, Type } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const arrSchema = (props, required) => ({
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: props, required },
    },
  },
  required: ['items'],
});
async function run() {
  try {
    const blankImg = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "extract" },
            { inlineData: { mimeType: 'image/png', data: blankImg } }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: arrSchema({ badge: { type: Type.STRING } }, ['badge'])
      }
    });
    console.log(res.text);
  } catch (e) { console.error("ERROR", e); }
}
run();
