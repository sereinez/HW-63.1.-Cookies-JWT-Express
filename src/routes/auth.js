import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateAuthBody } from '../middlewares/validate.js';

const router = Router();

router.get('/login', auth.loginPage);
router.post('/login', validateAuthBody('login'), auth.login);

router.get('/register', auth.registerPage);
router.post('/register', validateAuthBody('register'), auth.register);

router.post('/logout', auth.logout);

// Захищений маршрут: потрібен дійсний JWT
router.get('/me', authenticate, auth.me);

export default router;
