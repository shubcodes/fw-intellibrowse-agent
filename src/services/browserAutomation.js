/**
 * Browser automation service using Browserbase Stagehand
 * Provides methods for navigating and interacting with web pages
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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
      await this.page.goto(url);
      
      const title = await this.page.title();
      const currentUrl = await this.page.url();
      
      return {
        success: true,
        title,
        url: currentUrl
      };
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
      await this.page.act(`Click on ${selector}`);
      
      return {
        success: true,
        action: 'click',
        target: selector,
        currentUrl: await this.page.url()
      };
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
      await this.page.act(`Type "${text}" into ${selector}`);
      
      return {
        success: true,
        action: 'type',
        target: selector,
        text
      };
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
      return await this.page.screenshot({
        encoding: 'binary',
        ...options
      });
    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw new Error(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * Get the HTML content of the current page
   * @returns {Promise<string>} - HTML content
   */
  async getHtml() {
    await this.ensureInitialized();
    
    try {
      return await this.page.content();
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
      const { instruction, schema } = options;
      
      return await this.page.extract({
        instruction,
        schema
      });
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
      return await this.page.observe(query);
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
    if (this.stagehand) {
      await this.stagehand.close();
      this.initialized = false;
      this.page = null;
      console.log('Browser closed');
    }
  }
} 