const fs = require("fs");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const token = process.env.HF_TOKEN;
const modelName = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";

async function checkKeys() {
  console.log("Checking Hugging Face API...");
  const logFile = path.join(__dirname, "hf-check-result.txt");
  let output = `--- Hugging Face API Check ---\n`;
  output += `Timestamp: ${new Date().toISOString()}\n`;
  output += `HF_TOKEN Present: ${!!token}\n`;
  if (token) {
    output += `HF_TOKEN Preview: ${token.substring(0, 8)}...\n`;
  }
  output += `Model: ${modelName}\n\n`;

  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${modelName}/v1/chat/completions`,
      {
        model: modelName,
        messages: [
          { role: "user", content: "Say 'Hello, API works!'" }
        ],
        temperature: 0.1,
        max_tokens: 50
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    output += `[SUCCESS]\n`;
    output += `Status: ${response.status}\n`;
    output += `Response: ${JSON.stringify(response.data, null, 2)}\n`;
    console.log("SUCCESS: Hugging Face API responded correctly!");
  } catch (err) {
    output += `[FAILURE]\n`;
    output += `Error Message: ${err.message}\n`;
    if (err.response) {
      output += `HTTP Status: ${err.response.status}\n`;
      output += `Response Data: ${JSON.stringify(err.response.data, null, 2)}\n`;
    }
    console.error("FAILURE: Hugging Face API call failed. Check hf-check-result.txt for details.");
  }

  fs.writeFileSync(logFile, output, "utf8");
  console.log("Wrote report to backend/hf-check-result.txt");
}

checkKeys();
