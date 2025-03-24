import React, { useState, useEffect, useRef } from 'react';
import '../styles/ChatInterface.css';

const ChatInterface = ({ onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and set loading state
    setInput('');
    setIsLoading(true);
    
    try {
      // Send message to the agent
      const response = await onSendMessage(input);
      
      // Parse and add agent messages to chat
      if (response && Array.isArray(response)) {
        setMessages(prev => [...prev, ...response]);
      } else if (response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response,
          type: 'response'
        }]);
      }
    } catch (error) {
      // Handle error
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}`,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle streaming messages
  const addStreamingMessage = (message) => {
    setMessages(prev => {
      // Check if we already have a message of this type in progress
      const index = prev.findIndex(msg => 
        msg.role === 'assistant' && 
        msg.type === message.type &&
        msg.streaming === true
      );
      
      if (index >= 0) {
        // Update existing streaming message
        const updatedMessages = [...prev];
        updatedMessages[index] = {
          ...updatedMessages[index],
          content: updatedMessages[index].content + message.content,
          streaming: message.type !== 'complete' // Mark as not streaming when complete
        };
        return updatedMessages;
      } else {
        // Add new streaming message
        return [...prev, {
          role: 'assistant',
          content: message.content,
          type: message.type,
          streaming: message.type !== 'complete'
        }];
      }
    });
  };

  // Render message based on role and type
  const renderMessage = (message, index) => {
    // Determine message class
    const messageClass = `message ${message.role} ${message.type || ''}`;
    
    // Render different message types
    switch (message.role) {
      case 'user':
        return (
          <div key={index} className={messageClass}>
            <div className="avatar user">You</div>
            <div className="message-content">{message.content}</div>
          </div>
        );
      
      case 'assistant':
        // Different rendering based on message type
        if (message.type === 'thought') {
          return (
            <div key={index} className={messageClass}>
              <div className="avatar assistant">🤔</div>
              <div className="message-content">
                <div className="message-type">Thinking</div>
                <div>{message.content}</div>
              </div>
            </div>
          );
        } else if (message.type === 'action') {
          return (
            <div key={index} className={messageClass}>
              <div className="avatar assistant">🔧</div>
              <div className="message-content">
                <div className="message-type">Action</div>
                <div>{message.content}</div>
              </div>
            </div>
          );
        } else if (message.type === 'error') {
          return (
            <div key={index} className={messageClass}>
              <div className="avatar assistant">❌</div>
              <div className="message-content">
                <div className="message-type">Error</div>
                <div>{message.content}</div>
              </div>
            </div>
          );
        } else {
          return (
            <div key={index} className={messageClass}>
              <div className="avatar assistant">IntelliBrowse</div>
              <div className="message-content">{message.content}</div>
            </div>
          );
        }
      
      case 'system':
        return (
          <div key={index} className={messageClass}>
            <div className="avatar system">🔍</div>
            <div className="message-content">
              <div className="message-type">Observation</div>
              <div>{message.content}</div>
            </div>
          </div>
        );
      
      default:
        return (
          <div key={index} className={messageClass}>
            <div className="message-content">{message.content}</div>
          </div>
        );
    }
  };

  return (
    <div className="chat-interface">
      <div className="message-list">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h2>Welcome to IntelliBrowse!</h2>
            <p>Your AI-powered web assistant. Ask me to perform web tasks for you.</p>
            <div className="example-prompts">
              <h3>Example tasks:</h3>
              <ul>
                <li>"Search for the latest news about artificial intelligence"</li>
                <li>"Find the best-rated Italian restaurants in San Francisco"</li>
                <li>"Go to twitter.com and check the trending topics"</li>
                <li>"Visit amazon.com and find the best-selling books in science fiction"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="avatar assistant">IntelliBrowse</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Enter a web task instruction..."
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={isLoading || !input.trim()}
          className={`send-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? 'Working...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface; 