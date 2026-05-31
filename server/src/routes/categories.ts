import { Router } from 'express';
import { collections } from '../firebase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all categories
router.get('/', requireAuth, async (req, res) => {
  try {
    const snapshot = await collections.categories.orderBy('name').get();
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create a new category
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, isActive = true } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const existingSnapshot = await collections.categories
      .where('name', '==', name.trim())
      .get();

    if (!existingSnapshot.empty) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const newCategory = {
      name: name.trim(),
      isActive,
      createdAt: new Date().toISOString()
    };

    const docRef = await collections.categories.add(newCategory);
    const doc = await docRef.get();

    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name) {
      updates.name = name.trim();
    }
    if (typeof isActive !== 'undefined') {
      updates.isActive = isActive;
    }

    await collections.categories.doc(id).update(updates);
    const doc = await collections.categories.doc(id).get();

    res.json({ id: doc.id, ...doc.data() });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await collections.categories.doc(id).delete();
    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;