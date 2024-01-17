const { generateApiFromConfigFile } = require('./src/main.js');

try {
  console.log('CLI is running')
  generateApiFromConfigFile();
} catch (error) {
  console.error('Error occurred:', error);
}
