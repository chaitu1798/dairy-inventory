import { Router } from 'express';
import { upload, analyzeImage, updateStockFromImage } from '../imageUtils';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Endpoint: POST /upload
// Process: Upload -> Analyze -> Update Stock -> Return Result
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        // 1. Analyze the image (Mock AI)
        const analysis = await analyzeImage(req.file.buffer);
        console.log("Analysis Result:", analysis);

        // 2. Automatically update stock based on analysis
        // In a real user flow, you might want a confirmation step.
        // For this task, we assume auto-update or just returning the tool-ready data.
        // Let's perform the update using the tool logic to demonstrate the full loop.

        const updateResult = await updateStockFromImage(analysis.product, analysis.quantity);

        res.json({
            analysis,
            stockUpdate: updateResult
        });

    } catch (error: any) {
        console.error("Upload handler error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

export default router;
