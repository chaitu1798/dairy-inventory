import { Router } from 'express';
import { supabase } from '../supabase';

const router = Router();

// List all users
router.get('/', async (req, res) => {
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create User (Invite)
router.post('/', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role }
        });
        if (error) throw error;
        res.json(data.user);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update User Role
router.put('/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const { data, error } = await supabase.auth.admin.updateUserById(id, {
            user_metadata: { role }
        });
        if (error) {
            console.error('Supabase Update Role Error:', error);
            throw error;
        }
        res.json(data.user);
    } catch (error: any) {
        console.error('Update Role Route Error:', error);
        res.status(400).json({ error: error.message || 'Failed to update user role' });
    }
});

// Delete User
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
