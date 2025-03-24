/**
 * Browser automation service using Browserbase Stagehand
 * Provides methods for navigating and interacting with web pages
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Check if we should use mock implementation (for demo/testing purposes)
const USE_MOCK = process.env.USE_MOCK === 'true' || !process.env.BROWSERBASE_API_KEY;

export class BrowserAutomation {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.BROWSERBASE_API_KEY,
      projectId: config.projectId || process.env.BROWSERBASE_PROJECT_ID,
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
      modelName: config.modelName || 'gpt-4o',
      ...config
    };
    
    this.stagehand = null;
    this.page = null;
    this.initialized = false;
    
    // For mock implementation
    this.mockCurrentUrl = '';
    this.mockTitle = '';
  }

  /**
   * Initialize the browser automation
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      if (USE_MOCK) {
        console.log('Using mock browser automation implementation');
        this.initialized = true;
        this.mockCurrentUrl = 'https://www.example.com';
        this.mockTitle = 'Example Domain';
      } else {
        this.stagehand = new Stagehand({
          env: 'BROWSERBASE',
          apiKey: this.config.apiKey,
          projectId: this.config.projectId,
          modelName: this.config.modelName,
          modelClientOptions: {
            apiKey: this.config.openaiApiKey,
          },
        });
  
        await this.stagehand.init();
        this.page = this.stagehand.page;
        this.initialized = true;
      }
      console.log('Browser automation initialized successfully');
    } catch (error) {
      console.error('Error initializing browser automation:', error);
      throw new Error(`Failed to initialize browser: ${error.message}`);
    }
  }

  /**
   * Ensure the browser is initialized before performing actions
   * @throws {Error} If initialization fails
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Navigate to a URL
   * @param {string} url - URL to navigate to
   * @returns {Promise<Object>} - Page information
   */
  async open(url) {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        this.mockCurrentUrl = url;
        this.mockTitle = new URL(url).hostname.split('.')[0].charAt(0).toUpperCase() + 
                         new URL(url).hostname.split('.')[0].slice(1);
        
        return {
          success: true,
          title: this.mockTitle,
          url: this.mockCurrentUrl
        };
      } else {
        await this.page.goto(url);
        
        const title = await this.page.title();
        const currentUrl = await this.page.url();
        
        return {
          success: true,
          title,
          url: currentUrl
        };
      }
    } catch (error) {
      console.error(`Error navigating to ${url}:`, error);
      throw new Error(`Failed to navigate to ${url}: ${error.message}`);
    }
  }

  /**
   * Perform a web search
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results
   */
  async search(query) {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        this.mockCurrentUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);
        this.mockTitle = query + ' - Google Search';
        
        // Generate mock search results
        const mockResults = [
          {
            title: query + ' - Wikipedia',
            url: 'https://en.wikipedia.org/wiki/' + query.replace(/\s+/g, '_'),
            snippet: 'This is a snippet about ' + query + ' from Wikipedia.'
          },
          {
            title: 'The Latest ' + query + ' News',
            url: 'https://news.example.com/' + query.toLowerCase().replace(/\s+/g, '-'),
            snippet: 'Get the latest news about ' + query + ' from our trusted sources.'
          },
          {
            title: query + ' - Official Website',
            url: 'https://www.' + query.toLowerCase().replace(/\s+/g, '') + '.com',
            snippet: 'The official website for ' + query + '. Learn more about our products and services.'
          }
        ];
        
        return {
          success: true,
          query,
          results: mockResults
        };
      } else {
        await this.page.goto('https://www.google.com');
        await this.page.act(`Search for "${query}"`);
        
        const results = await this.page.extract({
          instruction: "Extract the search results with titles and URLs",
          schema: z.object({
            results: z.array(z.object({
              title: z.string(),
              url: z.string().url().optional(),
              snippet: z.string().optional(),
            })),
          }),
        });
        
        return {
          success: true,
          query,
          results: results.results
        };
      }
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      throw new Error(`Failed to search for "${query}": ${error.message}`);
    }
  }

  /**
   * Click on an element using natural language description
   * @param {string} selector - Natural language description of the element
   * @returns {Promise<Object>} - Result of the action
   */
  async click(selector) {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        // Simulate clicking on a link that changes URL
        if (selector.toLowerCase().includes('wikipedia')) {
          this.mockCurrentUrl = 'https://en.wikipedia.org/wiki/Main_Page';
          this.mockTitle = 'Wikipedia, the free encyclopedia';
        } else if (selector.toLowerCase().includes('news')) {
          this.mockCurrentUrl = 'https://news.example.com/';
          this.mockTitle = 'Example News';
        } else {
          // Simulate clicking a button that doesn't change URL
          console.log(`Mock clicking on "${selector}"`);
        }
        
        return {
          success: true,
          action: 'click',
          target: selector,
          currentUrl: this.mockCurrentUrl
        };
      } else {
        await this.page.act(`Click on ${selector}`);
        
        return {
          success: true,
          action: 'click',
          target: selector,
          currentUrl: await this.page.url()
        };
      }
    } catch (error) {
      console.error(`Error clicking on "${selector}":`, error);
      throw new Error(`Failed to click on "${selector}": ${error.message}`);
    }
  }

  /**
   * Type text into an element
   * @param {string} selector - Natural language description of the element
   * @param {string} text - Text to type
   * @returns {Promise<Object>} - Result of the action
   */
  async type(selector, text) {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        console.log(`Mock typing "${text}" into ${selector}`);
        
        return {
          success: true,
          action: 'type',
          target: selector,
          text
        };
      } else {
        await this.page.act(`Type "${text}" into ${selector}`);
        
        return {
          success: true,
          action: 'type',
          target: selector,
          text
        };
      }
    } catch (error) {
      console.error(`Error typing "${text}" into "${selector}":`, error);
      throw new Error(`Failed to type text: ${error.message}`);
    }
  }

  /**
   * Take a screenshot of the current page
   * @param {Object} options - Screenshot options
   * @returns {Promise<Buffer>} - Screenshot buffer
   */
  async screenshot(options = { fullPage: true }) {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        // Generate a simple mock screenshot with text
        const { createCanvas } = await import('canvas').catch(() => {
          // If canvas is not available, return a static buffer
          return {
            createCanvas: () => null
          };
        });
        
        if (createCanvas) {
          const canvas = createCanvas(800, 600);
          const ctx = canvas.getContext('2d');
          
          // Fill background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 800, 600);
          
          // Add URL bar
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, 800, 40);
          
          // Add URL text
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText(this.mockCurrentUrl, 10, 25);
          
          // Add page title
          ctx.font = '20px Arial';
          ctx.fillText(this.mockTitle, 10, 80);
          
          // Add some mock content
          ctx.font = '16px Arial';
          ctx.fillText('This is a mock screenshot for: ' + this.mockTitle, 10, 120);
          
          return canvas.toBuffer('image/png');
        } else {
          // Create a simple 1x1 transparent PNG if canvas is not available
          return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        }
      } else {
        return await this.page.screenshot({
          encoding: 'binary',
          ...options
        });
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      
      // Return a simple 1x1 transparent PNG on error
      return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    }
  }

  /**
   * Get the HTML content of the current page
   * @returns {Promise<string>} - HTML content
   */
  async getHtml() {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        return `<!DOCTYPE html>
<html>
<head>
  <title>${this.mockTitle}</title>
</head>
<body>
  <h1>${this.mockTitle}</h1>
  <p>This is a mock page for demonstration purposes.</p>
  <p>Current URL: ${this.mockCurrentUrl}</p>
</body>
</html>`;
      } else {
        return await this.page.content();
      }
    } catch (error) {
      console.error('Error getting HTML content:', error);
      throw new Error(`Failed to get HTML content: ${error.message}`);
    }
  }

  /**
   * Extract structured data from the current page
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} - Extracted data
   */
  async extractData(options) {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        // Return mock data based on the current URL
        if (this.mockCurrentUrl.includes('google.com/search')) {
          return {
            results: [
              { title: 'Mock Result 1', url: 'https://example.com/1', snippet: 'This is the first mock result.' },
              { title: 'Mock Result 2', url: 'https://example.com/2', snippet: 'This is the second mock result.' },
              { title: 'Mock Result 3', url: 'https://example.com/3', snippet: 'This is the third mock result.' }
            ]
          };
        } else if (this.mockCurrentUrl.includes('wikipedia.org')) {
          return {
            title: 'Wikipedia Article',
            content: 'This is mock content from a Wikipedia article.',
            sections: [
              { title: 'Introduction', content: 'This is the introduction section.' },
              { title: 'History', content: 'This is the history section.' }
            ]
          };
        } else {
          return {
            title: this.mockTitle,
            url: this.mockCurrentUrl,
            content: 'Mock extracted content from ' + this.mockTitle
          };
        }
      } else {
        const { instruction, schema } = options;
        
        return await this.page.extract({
          instruction,
          schema
        });
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      throw new Error(`Failed to extract data: ${error.message}`);
    }
  }

  /**
   * Get available actions on the current page
   * @param {string} query - Query about possible actions
   * @returns {Promise<Object>} - Available actions
   */
  async observe(query = "What can I do on this page?") {
    await this.ensureInitialized();
    
    try {
      if (USE_MOCK) {
        return {
          possibleActions: [
            { action: 'Click on the "About" link', selector: 'About link' },
            { action: 'Click on the "Contact" link', selector: 'Contact link' },
            { action: 'Fill out the search form', selector: 'Search form' }
          ],
          elements: [
            { type: 'link', text: 'About', href: '/about' },
            { type: 'link', text: 'Contact', href: '/contact' },
            { type: 'input', placeholder: 'Search...', type: 'text' },
            { type: 'button', text: 'Submit' }
          ]
        };
      } else {
        return await this.page.observe(query);
      }
    } catch (error) {
      console.error('Error observing page:', error);
      throw new Error(`Failed to observe page: ${error.message}`);
    }
  }

  /**
   * Close the browser
   * @returns {Promise<void>}
   */
  async close() {
    if (USE_MOCK) {
      this.initialized = false;
      console.log('Mock browser closed');
    } else if (this.stagehand) {
      await this.stagehand.close();
      this.initialized = false;
      this.page = null;
      console.log('Browser closed');
    }
  }
} 