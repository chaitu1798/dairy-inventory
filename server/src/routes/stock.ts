import { Router } from 'express';
import { collections, storage } from '../firebase';
import { requireAuth } from '../middleware/auth';
import { upload } from '../imageUtils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${uuidv4()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;

        const blob = storage.bucket().file(filePath);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });

        blobStream.on('error', (err) => {
            console.error('Firebase upload error:', err);
            res.status(500).json({ error: 'Failed to upload image', details: err.message });
        });

        blobStream.on('finish', async () => {
            // Make the file public or get a signed URL
            await blob.makePublic();
            const publicUrl = `https://storage.googleapis.com/${storage.bucket().name}/${filePath}`;
            res.json({ url: publicUrl, filePath });
        });

        blobStream.end(file.buffer);

    } catch (error) {
        console.error('Upload error:', error instanceof Error ? error.message : error);
        res.status(500).json({
            error: 'Internal server error during upload',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

router.post('/analyze', requireAuth, async (req, res) => {
    const { imageUrl, filePath } = req.body;

    if (!imageUrl && !filePath) {
        return res.status(400).json({ error: 'Image URL or File Path is required' });
    }

    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('GEMINI_API_KEY is not set');

        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let imageBuffer: Buffer | null = null;
        let mimeType = 'image/jpeg';

        if (filePath) {
            const file = storage.bucket().file(filePath);
            const [exists] = await file.exists();
            if (exists) {
                const [buffer] = await file.download();
                imageBuffer = buffer;
                const [metadata] = await file.getMetadata();
                mimeType = metadata.contentType || mimeType;
            }
        }

        if (!imageBuffer && imageUrl) {
            const imageResp = await fetch(imageUrl);
            if (imageResp.ok) {
                imageBuffer = Buffer.from(await imageResp.arrayBuffer());
                mimeType = imageResp.headers.get('content-type') || mimeType;
            }
        }

        if (!imageBuffer) {
            throw new Error("Failed to retrieve image data from Storage or Public URL.");
        }

        const prompt = `Analyze this image of a product or bill/invoice. 
        Extract the following details in JSON format:
        - productName: The name of the product (string)
        - quantity: The quantity purchased (number)
        - unit: The unit of measurement if available (string, e.g., kg, litre, packet)
        - date: The date of purchase in YYYY-MM-DD format (string). If not found, use today's date.
        
        Return ONLY the JSON object, no markdown formatting.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const data = JSON.parse(jsonStr);
            res.json(data);
        } catch (parseError) {
            console.error('Failed to parse Gemini response. Raw text:', text);
            throw new Error('Failed to parse Gemini response as JSON');
        }

    } catch (error: any) {
        console.error('Gemini analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze image', details: error.message });
    }
});

router.post('/update', requireAuth, async (req, res) => {
    const { productId, quantity, actionType, imageUrl } = req.body;

    if (!productId || !quantity || !actionType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const productDoc = await collections.products.doc(productId).get();
        if (!productDoc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const costPrice = productDoc.data()?.cost_price || 0;
        const qty = parseFloat(quantity);

        if (actionType === 'IN') {
            await collections.purchases.add({
                product_id: productId,
                quantity: qty,
                price: costPrice,
                total: qty * costPrice,
                purchase_date: new Date().toISOString().split('T')[0]
            });
        } else if (actionType === 'OUT') {
            await collections.waste.add({
                product_id: productId,
                quantity: qty,
                reason: 'other',
                cost_value: costPrice * qty,
                waste_date: new Date().toISOString().split('T')[0],
                notes: 'Image Capture Stock Adjustment'
            });
        } else {
            return res.status(400).json({ error: 'Invalid action type' });
        }

        await collections.stock_logs.add({
            product_id: productId,
            quantity: qty,
            action_type: actionType,
            image_url: imageUrl,
            updated_by: 'system',
            created_at: new Date().toISOString()
        });

        res.json({ message: 'Stock updated successfully' });

    } catch (error: any) {
        console.error('Stock update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update stock' });
    }
});

export default router;
