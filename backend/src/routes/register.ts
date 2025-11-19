// src/routes/register.ts
import express from 'express';
import { registerIP } from '../controllers/registerController';
import { asyncHandler } from '../utils1/asyncHandler';

const router = express.Router();

router.post('/', asyncHandler(registerIP));

export default router;