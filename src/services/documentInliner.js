/**
 * Document Inliner service for processing and inlining documents for AI analysis
 * Specifically designed to work with Fireworks DeepSeek R1 model
 */

import dotenv from 'dotenv';

dotenv.config();

export class DocumentInliner {
  constructor(fireworksClient) {
    if (!fireworksClient) {
      throw new Error('FireworksClient is required for DocumentInliner');
    }
    this.fireworksClient = fireworksClient;
  }

  /**
   * Analyze a document or image with DeepSeek R1
   * @param {Buffer|string} document - Document buffer or URL
   * @param {string} question - Question to answer about the document
   * @returns {Promise<string>} - AI analysis
   */
  async analyzeDocument(document, question) {
    if (!document) {
      throw new Error('Document is required for analysis');
    }

    try {
      // Convert document to inline format
      const documentReference = this.prepareDocumentReference(document);
      
      // Build the prompt
      const prompt = `Analyze this document and answer the following question: ${question}\n\n${documentReference}`;
      
      // Get completion from Fireworks AI
      const response = await this.fireworksClient.createChatCompletion({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.2,
        reasoning_effort: "high"
      });
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('No response from Fireworks AI');
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple documents or images with DeepSeek R1
   * @param {Array<Buffer|string>} documents - Array of document buffers or URLs
   * @param {string} question - Question to answer about the documents
   * @returns {Promise<string>} - AI analysis
   */
  async analyzeMultipleDocuments(documents, question) {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('At least one document is required for multi-document analysis');
    }

    try {
      // Convert all documents to inline format
      const documentReferences = documents.map(doc => this.prepareDocumentReference(doc));
      
      // Build the prompt with all documents
      const prompt = `Analyze these documents and answer the following question: ${question}\n\n${documentReferences.join('\n\n')}`;
      
      // Get completion from Fireworks AI
      const response = await this.fireworksClient.createChatCompletion({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.2,
        reasoning_effort: "high"
      });
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('No response from Fireworks AI');
      }
    } catch (error) {
      console.error('Error analyzing multiple documents:', error);
      throw error;
    }
  }

  /**
   * Compare two documents and analyze their differences
   * @param {Buffer|string} documentA - First document buffer or URL
   * @param {Buffer|string} documentB - Second document buffer or URL
   * @param {string} question - Question about the comparison
   * @returns {Promise<string>} - AI analysis
   */
  async compareDocuments(documentA, documentB, question) {
    if (!documentA || !documentB) {
      throw new Error('Both documents are required for comparison');
    }

    try {
      // Convert documents to inline format
      const documentAReference = this.prepareDocumentReference(documentA);
      const documentBReference = this.prepareDocumentReference(documentB);
      
      // Build the prompt for comparison
      const prompt = `Compare these two documents and answer the following question: ${question}\n\n` +
                    `Document A:\n${documentAReference}\n\n` +
                    `Document B:\n${documentBReference}`;
      
      // Get completion from Fireworks AI
      const response = await this.fireworksClient.createChatCompletion({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4096,
        temperature: 0.2,
        reasoning_effort: "high"
      });
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      } else {
        throw new Error('No response from Fireworks AI');
      }
    } catch (error) {
      console.error('Error comparing documents:', error);
      throw error;
    }
  }

  /**
   * Prepare document reference for inlining
   * @param {Buffer|string} document - Document buffer or URL
   * @returns {string} - Prepared document reference
   */
  prepareDocumentReference(document) {
    return this.fireworksClient.prepareDocumentInlining(document);
  }
} 