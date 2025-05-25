import { useState } from "react";
import "./App.css";

function App() {
  // State for configuration
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [structured, setStructured] = useState(false);
  const [schema, setSchema] = useState(`{
  "type": "object",
  "properties": {
    "example": { "type": "string" }
  },
  "required": ["example"]
}`);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle file upload and read as text
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setFileContent(ev.target.result);
      reader.readAsText(f);
    } else {
      setFileContent("");
    }
  };

  // Build messages array
  const buildMessages = () => {
    const messages = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt });
    }
    let userContent = userPrompt;
    if (fileContent) {
      if (userPrompt.includes("@file")) {
        userContent = userPrompt.replace(/@file/g, fileContent);
      } else {
        userContent = userPrompt + "\n" + fileContent;
      }
    }
    if (userContent.trim()) {
      messages.push({ role: "user", content: userContent });
    }
    return messages;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);
    const messages = buildMessages();
    if (!model || !messages.length) {
      setError("Model and user prompt are required.");
      setLoading(false);
      return;
    }
    const payload = {
      model,
      messages,
      stream: false,
    };
    if (structured) {
      try {
        payload.format = JSON.parse(schema);
      } catch (err) {
        setError("Invalid JSON schema.");
        setLoading(false);
        return;
      }
    }
    try {
      console.log(payload);
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render the assistant's response content
  const renderContent = () => {
    if (!response || !response.message) return null;
    let content = response.message.content;
    // Try to pretty print JSON if content is JSON
    let pretty = null;
    try {
      const parsed = JSON.parse(content);
      pretty = (
        <pre className="ollama-content-json">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // Not JSON, just render as text
      pretty = <div className="ollama-content-text">{content}</div>;
    }
    return pretty;
  };

  // Helper to render token/sec stats
  const renderStats = () => {
    if (!response) return null;
    const {
      prompt_eval_count,
      prompt_eval_duration,
      eval_count,
      eval_duration,
    } = response;
    let promptTokensPerSec = null;
    let evalTokensPerSec = null;
    if (prompt_eval_count && prompt_eval_duration) {
      // duration is in nanoseconds
      promptTokensPerSec = (
        prompt_eval_count /
        (prompt_eval_duration / 1e9)
      ).toFixed(2);
    }
    if (eval_count && eval_duration) {
      evalTokensPerSec = (eval_count / (eval_duration / 1e9)).toFixed(2);
    }
    return (
      <div className="ollama-stats">
        {promptTokensPerSec && (
          <span>
            Prompt tokens/sec: <b>{promptTokensPerSec}</b>
          </span>
        )}
        {evalTokensPerSec && (
          <span style={{ marginLeft: 24 }}>
            Eval tokens/sec: <b>{evalTokensPerSec}</b>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="app-container ollama-app">
      <h2 className="ollama-title">Ollama WebUI</h2>
      <form onSubmit={handleSubmit} className="ollama-form">
        <div className="ollama-field">
          <label>API Base URL: </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        <div className="ollama-field">
          <label>Model: </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. llama3.2"
          />
        </div>
        <div className="ollama-field">
          <label>System Prompt:</label>
          <br />
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={2}
          />
        </div>
        <div className="ollama-field">
          <label>User Prompt:</label>
          <br />
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            placeholder="Type your message. Use @file to insert file content."
          />
        </div>
        <div className="ollama-field">
          <label>File Upload: </label>
          <input type="file" onChange={handleFileChange} />
          {file && <span className="ollama-file-name">{file.name}</span>}
        </div>
        <div className="ollama-field ollama-checkbox">
          <label>
            <input
              type="checkbox"
              checked={structured}
              onChange={(e) => setStructured(e.target.checked)}
            />{" "}
            Structured Output
          </label>
        </div>
        {structured && (
          <div className="ollama-field">
            <label>JSON Schema:</label>
            <br />
            <textarea
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              rows={6}
              style={{ fontFamily: "monospace" }}
            />
          </div>
        )}
        <button type="submit" disabled={loading} className="ollama-send-btn">
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
      {error && <div className="ollama-error">{error}</div>}
      {response && (
        <div className="ollama-response">
          <h3>Response</h3>
          {renderContent()}
          {renderStats()}
          <details style={{ marginTop: 16 }}>
            <summary>Raw JSON</summary>
            <pre className="ollama-json-raw">
              {JSON.stringify(response, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default App;
