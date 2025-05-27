import { GoogleGenAI } from '@google/genai';

async function testAI() {
  console.log('🧪 Testing AI Connection...');
  
  // Get API key from environment or config
  const apiKey = process.env.GEMINI_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('❌ No API key provided. Usage: node test-ai.mjs YOUR_API_KEY');
    process.exit(1);
  }
  
  try {
    console.log('🔄 Initializing Google GenAI...');
    const ai = new GoogleGenAI({ apiKey });
    
    console.log('🔄 Sending test request to Gemini 2.0 Flash...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'As a terminal expert, analyze this error: git push origin nonexistent - fatal: repository does not exist. Provide a clear solution.',
      config: {
        maxOutputTokens: 500,
        temperature: 0.3,
      }
    });
    
    console.log('✅ AI Response received:');
    console.log('─'.repeat(50));
    console.log(response.text);
    console.log('─'.repeat(50));
    console.log('✅ AI test successful!');
    
  } catch (error) {
    console.error('❌ AI test failed:', error.message);
    console.error('Error details:', error);
  }
}

testAI(); 