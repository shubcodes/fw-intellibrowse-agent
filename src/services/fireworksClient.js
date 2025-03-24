/**
 * Service for interacting with the Fireworks AI API
 * Specifically designed for the DeepSeek R1 model
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Check if we should use mock implementation
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.FIREWORKS_API_KEY;

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
      if (USE_MOCK) {
        console.log('Using mock FireworksAI implementation');
        return this.generateMockCompletion(requestOptions);
      }

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
      
      if (USE_MOCK) {
        return this.generateMockCompletion(requestOptions);
      }
      
      throw error;
    }
  }

  /**
   * Generate a mock completion response for demo purposes
   * @param {Object} options - Chat completion options
   * @returns {Object} - Mock completion response
   */
  generateMockCompletion(options) {
    // Extract the latest user message
    const userMessage = options.messages.find(m => m.role === 'user')?.content || '';
    
    // Generate response based on user message content
    let responseContent = '';
    
    if (userMessage.toLowerCase().includes('search')) {
      responseContent = `Thought: I need to search for information on the web.
Action: browser.search(query="artificial intelligence news")`;
    } else if (userMessage.toLowerCase().includes('navigate') || userMessage.toLowerCase().includes('go to')) {
      responseContent = `Thought: I need to navigate to a specific website.
Action: browser.open(url="https://www.example.com")`;
    } else if (userMessage.toLowerCase().includes('click')) {
      responseContent = `Thought: I need to click on an element on the page.
Action: browser.click(selector="Sign in button")`;
    } else if (userMessage.toLowerCase().includes('type') || userMessage.toLowerCase().includes('enter')) {
      responseContent = `Thought: I need to enter some text into a field.
Action: browser.type(selector="Email field", text="example@example.com")`;
    } else if (userMessage.toLowerCase().includes('screenshot')) {
      responseContent = `Thought: I need to take a screenshot of the current page.
Action: browser.screenshot()`;
    } else {
      responseContent = `Thought: I need to understand what the user wants me to do.
I think the user is asking me to perform a web task. Let me break it down into steps.

First, I'll need to search for some information.
Action: browser.search(query="example search query")`;
    }
    
    return {
      id: 'mock-completion-' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: responseContent.length / 4, // Rough approximation
        total_tokens: 100 + (responseContent.length / 4)
      }
    };
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
      if (USE_MOCK) {
        console.log('Using mock FireworksAI streaming implementation');
        yield* this.generateMockCompletionStream(requestOptions);
        return;
      }

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
      
      if (USE_MOCK) {
        yield* this.generateMockCompletionStream(requestOptions);
        return;
      }
      
      throw error;
    }
  }

  /**
   * Generate a mock streaming completion for demo purposes
   * @param {Object} options - Chat completion options
   * @returns {AsyncGenerator} - Generator yielding mock response chunks
   */
  async *generateMockCompletionStream(options) {
    // Extract the latest user message
    const userMessage = options.messages.find(m => m.role === 'user')?.content || '';
    
    // Generate response based on user message content
    let responseContent = '';
    
    if (userMessage.toLowerCase().includes('search')) {
      responseContent = `Thought: I need to search for information on the web.
Action: browser.search(query="artificial intelligence news")`;
    } else if (userMessage.toLowerCase().includes('navigate') || userMessage.toLowerCase().includes('go to')) {
      responseContent = `Thought: I need to navigate to a specific website.
Action: browser.open(url="https://www.example.com")`;
    } else if (userMessage.toLowerCase().includes('click')) {
      responseContent = `Thought: I need to click on an element on the page.
Action: browser.click(selector="Sign in button")`;
    } else if (userMessage.toLowerCase().includes('type') || userMessage.toLowerCase().includes('enter')) {
      responseContent = `Thought: I need to enter some text into a field.
Action: browser.type(selector="Email field", text="example@example.com")`;
    } else if (userMessage.toLowerCase().includes('screenshot')) {
      responseContent = `Thought: I need to take a screenshot of the current page.
Action: browser.screenshot()`;
    } else {
      responseContent = `Thought: I need to understand what the user wants me to do.
I think the user is asking me to perform a web task. Let me break it down into steps.

First, I'll need to search for some information.
Action: browser.search(query="example search query")`;
    }
    
    // Split response into chunks for streaming simulation
    const chunks = responseContent.split(/(?<=\n)/);
    
    for (let i = 0; i < chunks.length; i++) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      yield {
        id: 'mock-stream-' + Date.now(),
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: this.model,
        choices: [
          {
            index: 0,
            delta: {
              role: i === 0 ? 'assistant' : undefined,
              content: chunks[i]
            },
            finish_reason: i === chunks.length - 1 ? 'stop' : null
          }
        ]
      };
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