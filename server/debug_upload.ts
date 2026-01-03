
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testUpload() {
    try {
        // Create a dummy file
        const filePath = path.join(__dirname, 'test_image.txt');
        fs.writeFileSync(filePath, 'dummy image content');

        const form = new FormData();
        form.append('image', fs.createReadStream(filePath), {
            filename: 'test_image.txt',
            contentType: 'text/plain',
        });

        console.log('Attempting upload to http://localhost:3001/stock/upload...');
        const response = await axios.post('http://localhost:3001/stock/upload', form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        console.log('Success:', response.status, response.data);
    } catch (error: any) {
        console.error('Error Status:', error.response?.status);
        console.error('Error Data:', error.response?.data);
        console.error('Error Message:', error.message);
    } finally {
        if (fs.existsSync(path.join(__dirname, 'test_image.txt'))) {
            fs.unlinkSync(path.join(__dirname, 'test_image.txt'));
        }
    }
}

testUpload();
