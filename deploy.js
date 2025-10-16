const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting clean deployment process...');

// Step 1: Clean up any old build artifacts
console.log('Cleaning up old builds...');
try {
  if (fs.existsSync('./build')) {
    fs.rmSync('./build', { recursive: true });
    console.log('✅ Old build directory removed');
  }
} catch (err) {
  console.error('Error cleaning build directory:', err);
}

// Step 2: Clean Firebase cache
console.log('Cleaning Firebase cache...');
try {
  if (fs.existsSync('./.firebase')) {
    fs.rmSync('./.firebase', { recursive: true });
    console.log('✅ Firebase cache directory removed');
  }
} catch (err) {
  console.error('Error cleaning Firebase cache:', err);
}

// Step 3: Build the project
console.log('Building project...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Build error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Build warnings: ${stderr}`);
  }
  
  console.log('✅ Build completed successfully');
  console.log(stdout);
  
  // Step 4: Deploy to Firebase with cache control
  console.log('Deploying to Firebase...');
  exec('firebase deploy --only hosting --force', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Deployment error: ${error.message}`);
      return;
    }
    
    console.log('✅ Deployment completed successfully');
    console.log(stdout);
    
    console.log('\n🎉 Deployment process completed! Your updated site should now be live.');
    console.log('If you still see the old version, try the following:');
    console.log('1. Open your site in an incognito/private window');
    console.log('2. Clear your browser cache manually');
    console.log('3. Try accessing from a different device');
    console.log('\nDeployment URL: https://opacfinal.web.app/');
  });
}); 