import { Router } from 'express';
import { supabase } from '../supabase';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload image to Supabase Storage
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase
            .storage
            .from('stock-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ error: 'Failed to upload image', details: error });
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('stock-images')
            .getPublicUrl(filePath);

        res.json({ url: publicUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
});

// Analyze image using Gemini 1.5 Flash
import { GoogleGenerativeAI } from '@google/generative-ai';

router.post('/analyze', async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Fetch image data
        console.log('Fetching image from URL:', imageUrl);
        const imageResp = await fetch(imageUrl);
        if (!imageResp.ok) {
            throw new Error(`Failed to fetch image: ${imageResp.statusText}`);
        }
        const imageBuffer = await imageResp.arrayBuffer();
        console.log('Image fetched, size:', imageBuffer.byteLength);

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
                    data: Buffer.from(imageBuffer).toString('base64'),
                    mimeType: imageResp.headers.get('content-type') || 'image/jpeg'
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini response:', text);

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.json(data);
    } catch (error: any) {
        console.error('Gemini analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze image', details: error.message });
    }
});

// Update stock based on image capture
router.post('/update', async (req, res) => {
    const { productId, quantity, actionType, imageUrl } = req.body;

    if (!productId || !quantity || !actionType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Fetch product details (cost price)
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('cost_price')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const costPrice = product.cost_price;
        const qty = parseFloat(quantity);

        // 2. Perform Stock Action
        if (actionType === 'IN') {
            // Add to Purchases
            const { error: purchaseError } = await supabase
                .from('purchases')
                .insert([{
                    product_id: productId,
                    quantity: qty,
                    price: costPrice,
                    purchase_date: new Date().toISOString().split('T')[0] // Today
                }]);

            if (purchaseError) throw purchaseError;

        } else if (actionType === 'OUT') {
            // Add to Waste (using 'other' reason for manual adjustment)
            const { error: wasteError } = await supabase
                .from('waste')
                .insert([{
                    product_id: productId,
                    quantity: qty,
                    reason: 'other',
                    cost_value: costPrice * qty,
                    waste_date: new Date().toISOString().split('T')[0],
                    notes: 'Image Capture Stock Adjustment'
                }]);

            if (wasteError) throw wasteError;
        } else {
            return res.status(400).json({ error: 'Invalid action type' });
        }

        // 3. Log to stock_logs
        const { error: logError } = await supabase
            .from('stock_logs')
            .insert([{
                product_id: productId,
                quantity: qty,
                action_type: actionType,
                image_url: imageUrl,
                updated_by: 'system' // Placeholder, could be user ID if auth was passed
            }]);

        if (logError) console.error('Error logging stock update:', logError);

        res.json({ message: 'Stock updated successfully' });

    } catch (error: any) {
        console.error('Stock update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update stock' });
    }
});

export default router;
