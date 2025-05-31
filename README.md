# Ollama WebUI

A modern, feature-rich web interface for interacting with [Ollama](https://ollama.ai/) language models. Built with React and Vite, this UI provides an intuitive way to chat with your local AI models with advanced features like file uploads, structured output, and real-time streaming.

## 🚀 Features

- **🤖 Model Management**: Automatically discovers and lists available Ollama models
- **💬 Interactive Chat**: Real-time streaming chat interface with your AI models
- **📁 File Upload**: Upload files and include them in your prompts with optional line numbering
- **🔧 System Prompts**: Configure custom system prompts for different use cases
- **📋 Structured Output**: Generate responses in JSON format with custom schemas
- **📊 Performance Metrics**: View token/second statistics and model performance
- **🎨 Modern UI**: Clean, responsive design with beautiful gradients and animations
- **⚡ Real-time Streaming**: See responses as they're generated
- **🔄 Auto-refresh**: Automatically fetch available models when connecting to different Ollama instances

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18+ recommended)
- **npm** or **yarn** package manager
- **Ollama** running locally or accessible via network

### Setting up Ollama

1. Install Ollama from [https://ollama.ai/](https://ollama.ai/)
2. Start Ollama service:
   ```bash
   ollama serve
   ```
3. Pull your desired models:
   ```bash
   ollama pull llama3.2
   ollama pull codellama
   ollama pull mistral
   ```

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd ollama-webui
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

## 🎯 Usage

### Basic Chat

1. **Select a Model**: Choose from automatically discovered models in the dropdown
2. **Enter your prompt**: Type your message in the "User Prompt" field
3. **Send**: Click "Send" to start the conversation
4. **View Response**: Watch the AI response stream in real-time

### Advanced Features

#### File Upload with Line Numbers

- Click "Choose File" to upload text files, code, documents, etc.
- Check "Include line numbers" to add line numbers to the file content
- Use `@file` in your prompt to insert file content at specific locations
- Or simply add your prompt and the file content will be appended

#### System Prompts

- Configure the AI's behavior with system prompts
- Examples: "You are a helpful coding assistant" or "Respond only in JSON format"

#### Structured Output

- Enable "Structured Output" to get responses in JSON format
- Customize the JSON schema to match your needs
- Perfect for data extraction, API responses, or structured analysis

#### Custom Ollama Instance

- Change the "API Base URL" to connect to remote Ollama instances
- Default: `http://localhost:11434`
- Models will automatically refresh when you change the URL

## 🔧 Configuration

### Environment Variables

You can customize the default settings by creating a `.env` file:

```env
VITE_DEFAULT_OLLAMA_URL=http://localhost:11434
VITE_DEFAULT_MODEL=llama3.2
```

### API Endpoints

The application uses these Ollama API endpoints:

- `GET /api/tags` - Fetch available models
- `POST /api/chat` - Chat with streaming support

## 📝 Example Use Cases

### Code Review

```
System Prompt: You are an expert code reviewer. Provide constructive feedback.
User Prompt: Please review this code for best practices and potential issues.
File: upload your code file with line numbers enabled
```

### Data Analysis

```
System Prompt: You are a data analyst. Provide insights in JSON format.
Structured Output: Enabled with custom schema
User Prompt: Analyze this dataset and provide key insights.
File: upload your CSV or data file
```

### Document Q&A

```
User Prompt: Based on the following document, answer: What are the main conclusions?
File: upload your PDF converted to text or markdown file
```

## 🏗️ Build for Production

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the terms specified in the LICENSE.md file.

## 🔗 Related Projects

- [Ollama](https://ollama.ai/) - Run large language models locally
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)

## 🆘 Troubleshooting

### Common Issues

**Models not loading:**

- Ensure Ollama is running (`ollama serve`)
- Check if the API URL is correct
- Verify you have models installed (`ollama list`)

**CORS errors:**

- Ollama runs on localhost by default, which should work fine
- If using a remote Ollama instance, ensure CORS is properly configured

**File upload issues:**

- Ensure the file is a text-based format
- Large files may take time to process

For more issues, check the browser console for error messages.
