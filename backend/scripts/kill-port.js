#!/usr/bin/env node

const { exec } = require('child_process');
const port = process.argv[2] || 5000;

console.log(`🔍 Checking for processes on port ${port}...`);

// Find process using the port
exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
  if (error) {
    console.log(`✅ Port ${port} is free!`);
    return;
  }

  const lines = stdout.trim().split('\n');
  const tcpLines = lines.filter(line => line.includes('LISTENING'));
  
  if (tcpLines.length === 0) {
    console.log(`✅ Port ${port} is free!`);
    return;
  }

  tcpLines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    
    console.log(`🚫 Found process ${pid} using port ${port}`);
    
    // Kill the process
    exec(`taskkill /PID ${pid} /F`, (killError, killStdout, killStderr) => {
      if (killError) {
        console.error(`❌ Failed to kill process ${pid}:`, killError.message);
      } else {
        console.log(`✅ Successfully killed process ${pid}`);
      }
    });
  });
}); 