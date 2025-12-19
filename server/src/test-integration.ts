import fetch from 'node-fetch';

async function testAnalyze() {
    console.log('Testing /stock/analyze endpoint...');

    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Milk_glass.jpg/220px-Milk_glass.jpg';

    try {
        const response = await fetch('http://localhost:3001/stock/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl })
        });

        console.log('Status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Error Body:', text);
            return;
        }

        const data = await response.json();
        console.log('Success! Data:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAnalyze();
