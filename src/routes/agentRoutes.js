/**
 * Agent Routes
 * Defines API endpoints for agent operations
 */

import express from 'express';
import { agentController } from '../controllers/agentController.js';

const router = express.Router();

// Session management
router.post('/session', agentController.createSession);
router.get('/session/:sessionId', agentController.getSessionInfo);
router.delete('/session/:sessionId', agentController.cleanupSession);

// Instruction processing
router.post('/process', agentController.processInstruction);
router.post('/process/stream', agentController.processInstructionStream);

// Browser interaction
router.get('/screenshot', agentController.getScreenshot);

export default router; 