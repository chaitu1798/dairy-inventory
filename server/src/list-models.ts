import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function listModels() {
    console.log('Listing models...');
    const key = process.env.GEMINI_API_KEY;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        fs.writeFileSync('models.json', JSON.stringify(data, null, 2));
        console.log('Models written to models.json');
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
