const generateSummary = async (title, description, category, priority) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured in environment');
    }

    const prompt = `Generate a concise summary (2-3 sentences) for this service request:
Title: ${title}
Description: ${description}
Category: ${category}
Priority: ${priority}

Summary:`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes service requests concisely.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI Summary Error:', error.message);
    throw new Error('Failed to generate AI summary');
  }
};

const generateTestCases = async (title, description, category) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured in environment');
    }

    const prompt = `Generate 3 positive test cases and 3 negative test cases for this service request. Return ONLY valid JSON with "positive" and "negative" arrays.
Title: ${title}
Description: ${description}
Category: ${category}

Return format:
{
  "positive": ["test case 1", "test case 2", "test case 3"],
  "negative": ["test case 1", "test case 2", "test case 3"]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates test cases for service requests. Return ONLY valid JSON, no markdown, no extra text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    let responseText = data.choices[0].message.content.trim();

    // Remove markdown code fences if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(responseText);

    // Validate response structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid response format');
    }

    const positive = Array.isArray(parsed.positive) ? parsed.positive : [];
    const negative = Array.isArray(parsed.negative) ? parsed.negative : [];

    return {
      positive,
      negative
    };
  } catch (error) {
    console.error('AI Test Cases Error:', error.message);
    throw new Error('Failed to generate AI test cases');
  }
};

module.exports = {
  generateSummary,
  generateTestCases
};
