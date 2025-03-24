/**
 * Agent Controller
 * Handles HTTP endpoints for agent operations
 */

import { AgentService } from '../agent/agentService.js';

// Create singleton instance
const agentService = new AgentService();

export const agentController = {
  /**
   * Create a new agent session
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async createSession(req, res) {
    try {
      // Initialize agent if needed
      await agentService.ensureInitialized();
      
      // Create new session
      const sessionId = agentService.createSession();
      
      res.status(200).json({
        success: true,
        sessionId
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Process a user instruction
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async processInstruction(req, res) {
    try {
      const { sessionId, instruction } = req.body;
      
      if (!instruction) {
        return res.status(400).json({
          success: false,
          error: 'Instruction is required'
        });
      }
      
      const result = await agentService.processInstruction({
        sessionId,
        instruction
      });
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error processing instruction:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Process a user instruction with streaming responses
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async processInstructionStream(req, res) {
    try {
      const { sessionId, instruction } = req.body;
      
      if (!instruction) {
        return res.status(400).json({
          success: false,
          error: 'Instruction is required'
        });
      }
      
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // Handle client disconnect
      req.on('close', () => {
        console.log('Client closed connection');
      });
      
      // Process instruction with streaming
      for await (const chunk of agentService.processInstructionStream({
        sessionId,
        instruction
      })) {
        // Format as SSE
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        
        // If this is the final chunk, end the stream
        if (chunk.type === 'complete' || chunk.type === 'error') {
          res.end();
          break;
        }
      }
    } catch (error) {
      console.error('Error processing instruction stream:', error);
      // Send error as SSE event
      res.write(`data: ${JSON.stringify({
        type: 'error',
        content: error.message
      })}\n\n`);
      res.end();
    }
  },
  
  /**
   * Get a screenshot from the current browser session
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getScreenshot(req, res) {
    try {
      const screenshot = await agentService.getScreenshot();
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', screenshot.length);
      res.send(screenshot);
    } catch (error) {
      console.error('Error getting screenshot:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get information about a session
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getSessionInfo(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      const sessionInfo = agentService.getSessionInfo(sessionId);
      
      res.status(200).json({
        success: true,
        ...sessionInfo
      });
    } catch (error) {
      console.error('Error getting session info:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Clean up a session
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async cleanupSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      await agentService.cleanupSession(sessionId);
      
      res.status(200).json({
        success: true,
        message: `Session ${sessionId} cleaned up`
      });
    } catch (error) {
      console.error('Error cleaning up session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}; 