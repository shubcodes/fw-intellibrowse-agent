import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import BrowserVisualization from './components/BrowserVisualization';
import { AgentAPI } from './services/agentApi';
import './styles/App.css';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [parsedElements, setParsedElements] = useState([]);
  const [currentAction, setCurrentAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize session on component mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const sessionId = await AgentAPI.createSession();
        setSessionId(sessionId);
        console.log('Session initialized:', sessionId);
      } catch (error) {
        console.error('Error initializing session:', error);
        setError('Failed to initialize session. Please try refreshing the page.');
      }
    };

    initializeSession();

    // Cleanup on component unmount
    return () => {
      if (sessionId) {
        AgentAPI.cleanupSession(sessionId)
          .then(() => console.log('Session cleaned up'))
          .catch(err => console.error('Error cleaning up session:', err));
      }
    };
  }, []);

  // Refresh screenshot periodically when action is in progress
  useEffect(() => {
    let intervalId = null;
    
    if (currentAction && currentAction.type !== 'complete') {
      // Set up interval to refresh screenshot
      intervalId = setInterval(async () => {
        try {
          const screenshotUrl = await AgentAPI.getScreenshot();
          setScreenshotUrl(screenshotUrl);
        } catch (error) {
          console.warn('Error refreshing screenshot:', error);
        }
      }, 3000); // Refresh every 3 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentAction]);

  // Handle sending messages to the agent
  const handleSendMessage = async (instruction) => {
    if (!sessionId) {
      throw new Error('Session not initialized. Please try again.');
    }

    setIsLoading(true);
    setError(null);
    
    // Reset state for new conversation
    setParsedElements([]);
    setCurrentAction(null);
    
    // Collect all assistant messages to return
    const assistantMessages = [];
    
    try {
      // Process instruction with streaming
      await AgentAPI.processInstructionStream(
        instruction, 
        sessionId,
        async (message) => {
          switch (message.type) {
            case 'session':
              // Update session ID if a new one was created
              setSessionId(message.sessionId);
              break;
              
            case 'assistant':
              // Handle thinking/reasoning messages
              assistantMessages.push({
                role: 'assistant',
                content: message.content,
                type: 'thought'
              });
              break;
              
            case 'toolCall':
              // Handle tool calls/actions
              const actionMessage = {
                role: 'assistant',
                content: `Using tool: ${message.tool} with parameters: ${JSON.stringify(message.params)}`,
                type: 'action'
              };
              assistantMessages.push(actionMessage);
              
              // Update current action
              setCurrentAction({
                type: message.tool,
                params: message.params,
                description: message.tool.includes('screenshot') ? 
                  'Taking screenshot' : `Performing ${message.tool}`
              });
              
              // Special handling for certain tools
              if (message.tool === 'browser.screenshot') {
                try {
                  const screenshotUrl = await AgentAPI.getScreenshot();
                  setScreenshotUrl(screenshotUrl);
                } catch (error) {
                  console.error('Error getting screenshot:', error);
                }
              }
              break;
              
            case 'observation':
              // Handle tool results/observations
              try {
                const parsedObservation = JSON.parse(message.content);
                
                // Check if this is a parsed UI result
                if (parsedObservation.interactableElements) {
                  setParsedElements(parsedObservation.interactableElements);
                }
                
                assistantMessages.push({
                  role: 'system',
                  content: formatObservation(parsedObservation),
                  type: 'observation'
                });
              } catch (e) {
                // Not JSON, treat as plain text
                assistantMessages.push({
                  role: 'system',
                  content: message.content,
                  type: 'observation'
                });
              }
              break;
              
            case 'complete':
              // Final response
              assistantMessages.push({
                role: 'assistant',
                content: message.content,
                type: 'response'
              });
              
              // Clear current action
              setCurrentAction(null);
              break;
              
            case 'error':
              // Handle errors
              assistantMessages.push({
                role: 'assistant',
                content: message.content,
                type: 'error'
              });
              setError(message.content);
              setCurrentAction(null);
              break;
              
            default:
              console.warn('Unknown message type:', message.type);
          }
        }
      );
      
      // Get final screenshot if not already captured
      try {
        const screenshotUrl = await AgentAPI.getScreenshot();
        setScreenshotUrl(screenshotUrl);
      } catch (error) {
        console.warn('Error getting final screenshot:', error);
      }
      
      return assistantMessages;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Format observation data for display
  const formatObservation = (data) => {
    if (typeof data === 'string') {
      return data;
    }
    
    if (data.success !== undefined) {
      // Format API responses
      return `${data.success ? 'Success' : 'Failed'}: ${JSON.stringify(data, null, 2)}`;
    } else {
      // Format complex objects
      return JSON.stringify(data, null, 2);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>IntelliBrowse</h1>
        <p>Autonomous AI Web Agent</p>
        {sessionId && <div className="session-badge">Session: {sessionId}</div>}
      </header>
      
      <main className="app-body">
        <div className="chat-panel">
          <ChatInterface onSendMessage={handleSendMessage} />
        </div>
        
        <div className="browser-panel">
          <BrowserVisualization 
            screenshotUrl={screenshotUrl}
            parsedElements={parsedElements}
            currentAction={currentAction}
          />
        </div>
      </main>
      
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
      
      <footer className="app-footer">
        <p>
          Powered by Fireworks AI (DeepSeek R1), Browserbase Stagehand, and Microsoft OmniParser
        </p>
      </footer>
    </div>
  );
}

export default App; 