/**
 * API service for interacting with the IntelliBrowse agent backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export class AgentAPI {
  /**
   * Create a new agent session
   * @returns {Promise<string>} - Session ID
   */
  static async createSession() {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }
  
  /**
   * Process a user instruction
   * @param {string} instruction - User instruction
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<Object>} - Processing result
   */
  static async processInstruction(instruction, sessionId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instruction,
          sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process instruction: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing instruction:', error);
      throw error;
    }
  }
  
  /**
   * Process a user instruction with streaming
   * @param {string} instruction - User instruction
   * @param {string} sessionId - Session ID (optional)
   * @param {Function} onMessage - Callback for received messages
   * @returns {Promise<void>}
   */
  static async processInstructionStream(instruction, sessionId = null, onMessage) {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/process/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instruction,
          sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process instruction stream: ${response.status} ${response.statusText}`);
      }
      
      // Handle SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              onMessage(data);
            } catch (e) {
              console.warn('Error parsing SSE message:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing instruction stream:', error);
      throw error;
    }
  }
  
  /**
   * Get the current screenshot
   * @returns {Promise<string>} - Screenshot URL
   */
  static async getScreenshot() {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/screenshot`);
      
      if (!response.ok) {
        throw new Error(`Failed to get screenshot: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error getting screenshot:', error);
      throw error;
    }
  }
  
  /**
   * Get information about a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Session information
   */
  static async getSessionInfo(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/session/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get session info: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting session info:', error);
      throw error;
    }
  }
  
  /**
   * Clean up a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  static async cleanupSession(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/session/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cleanup session: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error cleaning up session:', error);
      throw error;
    }
  }
} 