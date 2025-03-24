/**
 * Service for parsing screenshots into structured data using Microsoft's OmniParser
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

export class OmniParser {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.HUGGINGFACE_API_KEY,
      apiEndpoint: config.apiEndpoint || 'https://api-inference.huggingface.co/models/microsoft/OmniParser',
      ...config
    };
  }

  /**
   * Parse a screenshot into structured UI elements
   * @param {Buffer} screenshot - The screenshot buffer
   * @returns {Promise<Object>} - Structured UI data
   */
  async parseScreenshot(screenshot) {
    if (!Buffer.isBuffer(screenshot)) {
      throw new Error('Screenshot must be a buffer');
    }

    try {
      const formData = new FormData();
      formData.append('image', screenshot, { filename: 'screenshot.png' });
      
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OmniParser API error: ${error || response.statusText}`);
      }
      
      const result = await response.json();
      return this.transformResult(result);
    } catch (error) {
      console.error('Error parsing screenshot with OmniParser:', error);
      throw error;
    }
  }

  /**
   * Transform raw OmniParser output into a standardized format
   * @param {Object} rawResult - The raw parser output
   * @returns {Object} - Standardized UI element data
   */
  transformResult(rawResult) {
    // Example transformation from raw output to structured format
    return {
      interactableElements: (rawResult.elements || []).map(elem => ({
        id: elem.id || `element-${Math.random().toString(36).substr(2, 9)}`,
        type: elem.type || 'unknown',
        text: elem.text || '',
        boundingBox: elem.bbox || { x: 0, y: 0, width: 0, height: 0 },
        isInteractable: elem.is_interactable || false,
        confidence: elem.confidence || 0,
        description: elem.functional_description || '',
      })),
      textElements: (rawResult.text_regions || []).map(region => ({
        id: region.id || `text-${Math.random().toString(36).substr(2, 9)}`,
        text: region.text || '',
        boundingBox: region.bbox || { x: 0, y: 0, width: 0, height: 0 },
        confidence: region.confidence || 0,
      })),
      visualHierarchy: rawResult.visual_hierarchy || {},
    };
  }
  
  /**
   * Extract structured data from a specific UI component
   * @param {Object} parsedUi - Previously parsed UI
   * @param {string} componentType - Type of component to extract (table, form, list)
   * @returns {Object} - Extracted data
   */
  extractComponentData(parsedUi, componentType) {
    // Extract specific data based on component type
    switch (componentType.toLowerCase()) {
      case 'table':
        return this.extractTableData(parsedUi);
      case 'form':
        return this.extractFormData(parsedUi);
      case 'list':
        return this.extractListData(parsedUi);
      default:
        return parsedUi;
    }
  }
  
  /**
   * Extract table data from parsed UI
   * @param {Object} parsedUi - Previously parsed UI
   * @returns {Object} - Extracted table data
   */
  extractTableData(parsedUi) {
    const tableElements = parsedUi.interactableElements.filter(elem => 
      elem.type === 'table' || elem.description.toLowerCase().includes('table')
    );
    
    // Find text elements that might be part of tables
    const potentialTableCells = parsedUi.textElements.filter(text => {
      // Check if text element is within any table element bounds
      return tableElements.some(table => {
        const tableBounds = table.boundingBox;
        const textBounds = text.boundingBox;
        
        return (
          textBounds.x >= tableBounds.x &&
          textBounds.y >= tableBounds.y &&
          textBounds.x + textBounds.width <= tableBounds.x + tableBounds.width &&
          textBounds.y + textBounds.height <= tableBounds.y + tableBounds.height
        );
      });
    });
    
    // Group cells into rows based on Y position
    const rows = {};
    potentialTableCells.forEach(cell => {
      const centerY = cell.boundingBox.y + (cell.boundingBox.height / 2);
      const rowKey = Math.round(centerY / 10) * 10; // Group within 10px
      
      if (!rows[rowKey]) {
        rows[rowKey] = [];
      }
      
      rows[rowKey].push(cell);
    });
    
    // Sort rows by Y position and cells within rows by X position
    const sortedRows = Object.entries(rows)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([_, cells]) => cells.sort((a, b) => a.boundingBox.x - b.boundingBox.x));
    
    // Extract text from cells
    const tableData = sortedRows.map(row => row.map(cell => cell.text));
    
    return {
      type: 'table',
      data: tableData,
      rawElements: {
        tableElements,
        potentialTableCells
      }
    };
  }
  
  /**
   * Extract form data from parsed UI
   * @param {Object} parsedUi - Previously parsed UI
   * @returns {Object} - Extracted form data
   */
  extractFormData(parsedUi) {
    const formElements = parsedUi.interactableElements.filter(elem => 
      elem.type === 'input' || 
      elem.type === 'button' || 
      elem.type === 'select' ||
      elem.type === 'checkbox' ||
      elem.type === 'radio'
    );
    
    // Group by possible form groups
    let formGroups = [];
    
    // Try to find the main form container
    const formContainer = parsedUi.interactableElements.find(elem => 
      elem.type === 'form' || elem.description.toLowerCase().includes('form')
    );
    
    if (formContainer) {
      // If we found a container, filter elements inside it
      const elementsInForm = formElements.filter(elem => {
        const formBounds = formContainer.boundingBox;
        const elemBounds = elem.boundingBox;
        
        return (
          elemBounds.x >= formBounds.x &&
          elemBounds.y >= formBounds.y &&
          elemBounds.x + elemBounds.width <= formBounds.x + formBounds.width &&
          elemBounds.y + elemBounds.height <= formBounds.y + formBounds.height
        );
      });
      
      formGroups.push({
        id: formContainer.id,
        description: formContainer.description || 'Form',
        elements: elementsInForm
      });
    } else {
      // Otherwise, try to group elements that are close to each other
      formGroups.push({
        id: 'default-form',
        description: 'Default Form',
        elements: formElements
      });
    }
    
    return {
      type: 'form',
      forms: formGroups.map(group => ({
        id: group.id,
        description: group.description,
        fields: group.elements.map(elem => ({
          id: elem.id,
          type: elem.type,
          label: this.findLabelForElement(elem, parsedUi.textElements),
          boundingBox: elem.boundingBox,
          isInteractable: elem.isInteractable,
          description: elem.description,
        }))
      }))
    };
  }
  
  /**
   * Extract list data from parsed UI
   * @param {Object} parsedUi - Previously parsed UI
   * @returns {Object} - Extracted list data
   */
  extractListData(parsedUi) {
    // Try to find list containers
    const listContainers = parsedUi.interactableElements.filter(elem => 
      elem.type === 'list' || 
      elem.type === 'ul' || 
      elem.type === 'ol' ||
      elem.description.toLowerCase().includes('list')
    );
    
    const lists = [];
    
    if (listContainers.length > 0) {
      // For each list container, find elements inside it
      listContainers.forEach(container => {
        const containerBounds = container.boundingBox;
        
        // Find text elements or list items inside the container
        const listItems = parsedUi.textElements
          .filter(text => {
            const textBounds = text.boundingBox;
            
            return (
              textBounds.x >= containerBounds.x &&
              textBounds.y >= containerBounds.y &&
              textBounds.x + textBounds.width <= containerBounds.x + containerBounds.width &&
              textBounds.y + textBounds.height <= containerBounds.y + containerBounds.height
            );
          })
          // Sort by Y position
          .sort((a, b) => a.boundingBox.y - b.boundingBox.y);
        
        lists.push({
          id: container.id,
          description: container.description || 'List',
          items: listItems.map(item => item.text)
        });
      });
    } else {
      // Try to identify lists without explicit containers
      // Look for text elements with similar X positions, similar heights, and consistent spacing
      const potentialListItems = this.findPotentialListItems(parsedUi.textElements);
      
      if (potentialListItems.length > 0) {
        lists.push({
          id: 'inferred-list',
          description: 'Inferred List',
          items: potentialListItems.map(item => item.text)
        });
      }
    }
    
    return {
      type: 'list',
      lists
    };
  }
  
  /**
   * Find potential list items among text elements
   * @param {Array} textElements - Text elements from parsed UI
   * @returns {Array} - Potential list item elements
   */
  findPotentialListItems(textElements) {
    if (textElements.length < 2) {
      return [];
    }
    
    // Group elements by similar X position
    const xPositionGroups = {};
    textElements.forEach(elem => {
      const xBucket = Math.round(elem.boundingBox.x / 20) * 20; // Group within 20px
      
      if (!xPositionGroups[xBucket]) {
        xPositionGroups[xBucket] = [];
      }
      
      xPositionGroups[xBucket].push(elem);
    });
    
    // Find the largest group of elements at similar X position
    let largestGroup = [];
    for (const group of Object.values(xPositionGroups)) {
      if (group.length > largestGroup.length) {
        largestGroup = group;
      }
    }
    
    // If we found at least 3 elements, check for consistent spacing
    if (largestGroup.length >= 3) {
      // Sort by Y position
      largestGroup.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
      
      // Check for consistent spacing
      const spacings = [];
      for (let i = 1; i < largestGroup.length; i++) {
        const spacing = largestGroup[i].boundingBox.y - 
          (largestGroup[i-1].boundingBox.y + largestGroup[i-1].boundingBox.height);
        spacings.push(spacing);
      }
      
      // Calculate average spacing
      const avgSpacing = spacings.reduce((sum, val) => sum + val, 0) / spacings.length;
      
      // Check if spacings are consistent (within 30% of average)
      const consistentSpacing = spacings.every(spacing => 
        Math.abs(spacing - avgSpacing) <= 0.3 * avgSpacing
      );
      
      if (consistentSpacing) {
        return largestGroup;
      }
    }
    
    return [];
  }
  
  /**
   * Find a label for a form element by looking for nearby text
   * @param {Object} element - The form element
   * @param {Array} textElements - Text elements from parsed UI
   * @returns {string} - The label text
   */
  findLabelForElement(element, textElements) {
    const elemBounds = element.boundingBox;
    
    // Calculate element center
    const centerX = elemBounds.x + (elemBounds.width / 2);
    const centerY = elemBounds.y + (elemBounds.height / 2);
    
    // Find text elements close to the element (prioritize left and above)
    const candidates = textElements
      .filter(text => {
        const textBounds = text.boundingBox;
        const textCenterX = textBounds.x + (textBounds.width / 2);
        const textCenterY = textBounds.y + (textBounds.height / 2);
        
        // Calculate distance between centers
        const distance = Math.sqrt(
          Math.pow(centerX - textCenterX, 2) + 
          Math.pow(centerY - textCenterY, 2)
        );
        
        // Only consider elements within reasonable distance
        return distance < 100;
      })
      .map(text => ({
        text,
        distance: this.calculateLabelDistance(element, text)
      }))
      .sort((a, b) => a.distance - b.distance);
    
    return candidates.length > 0 ? candidates[0].text.text : '';
  }
  
  /**
   * Calculate a weighted distance score for label candidates
   * @param {Object} element - The form element
   * @param {Object} textElement - Potential label text element
   * @returns {number} - Weighted distance score (lower is better)
   */
  calculateLabelDistance(element, textElement) {
    const elemBounds = element.boundingBox;
    const textBounds = textElement.boundingBox;
    
    // Calculate centers
    const elemCenterX = elemBounds.x + (elemBounds.width / 2);
    const elemCenterY = elemBounds.y + (elemBounds.height / 2);
    const textCenterX = textBounds.x + (textBounds.width / 2);
    const textCenterY = textBounds.y + (textBounds.height / 2);
    
    // Calculate Euclidean distance
    const physicalDistance = Math.sqrt(
      Math.pow(elemCenterX - textCenterX, 2) + 
      Math.pow(elemCenterY - textCenterY, 2)
    );
    
    // Apply position weights (prefer labels to the left or above)
    let positionWeight = 1;
    
    // Left of element
    if (textBounds.x + textBounds.width < elemBounds.x) {
      positionWeight = 0.5;
    } 
    // Above element
    else if (textBounds.y + textBounds.height < elemBounds.y) {
      positionWeight = 0.7;
    }
    // Right of element (less likely to be a label)
    else if (textBounds.x > elemBounds.x + elemBounds.width) {
      positionWeight = 1.5;
    }
    // Below element (least likely to be a label)
    else if (textBounds.y > elemBounds.y + elemBounds.height) {
      positionWeight = 2;
    }
    
    return physicalDistance * positionWeight;
  }
} 