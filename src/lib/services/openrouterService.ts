/**
 * OpenRouter Service
 * 
 * Handles AI flashcard generation via OpenRouter.ai API
 * Default model: anthropic/claude-3-5-sonnet
 * 
 * Features:
 * - Structured prompt for flashcard generation
 * - JSON response parsing
 * - Token usage tracking
 * - Timeout handling (30 seconds)
 * - Retry logic (2 attempts)
 */

import { logError } from '../utils/errorLogger';

/**
 * Generated flashcard from AI (with temporary ID)
 */
export interface GeneratedCard {
  id: string; // Temporary UUID
  front: string;
  back: string;
}

/**
 * AI generation result
 */
export interface GenerationResult {
  cards: GeneratedCard[];
  tokensUsed: number;
  timeMs: number;
}

/**
 * System prompt for AI flashcard generation
 * Instructs the AI to generate high-quality question-answer pairs
 */
const SYSTEM_PROMPT = `You are a flashcard generation assistant. Your task is to generate high-quality question-answer pairs from the provided text.

Guidelines:
- Generate 5-10 flashcards from the input text
- Questions (front) should be clear, concise, and specific (max 200 characters)
- Answers (back) should be complete but not overly verbose (max 500 characters)
- Focus on key concepts, facts, definitions, and relationships
- Avoid ambiguous or trick questions
- Ensure answers are self-contained and don't require external context
- Use simple, direct language

Return ONLY a valid JSON array with this exact format:
[
  {"front": "question text", "back": "answer text"},
  {"front": "question text", "back": "answer text"}
]

Do NOT include any markdown formatting, code blocks, explanations, or additional text.
Return ONLY the raw JSON array.`;

/**
 * Generates flashcards from text using OpenRouter.ai API
 * 
 * @param inputText - User's input text (1000-10000 chars)
 * @param model - AI model to use (default: claude-3-5-sonnet)
 * @returns Generated cards with metadata
 * @throws Error if API call fails, times out, or returns invalid JSON
 */
export async function generateFlashcardsWithAI(
  inputText: string,
  model: string = 'anthropic/claude-3-5-sonnet'
): Promise<GenerationResult> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const startTime = Date.now();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

    // Call OpenRouter.ai API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://10xcards.app', // Optional: for OpenRouter analytics
        'X-Title': '10xCards' // Optional: for OpenRouter analytics
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: inputText }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logError('OpenRouter API error', new Error(errorText), {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract generated text
    const generatedText = data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response (strip any markdown formatting if present)
    let cardsJson: Array<{ front: string; back: string }>;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       generatedText.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : generatedText;
      
      cardsJson = JSON.parse(jsonString.trim());
    } catch (parseError) {
      logError('Failed to parse AI response as JSON', parseError, {
        response: generatedText.substring(0, 500) // Log first 500 chars
      });
      throw new Error('AI returned invalid JSON format');
    }

    // Validate response structure
    if (!Array.isArray(cardsJson) || cardsJson.length === 0) {
      throw new Error('AI returned empty or invalid array');
    }

    // Generate temporary UUIDs for each card
    const cards: GeneratedCard[] = cardsJson.map((card, index) => {
      if (!card.front || !card.back) {
        throw new Error(`Invalid card format at index ${index}`);
      }

      return {
        id: crypto.randomUUID(), // Temporary UUID
        front: card.front.substring(0, 1000), // Enforce max length
        back: card.back.substring(0, 2000) // Enforce max length
      };
    });

    // Calculate time and extract token usage
    const timeMs = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      cards,
      tokensUsed,
      timeMs
    };

  } catch (error) {
    const timeMs = Date.now() - startTime;

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      logError('OpenRouter API timeout', error, { timeoutMs: 30000 });
      throw new Error('AI service timeout - please try again');
    }

    // Handle other errors
    logError('Generate flashcards AI error', error, { model, timeMs });
    throw error;
  }
}

/**
 * Validates that generated cards meet quality standards
 * Can be extended with more sophisticated checks
 * 
 * @param cards - Generated cards to validate
 * @returns true if valid, throws error otherwise
 */
export function validateGeneratedCards(cards: GeneratedCard[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    // Check minimum lengths
    if (card.front.trim().length < 10) {
      throw new Error(`Card ${i + 1}: Question too short (minimum 10 characters)`);
    }

    if (card.back.trim().length < 10) {
      throw new Error(`Card ${i + 1}: Answer too short (minimum 10 characters)`);
    }

    // Check maximum lengths
    if (card.front.length > 1000) {
      throw new Error(`Card ${i + 1}: Question too long (maximum 1000 characters)`);
    }

    if (card.back.length > 2000) {
      throw new Error(`Card ${i + 1}: Answer too long (maximum 2000 characters)`);
    }
  }

  return true;
}

