import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
    console.log('Testing Gemini API...');

    if (typeof globalThis.fetch === 'function') {
        console.log('Global fetch is available.');
    } else {
        console.error('Global fetch is NOT available.');
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('Error: GEMINI_API_KEY not found in environment');
        return;
    }
    console.log('Key found:', key.substring(0, 5) + '...');

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = "Explain what a dairy inventory system is in one sentence.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('Gemini Response:', text);
    } catch (error: any) {
        console.error('Gemini Error:', JSON.stringify(error, null, 2));
        console.error('Error Message:', error.message);
    }
}

testGemini();
