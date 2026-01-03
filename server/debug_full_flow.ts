
const fs = require('fs');
const path = require('path');

async function testFlow() {
    try {
        // 1. Upload
        const filePath = path.join(__dirname, 'test_image.txt');
        fs.writeFileSync(filePath, 'dummy image content');

        const formData = new FormData();
        const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'text/plain' });
        formData.append('image', fileBlob, 'test_image.txt');

        console.log('1. Uploading...');
        const upRes = await fetch('http://localhost:3001/stock/upload', {
            method: 'POST',
            body: formData
        });

        const upText = await upRes.text();
        console.log('Upload Status:', upRes.status);
        console.log('Upload Body:', upText);

        if (upRes.status !== 200) return;

        const upData = JSON.parse(upText);
        const { url, filePath: storagePath } = upData;

        // 2. Analyze
        console.log('2. Analyzing...');
        // Note: Analyze might fail on dummy text file interpreted as image, but checking for 500 vs 400/other
        const azRes = await fetch('http://localhost:3001/stock/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url, filePath: storagePath })
        });

        const azText = await azRes.text();
        console.log('Analyze Status:', azRes.status);
        console.log('Analyze Body:', azText);

    } catch (error) {
        console.error('Script Error:', error);
    }
}

testFlow();
