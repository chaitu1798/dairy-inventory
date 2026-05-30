import { Router } from 'express';
import { upload, analyzeImage, createProductsFromImage } from '../imageUtils';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Endpoint: POST /upload
// Process: Upload -> Analyze -> Create Products -> Return Result
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        // 1. Analyze the image (Mock AI)
        const analysis = await analyzeImage(req.file.buffer);
        console.log("Analysis Result:", analysis);

        // 2. Automatically create products based on analysis
        const creationResult = await createProductsFromImage(analysis.products);

        res.json({
            analysis,
            productCreation: creationResult
        });

    } catch (error: any) {
        console.error("Upload handler error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

export default router;
