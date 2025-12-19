import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error('❌ GEMINI_API_KEY is missing');
    process.exit(1);
}

// 1x1 white pixel JPEG (base64)
const base64Image = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFTKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==";

async function testGemini(modelName: string) {
    console.log(`\nTesting model: "${modelName}"...`);
    try {
        const genAI = new GoogleGenerativeAI(key!);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent([
            "What is in this image?",
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        console.log(`✅ Success with ${modelName}! Response:`, response.text().substring(0, 50) + "...");
    } catch (error: any) {
        const errorMsg = `❌ Failed with ${modelName}:\n   Message: ${error.message}\n` +
            (error.response ? `   Status: ${error.response.status}\n   StatusText: ${error.response.statusText}` : '');
        console.error(errorMsg);
        // Write to file to avoid truncation
        const fs = require('fs');
        fs.writeFileSync('debug_error.log', errorMsg);
    }
}

async function runTests() {
    await testGemini("gemini-2.0-flash");
}

runTests();
