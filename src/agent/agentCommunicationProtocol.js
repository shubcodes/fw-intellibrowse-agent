/**
 * Agent Communication Protocol (ACP)
 * Handles communication between the user, agent, and tools
 * Implements a ReAct pattern for reasoning and action
 */

import dotenv from 'dotenv';

dotenv.config();

export class AgentCommunicationProtocol {
  constructor(fireworksClient, toolRegistry) {
    if (!fireworksClient) {
      throw new Error('FireworksClient is required for AgentCommunicationProtocol');
    }
    
    this.fireworksClient = fireworksClient;
    this.toolRegistry = toolRegistry || {};
    this.messageHistory = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a unique session ID
   * @returns {string} - Unique session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Process a user instruction and start the agent loop
   * @param {string} instruction - User instruction
   * @returns {Promise<string>} - Final response
   */
  async processUserInstruction(instruction) {
    if (!instruction || typeof instruction !== 'string') {
      throw new Error('Instruction must be a non-empty string');
    }

    // Initialize conversation with system prompt and user instruction
    this.messageHistory = [
      {
        role: "system",
        content: this.getSystemPrompt()
      },
      {
        role: "user",
        content: instruction
      }
    ];

    // Start the reasoning-action loop
    return this.continueConversation();
  }

  /**
   * Get the system prompt for the agent
   * @returns {string} - System prompt
   */
  getSystemPrompt() {
    // Define available tools in the format expected by the model
    const toolDescriptions = Object.entries(this.toolRegistry)
      .map(([name, tool]) => {
        // Extract function documentation if available
        const docs = tool.toString().match(/\/\*\*([\s\S]*?)\*\//)?.[1] || '';
        return `Tool: ${name}\nDescription: ${docs.replace(/\*/g, '').trim()}`;
      })
      .join('\n\n');

    return `You are IntelliBrowse, an autonomous web agent. You perform web tasks by breaking them into steps.
Follow the ReAct pattern: Reason about what to do, take Actions, observe the results.

When responding, use the following format:
Thought: Think about what needs to be done and how to approach the task
Action: tool_name(param1="value1", param2="value2")
Observation: [Result of the action will appear here]
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Answer: [Final answer to the user's instruction]

Available Tools:
${toolDescriptions}

Always think through your approach before taking actions. Be thorough in your reasoning.
When you have completed the task, respond with a clear summary of what you found or accomplished.`;
  }

  /**
   * Continue the conversation loop
   * @returns {Promise<string>} - Result of the conversation
   */
  async continueConversation(maxTurns = 15) {
    let turns = 0;
    let finalResponse = null;

    while (!finalResponse && turns < maxTurns) {
      turns++;
      
      // Generate model response
      const response = await this.fireworksClient.createChatCompletion({
        model: "accounts/fireworks/models/deepseek-r1",
        messages: this.messageHistory,
        max_tokens: 4096,
        temperature: 0.2,
        reasoning_effort: "high",
        stop: ["Observation:"]
      });

      const modelResponse = response.choices[0].message.content;
      
      // Add assistant response to history
      this.messageHistory.push({
        role: "assistant",
        content: modelResponse
      });
      
      // Check for tool calls in model response
      const toolCall = this.parseToolCall(modelResponse);
      
      if (toolCall) {
        // Execute the tool and get observation
        const observation = await this.executeToolCall(toolCall);
        
        // Add observation to history
        this.messageHistory.push({
          role: "user",
          content: `Observation: ${observation}`
        });
      } else {
        // If no tool call, this is the final response
        finalResponse = modelResponse;
      }
    }

    // If we hit max turns, return the last assistant message
    if (!finalResponse) {
      const lastAssistantMessage = this.messageHistory
        .filter(msg => msg.role === 'assistant')
        .pop();
      
      finalResponse = lastAssistantMessage ? 
        lastAssistantMessage.content + "\n\n[Note: Maximum conversation turns reached]" : 
        "Maximum conversation turns reached without a final answer.";
    }

    return finalResponse;
  }

  /**
   * Process a stream of messages from the model
   * @returns {AsyncGenerator} - Generator yielding responses
   */
  async *processInstructionStream(instruction) {
    if (!instruction || typeof instruction !== 'string') {
      throw new Error('Instruction must be a non-empty string');
    }

    // Initialize conversation with system prompt and user instruction
    this.messageHistory = [
      {
        role: "system",
        content: this.getSystemPrompt()
      },
      {
        role: "user",
        content: instruction
      }
    ];

    // Maximum number of turns to prevent infinite loops
    const maxTurns = 15;
    let turns = 0;

    while (turns < maxTurns) {
      turns++;
      
      // Collect the assistant's full response
      let assistantResponse = '';
      
      // Stream the model's response
      for await (const chunk of this.fireworksClient.createChatCompletionStream({
        model: "accounts/fireworks/models/deepseek-r1",
        messages: this.messageHistory,
        max_tokens: 4096,
        temperature: 0.2,
        reasoning_effort: "high",
        stop: ["Observation:"]
      })) {
        if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
          const content = chunk.choices[0].delta.content;
          assistantResponse += content;
          yield {
            type: 'assistant',
            content
          };
        }
      }
      
      // Add assistant response to history
      this.messageHistory.push({
        role: "assistant",
        content: assistantResponse
      });
      
      // Check for tool calls in assistant response
      const toolCall = this.parseToolCall(assistantResponse);
      
      if (toolCall) {
        try {
          // Execute the tool
          yield {
            type: 'toolCall',
            tool: toolCall.toolName,
            params: toolCall.params
          };
          
          const observation = await this.executeToolCall(toolCall);
          
          // Add observation to history
          this.messageHistory.push({
            role: "user",
            content: `Observation: ${observation}`
          });
          
          yield {
            type: 'observation',
            content: observation
          };
        } catch (error) {
          // Handle tool execution error
          const errorMsg = `Error executing tool ${toolCall.toolName}: ${error.message}`;
          
          this.messageHistory.push({
            role: "user",
            content: `Observation: ${errorMsg}`
          });
          
          yield {
            type: 'error',
            content: errorMsg
          };
        }
      } else {
        // If no tool call, this is the final response
        yield {
          type: 'complete',
          content: assistantResponse
        };
        break;
      }
    }

    if (turns >= maxTurns) {
      yield {
        type: 'error',
        content: 'Maximum conversation turns reached.'
      };
    }
  }

  /**
   * Parse a tool call from the model's response
   * @param {string} response - Model response text
   * @returns {Object|null} - Parsed tool call or null
   */
  parseToolCall(response) {
    // Extract tool call from response text using regex
    // Format: "Action: tool_name(param1="value1", param2="value2")"
    const actionMatch = response.match(/Action:\s*(\w+(\.\w+)?)\(([^)]*)\)/);
    if (!actionMatch) return null;
    
    const toolName = actionMatch[1];
    const paramsString = actionMatch[3];
    
    // Parse parameters
    const params = {};
    // Use regex to handle nested quotes properly
    const paramMatches = paramsString.matchAll(/(\w+)="((?:[^"\\]|\\.)*)"/g);
    for (const match of paramMatches) {
      // Unescape any escaped quotes in the parameter values
      params[match[1]] = match[2].replace(/\\"/g, '"');
    }
    
    return { toolName, params };
  }

  /**
   * Execute a tool call and return the observation
   * @param {Object} toolCall - Tool call object
   * @returns {Promise<string>} - Tool execution result
   */
  async executeToolCall({ toolName, params }) {
    // Look up the tool in the registry
    const tool = this.toolRegistry[toolName];
    if (!tool) {
      return `Error: Tool "${toolName}" not found. Available tools are: ${Object.keys(this.toolRegistry).join(', ')}`;
    }
    
    try {
      // Execute the tool with parameters
      const result = await tool(params);
      return typeof result === 'object' ? JSON.stringify(result) : String(result);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return `Error executing tool ${toolName}: ${error.message}`;
    }
  }

  /**
   * Get the current conversation history
   * @returns {Array} - Message history
   */
  getMessageHistory() {
    return [...this.messageHistory];
  }

  /**
   * Get the current session ID
   * @returns {string} - Session ID
   */
  getSessionId() {
    return this.sessionId;
  }
} 