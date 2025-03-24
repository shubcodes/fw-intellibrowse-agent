/**
 * Agent Service
 * Main orchestration service for the IntelliBrowse agent
 * Coordinates between FireworksAI, Browser Automation, and OmniParser
 */

import { FireworksClient } from '../services/fireworksClient.js';
import { BrowserAutomation } from '../services/browserAutomation.js';
import { OmniParser } from '../services/omniParser.js';
import { DocumentInliner } from '../services/documentInliner.js';
import { AgentCommunicationProtocol } from './agentCommunicationProtocol.js';
import dotenv from 'dotenv';

dotenv.config();

export class AgentService {
  constructor(config = {}) {
    // Initialize core services
    this.fireworksClient = new FireworksClient({
      apiKey: config.fireworksApiKey || process.env.FIREWORKS_API_KEY,
    });
    
    this.browserAutomation = new BrowserAutomation({
      apiKey: config.browserbaseApiKey || process.env.BROWSERBASE_API_KEY,
      projectId: config.browserbaseProjectId || process.env.BROWSERBASE_PROJECT_ID,
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
    });
    
    this.omniParser = new OmniParser({
      apiKey: config.huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY,
    });
    
    this.documentInliner = new DocumentInliner(this.fireworksClient);
    
    // Store active sessions
    this.sessions = new Map();
    
    // Initialize tool registry
    this.toolRegistry = this.initializeToolRegistry();
    
    // Flag for initialization status
    this.initialized = false;
  }

  /**
   * Initialize the tool registry with all available tools
   * @returns {Object} - Tool registry mapping tool names to functions
   */
  initializeToolRegistry() {
    return {
      // Browser automation tools
      'browser.open': async (...args) => {
        // Ensure browser is initialized before calling the method
        await this.ensureBrowserInitialized();
        return this.browserAutomation.open(...args);
      },
      'browser.search': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.search(...args);
      },
      'browser.click': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.click(...args);
      },
      'browser.type': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.type(...args);
      },
      'browser.screenshot': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.screenshot(...args);
      },
      'browser.getHtml': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.getHtml(...args);
      },
      'browser.extractData': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.extractData(...args);
      },
      'browser.observe': async (...args) => {
        await this.ensureBrowserInitialized();
        return this.browserAutomation.observe(...args);
      },
      
      // OmniParser tools
      'parser.parseScreenshot': async ({ screenshot }) => {
        // If screenshot is provided as a string, it's already been taken and is being passed through
        const screenshotBuffer = screenshot || await this.browserAutomation.screenshot();
        return this.omniParser.parseScreenshot(screenshotBuffer);
      },
      'parser.extractComponentData': async ({ parsedUi, componentType }) => {
        return this.omniParser.extractComponentData(parsedUi, componentType);
      },
      
      // Document inlining tools
      'document.analyze': async ({ document, question }) => {
        return this.documentInliner.analyzeDocument(document, question);
      },
      'document.analyzeMultiple': async ({ documents, question }) => {
        return this.documentInliner.analyzeMultipleDocuments(documents, question);
      },
      'document.compare': async ({ documentA, documentB, question }) => {
        return this.documentInliner.compareDocuments(documentA, documentB, question);
      }
    };
  }

  /**
   * Initialize all necessary services 
   * (no longer automatically called at server startup)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    // No longer initializing browser here
    // Just mark the service as initialized
    this.initialized = true;
    console.log('Agent service initialized without browser (lazy initialization)');
  }

  /**
   * Ensure browser is initialized when needed
   * @returns {Promise<void>}
   */
  async ensureBrowserInitialized() {
    try {
      if (!this.browserAutomation.initialized) {
        await this.browserAutomation.initialize();
      }
    } catch (error) {
      console.error('Error initializing browser automation on demand:', error);
      throw error;
    }
  }

  /**
   * Create a new session
   * @returns {string} - Session ID
   */
  createSession() {
    const agent = new AgentCommunicationProtocol(
      this.fireworksClient,
      this.toolRegistry
    );
    
    const sessionId = agent.getSessionId();
    this.sessions.set(sessionId, agent);
    
    return sessionId;
  }

  /**
   * Process a user instruction using the agent
   * @param {Object} options - Processing options
   * @param {string} options.sessionId - Session ID (optional, creates new session if not provided)
   * @param {string} options.instruction - User instruction
   * @returns {Promise<Object>} - Processing result
   */
  async processInstruction({ sessionId, instruction }) {
    await this.ensureInitialized();
    
    if (!instruction) {
      throw new Error('Instruction is required');
    }
    
    // Get or create agent for this session
    let agent;
    if (sessionId && this.sessions.has(sessionId)) {
      agent = this.sessions.get(sessionId);
    } else {
      agent = new AgentCommunicationProtocol(
        this.fireworksClient,
        this.toolRegistry
      );
      
      sessionId = agent.getSessionId();
      this.sessions.set(sessionId, agent);
    }
    
    // Process the instruction
    const response = await agent.processUserInstruction(instruction);
    
    return {
      sessionId,
      response
    };
  }

  /**
   * Process a user instruction with streaming responses
   * @param {Object} options - Processing options
   * @param {string} options.sessionId - Session ID (optional, creates new session if not provided)
   * @param {string} options.instruction - User instruction
   * @returns {AsyncGenerator} - Generator yielding response chunks
   */
  async *processInstructionStream({ sessionId, instruction }) {
    await this.ensureInitialized();
    
    if (!instruction) {
      throw new Error('Instruction is required');
    }
    
    // Get or create agent for this session
    let agent;
    if (sessionId && this.sessions.has(sessionId)) {
      agent = this.sessions.get(sessionId);
    } else {
      agent = new AgentCommunicationProtocol(
        this.fireworksClient,
        this.toolRegistry
      );
      
      sessionId = agent.getSessionId();
      this.sessions.set(sessionId, agent);
      
      // Yield session ID as first message
      yield {
        type: 'session',
        sessionId
      };
    }
    
    // Process the instruction with streaming
    for await (const chunk of agent.processInstructionStream(instruction)) {
      yield chunk;
    }
  }

  /**
   * Get a screenshot from the current browser session
   * @returns {Promise<Buffer>} - Screenshot buffer
   */
  async getScreenshot() {
    await this.ensureInitialized();
    await this.ensureBrowserInitialized();
    return this.browserAutomation.screenshot();
  }

  /**
   * Get information about a session
   * @param {string} sessionId - Session ID
   * @returns {Object} - Session information
   */
  getSessionInfo(sessionId) {
    if (!sessionId || !this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const agent = this.sessions.get(sessionId);
    return {
      sessionId,
      messageHistory: agent.getMessageHistory()
    };
  }

  /**
   * Ensure the agent service is initialized
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Clean up all resources for a specific session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async cleanupSession(sessionId) {
    if (sessionId && this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Clean up all resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      if (this.browserAutomation.initialized) {
        await this.browserAutomation.close();
      }
      this.sessions.clear();
      this.initialized = false;
      console.log('Agent service cleaned up');
    } catch (error) {
      console.error('Error cleaning up agent service:', error);
      throw error;
    }
  }
} 