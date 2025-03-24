/**
 * Service for interacting with the Fireworks AI API
 * Specifically designed for the DeepSeek R1 model
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

export class FireworksClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.FIREWORKS_API_KEY;
    this.baseUrl = 'https://api.fireworks.ai/inference/v1';
    this.model = 'accounts/fireworks/models/deepseek-r1';
  }

  /**
   * Get chat completions from the Fireworks API
   * @param {Object} options - Chat completion options
   * @returns {Promise<Object>} - Chat completion response
   */
  async createChatCompletion(options) {
    const defaultOptions = {
      model: this.model,
      max_tokens: 4096,
      temperature: 0.2,
      reasoning_effort: "high",
      stop: null
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestOptions)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Fireworks API error: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Fireworks API:', error);
      throw error;
    }
  }

  /**
   * Get chat completions with streaming
   * @param {Object} options - Chat completion options
   * @returns {AsyncGenerator} - Generator yielding response chunks
   */
  async *createChatCompletionStream(options) {
    const defaultOptions = {
      model: this.model,
      max_tokens: 4096,
      temperature: 0.2,
      reasoning_effort: "high",
      stream: true,
      stop: null
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestOptions)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Fireworks API error: ${error.message || response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              console.warn('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from Fireworks API:', error);
      throw error;
    }
  }

  /**
   * Helper to prepare inline document URL
   * @param {Buffer|string} document - Document buffer or URL
   * @returns {string} - Prepared document reference for inlining
   */
  prepareDocumentInlining(document) {
    if (typeof document === 'string' && document.startsWith('http')) {
      // URL with inline transform
      return `${document}#transform=inline`;
    } else if (Buffer.isBuffer(document)) {
      // Convert buffer to base64
      const base64Data = document.toString('base64');
      const mimeType = this.detectMimeType(document);
      return `data:${mimeType};base64,${base64Data}#transform=inline`;
    } else {
      throw new Error('Document must be a URL or buffer');
    }
  }

  /**
   * Detect MIME type from buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string} - MIME type
   */
  detectMimeType(buffer) {
    // Simple MIME type detection based on file signatures
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return 'image/jpeg';
    } else if (
      buffer[0] === 0x89 && buffer[1] === 0x50 && 
      buffer[2] === 0x4E && buffer[3] === 0x47
    ) {
      return 'image/png';
    } else if (
      buffer[0] === 0x25 && buffer[1] === 0x50 && 
      buffer[2] === 0x44 && buffer[3] === 0x46
    ) {
      return 'application/pdf';
    }
    
    // Default
    return 'application/octet-stream';
  }
} 