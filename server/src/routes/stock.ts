import { Router } from 'express';
import { supabase } from '../supabase';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload image to Supabase Storage
router.post('/upload', upload.single('image'), async (req, res) => {
    console.log('--- [POST] /stock/upload request received ---');
    try {
        if (!req.file) {
            console.error('Error: No image file provided');
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.file;
        console.log(`File received: ${file.originalname}, Size: ${file.size}, Mime: ${file.mimetype}`);

        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        console.log(`Uploading to bucket 'stock-images' as '${filePath}'...`);

        const { data, error } = await supabase
            .storage
            .from('stock-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype
            });

        if (error) {
            console.error('Supabase upload error:', JSON.stringify(error, null, 2));
            return res.status(500).json({ error: 'Failed to upload image', details: error });
        }

        console.log('Upload successful. Fetching Public URL...');
        const { data: { publicUrl } } = supabase
            .storage
            .from('stock-images')
            .getPublicUrl(filePath);

        console.log('Public URL:', publicUrl);
        console.log('--- [POST] /stock/upload completed ---');

        // Return both URL and filePath
        res.json({ url: publicUrl, filePath });
    } catch (error) {
        console.error('CRITICAL Upload error:', error);
        res.status(500).json({ error: 'Internal server error during upload', details: error instanceof Error ? error.message : String(error) });
    }
});

// Analyze image using Gemini 1.5 Flash
import { GoogleGenerativeAI } from '@google/generative-ai';

router.post('/analyze', async (req, res) => {
    console.log('--- [POST] /stock/analyze request received ---');
    const { imageUrl, filePath } = req.body;
    console.log('Params:', { imageUrl, filePath });

    if (!imageUrl && !filePath) {
        console.error('Error: Missing imageUrl and filePath');
        return res.status(400).json({ error: 'Image URL or File Path is required' });
    }

    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.error('Error: GEMINI_API_KEY missing');
            throw new Error('GEMINI_API_KEY is not set');
        }

        console.log('Initializing Gemini 2.0-flash...');
        const genAI = new GoogleGenerativeAI(key);
        // Using gemini-2.0-flash as confirmed in models.json
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let imageBuffer: ArrayBuffer;
        let mimeType = 'image/jpeg'; // Default, ideally fetch from metadata if possible or guess

        // Method 1: Download from Supabase (Preferred for security/reliability)
        if (filePath) {
            console.log('Downloading image from Supabase Storage:', filePath);
            const { data, error } = await supabase.storage.from('stock-images').download(filePath);
            if (error || !data) {
                console.error('Supabase download error:', error);
                throw new Error(`Failed to download image from storage: ${error?.message}`);
            }
            imageBuffer = await data.arrayBuffer();
            mimeType = data.type || mimeType;
            console.log('Image downloadable, size:', imageBuffer.byteLength, 'type:', mimeType);
        } else {
            // Method 2: Fetch from URL (Fallback)
            console.log('Fetching image from URL:', imageUrl);
            const imageResp = await fetch(imageUrl);
            if (!imageResp.ok) {
                throw new Error(`Failed to fetch image: ${imageResp.statusText}`);
            }
            imageBuffer = await imageResp.arrayBuffer();
            mimeType = imageResp.headers.get('content-type') || mimeType;
            console.log('Image fetched from URL, size:', imageBuffer.byteLength);
        }

        const prompt = `Analyze this image of a product or bill/invoice. 
        Extract the following details in JSON format:
        - productName: The name of the product (string)
        - quantity: The quantity purchased (number)
        - unit: The unit of measurement if available (string, e.g., kg, litre, packet)
        - date: The date of purchase in YYYY-MM-DD format (string). If not found, use today's date.
        
        Return ONLY the JSON object, no markdown formatting.`;

        console.log('Sending to Gemini...');
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: Buffer.from(imageBuffer).toString('base64'),
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini response received:', text);

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const data = JSON.parse(jsonStr);
            console.log('Parsed JSON:', data);
            res.json(data);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw Gemini Text:', text);
            throw new Error('Failed to parse Gemini response as JSON');
        }

    } catch (error: any) {
        console.error('CRITICAL Gemini analysis error details:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: 'Failed to analyze image', details: error.message, fullError: error });
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
