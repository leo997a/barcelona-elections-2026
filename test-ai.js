import { GoogleGenAI, Type } from '@google/genai';

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

console.log(JSON.stringify(arrSchema({ badge: { type: Type.STRING } }, ['badge']), null, 2));
