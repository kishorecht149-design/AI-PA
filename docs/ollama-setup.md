# Local macOS Development with Ollama & AMAHAS

This guide provides step-by-step instructions for running local, private AI models on macOS with Apple Silicon (M1/M2/M3/M4) and integrating them with the AMAHAS Personal Operating System.

---

## 1. Prerequisites

- macOS 12 Monterey or newer (macOS 14+ Sonoma or macOS 15+ Sequoia recommended).
- Apple Silicon (M1/M2/M3/M4) with at least 8 GB unified memory.
- Homebrew or direct installer.

---

## 2. Installation & Model Download

### Step 1: Install Ollama
Run in your macOS Terminal:
```bash
brew install ollama
```
Or download directly from [ollama.com/download](https://ollama.com/download).

### Step 2: Download Recommended Models
We recommend lightweight, high-performance models tailored for local Apple Silicon inference:

```bash
# Recommended general model (fast, low memory footprint: ~2.0 GB)
ollama pull llama3.2

# Recommended coding & technical reasoning model (~4.7 GB)
ollama pull qwen2.5:7b

# Recommended fast math/reasoning model (~1.5 GB)
ollama pull deepseek-r1:1.5b
```

### Step 3: Start the Local Ollama Daemon
Start the local server daemon:
```bash
ollama serve
```
By default, the server listens on `http://127.0.0.1:11434`.

---

## 3. Connecting to AMAHAS

### Local Development Environment:
In your `.env` file inside the AMAHAS project root:
```env
OLLAMA_BASE_URL="http://localhost:11434"
DEFAULT_AI_MODEL="ollama/llama3.2"
```

Start the AMAHAS development server:
```bash
npm run dev
```

Navigate to `http://localhost:3000/assistant`.
In the Model Selector dropdown at the top of the Assistant page, select **"Ollama Local (llama3.2)"**.

### Cloud / Vercel Environment Notice:
When AMAHAS is deployed to Vercel in production, the remote serverless functions cannot directly connect to your local MacBook loopback (`127.0.0.1`).

In production:
- AMAHAS automatically routes through OpenRouter's free-tier cloud models.
- If an Ollama model is selected while on Vercel without a configured public tunnel, the system detects the local boundary and seamlessly falls back to the OpenRouter free tier with an informative status message.
- To use local models in production securely without exposing raw endpoints:
  Use a secure tunnel such as **Cloudflare Tunnel** (`cloudflared tunnel`) or **Tailscale Serve**, and set `OLLAMA_BASE_URL="https://your-tunnel-url.example.com"` with token authentication.

---

## 4. Privacy & Cost Guarantee

- **Zero Cloud Egress**: When Ollama models are active locally, conversation prompts and responses stay 100% on your device hardware.
- **₹0 Cost**: Local execution incurs zero token fees, zero subscription costs, and requires no credit cards or external API keys.
