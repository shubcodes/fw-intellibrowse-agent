import React, { useEffect, useRef, useState } from 'react';
import '../styles/BrowserVisualization.css';

const BrowserVisualization = ({ screenshotUrl, parsedElements, currentAction }) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Draw the screenshot and elements on the canvas
  useEffect(() => {
    if (screenshotUrl && canvasRef.current) {
      setIsLoading(true);
      setError(null);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        // Resize canvas to match image
        canvas.width = img.width;
        canvas.height = img.height;
        setCanvasSize({ width: img.width, height: img.height });
        
        // Draw screenshot
        ctx.drawImage(img, 0, 0);
        
        // Draw parsed elements if available
        if (parsedElements && parsedElements.length > 0) {
          drawParsedElements(ctx, parsedElements);
        }
        
        // Highlight current action if applicable
        if (currentAction && currentAction.targetElement) {
          highlightActionTarget(ctx, currentAction);
        }
        
        setIsLoading(false);
      };
      
      img.onerror = () => {
        setIsLoading(false);
        setError('Failed to load screenshot');
      };
      
      img.src = screenshotUrl;
    }
  }, [screenshotUrl, parsedElements, currentAction]);

  // Draw parsed elements on the canvas
  const drawParsedElements = (ctx, elements) => {
    elements.forEach(element => {
      const { x, y, width, height, type } = element.boundingBox;
      
      // Different highlight colors based on element type
      switch (type) {
        case 'button':
          ctx.strokeStyle = '#FF5722';
          break;
        case 'input':
          ctx.strokeStyle = '#2196F3';
          break;
        case 'link':
          ctx.strokeStyle = '#4CAF50';
          break;
        default:
          ctx.strokeStyle = '#9C27B0';
      }
      
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Add label
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '12px Arial';
      ctx.fillText(element.description || element.text || type, x, y - 5);
    });
  };

  // Highlight the target of the current action
  const highlightActionTarget = (ctx, action) => {
    const { x, y, width, height } = action.targetElement.boundingBox;
    
    // Draw highlight rectangle
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Draw label for the action
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(action.description || 'Current Action', x, y - 10);
  };

  // Handle canvas click to identify elements
  const handleCanvasClick = (e) => {
    if (!parsedElements || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate click position relative to the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Find clicked element
    const clickedElement = parsedElements.find(element => {
      const { boundingBox } = element;
      return (
        x >= boundingBox.x &&
        y >= boundingBox.y &&
        x <= boundingBox.x + boundingBox.width &&
        y <= boundingBox.y + boundingBox.height
      );
    });
    
    if (clickedElement) {
      // Show element details
      alert(`Element: ${clickedElement.type}
Text: ${clickedElement.text || 'N/A'}
Description: ${clickedElement.description || 'N/A'}
Interactable: ${clickedElement.isInteractable ? 'Yes' : 'No'}`);
    }
  };

  return (
    <div className="browser-visualization">
      <div className="visualization-header">
        {currentAction && (
          <div className="current-action">
            <strong>Current Action:</strong> {currentAction.type} - {currentAction.description}
          </div>
        )}
      </div>
      
      <div className="screenshot-container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading screenshot...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {!screenshotUrl && !isLoading && !error && (
          <div className="empty-state">
            <p>No screenshot available yet.</p>
            <p>The browser view will appear here once the agent starts browsing.</p>
          </div>
        )}
        
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasClick}
          className={isLoading ? 'loading' : ''}
        />
      </div>
      
      <div className="visualization-footer">
        <div className="canvas-info">
          {canvasSize.width > 0 && (
            <span>Screenshot dimensions: {canvasSize.width} x {canvasSize.height}</span>
          )}
        </div>
        <div className="visualization-hint">
          <small>Click on highlighted elements to see details</small>
        </div>
      </div>
    </div>
  );
};

export default BrowserVisualization; 