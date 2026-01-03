
const fetch = require('node-fetch'); // Assuming node-fetch 2.x or node 18+

async function testLogin() {
    try {
        console.log('Testing POST http://localhost:3001/auth/login ...');
        const res = await fetch('http://localhost:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password' })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body start:', text.substring(0, 500));
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testLogin();
