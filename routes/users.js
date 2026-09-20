import express from 'express';
import { registerUser, loginUser } from '../controllers/usersController.js';

const router = express.Router();

// Root GET route for browser testing
router.get('/', (req, res) => {
    res.json({ message: 'Users root route working' });
});

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router;
