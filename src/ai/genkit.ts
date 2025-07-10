import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {nextjsPlugin} from '@genkit-ai/next';

export const ai = genkit({
  plugins: [googleAI(), nextjsPlugin()],
  model: 'googleai/gemini-2.0-flash',
});
