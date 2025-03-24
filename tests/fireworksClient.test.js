/**
 * Tests for FireworksClient service
 */

import { FireworksClient } from '../src/services/fireworksClient.js';

// Set mock mode explicitly for tests
process.env.USE_MOCK = 'true';

describe('FireworksClient', () => {
  let client;

  beforeEach(() => {
    client = new FireworksClient();
  });

  test('should create a client instance', () => {
    expect(client).toBeInstanceOf(FireworksClient);
    expect(client.baseUrl).toBe('https://api.fireworks.ai/inference/v1');
    expect(client.model).toBe('accounts/fireworks/models/deepseek-r1');
  });

  test('should generate mock completions in mock mode', async () => {
    const result = await client.createChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Search for artificial intelligence news'
        }
      ]
    });

    expect(result).toBeDefined();
    expect(result.choices).toHaveLength(1);
    expect(result.choices[0].message.role).toBe('assistant');
    expect(result.choices[0].message.content).toContain('Thought:');
    expect(result.choices[0].message.content).toContain('Action:');
  });

  test('should detect MIME type from buffer', () => {
    // JPEG signature
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    expect(client.detectMimeType(jpegBuffer)).toBe('image/jpeg');

    // PNG signature
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
    expect(client.detectMimeType(pngBuffer)).toBe('image/png');

    // PDF signature
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(client.detectMimeType(pdfBuffer)).toBe('application/pdf');

    // Unknown format
    const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(client.detectMimeType(unknownBuffer)).toBe('application/octet-stream');
  });
}); 