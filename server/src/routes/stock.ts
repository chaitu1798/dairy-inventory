import { Router } from 'express';
import { supabase } from '../supabase';
import { requireAuth } from '../middleware/auth';
import { upload } from '../imageUtils'; // Shared multer instance
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase
            .storage
            .from('product-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error:', error.message);
            return res.status(500).json({
                error: 'Failed to upload image',
                details: error.message
            });
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('product-images')
            .getPublicUrl(filePath);

        res.json({ url: publicUrl, filePath });
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

        let imageBuffer: ArrayBuffer;
        let mimeType = 'image/jpeg'; // Default, ideally fetch from metadata if possible or guess

        // Method 1: Download from Supabase
        if (filePath) {
            const { data, error } = await supabase.storage.from('product-images').download(filePath);

            if (!error && data) {
                imageBuffer = await data.arrayBuffer();
                mimeType = data.type || mimeType;
            } else {
                const { data: signedData } = await supabase
                    .storage
                    .from('product-images')
                    .createSignedUrl(filePath, 60);

                if (signedData?.signedUrl) {
                    const signedResp = await fetch(signedData.signedUrl);
                    if (signedResp.ok) {
                        imageBuffer = await signedResp.arrayBuffer();
                        mimeType = signedResp.headers.get('content-type') || mimeType;
                    }
                }
            }
        }

        if (!imageBuffer! && imageUrl) {
            const imageResp = await fetch(imageUrl);
            if (imageResp.ok) {
                imageBuffer = await imageResp.arrayBuffer();
                mimeType = imageResp.headers.get('content-type') || mimeType;
            } else {
                console.error(`Failed to fetch image from URL: ${imageResp.statusText}`);
            }
        }

        if (!imageBuffer!) {
            throw new Error("Failed to retrieve image data from Storage, Signed URL, or Public URL. Check bucket permissions.");
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
                    data: Buffer.from(imageBuffer).toString('base64'),
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

// Update stock based on image capture
router.post('/update', requireAuth, async (req, res) => {
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
