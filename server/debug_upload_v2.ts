
const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        // Create dummy file
        const filePath = path.join(__dirname, 'test_image.txt');
        fs.writeFileSync(filePath, 'dummy image content');

        const formData = new FormData();
        const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'text/plain' });
        formData.append('image', fileBlob, 'test_image.txt');

        console.log('Attempting upload to http://localhost:3001/stock/upload...');

        const response = await fetch('http://localhost:3001/stock/upload', {
            method: 'POST',
            body: formData
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Body:', text);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (fs.existsSync(path.join(__dirname, 'test_image.txt'))) {
            fs.unlinkSync(path.join(__dirname, 'test_image.txt'));
        }
    }
}

testUpload();
