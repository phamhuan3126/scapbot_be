import { randomBytes } from 'crypto';

function generateApiKey(length: number = 16): string {
  return randomBytes(length).toString('hex');
}

const apiKey = generateApiKey();
console.log(apiKey);
