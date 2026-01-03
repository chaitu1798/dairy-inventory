
const fs = require('fs');
const path = require('path');

async function testFlow() {
    try {
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
        console.log(`Upload Result (${upRes.status}):`, upText.substring(0, 100)); // Print start

        if (upRes.status !== 200) {
            console.error("Upload failed");
            return;
        }

        const upData = JSON.parse(upText);
        const { url, filePath: storagePath } = upData;
        console.log("Storage Path:", storagePath);

        console.log('2. Analyzing...');
        const azRes = await fetch('http://localhost:3001/stock/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: url, filePath: storagePath })
        });

        const azText = await azRes.text();
        console.log(`Analyze Result (${azRes.status}):`, azText); // Print FULL error

    } catch (error) {
        console.error('Script Error:', error);
    }
}

testFlow();
