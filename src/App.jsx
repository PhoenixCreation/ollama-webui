import { useState, useEffect } from "react";
import "./App.css";

function App() {
  // State for configuration
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [includeLineNumbers, setIncludeLineNumbers] = useState(false);
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
  const [streamedContent, setStreamedContent] = useState("");

  // Fetch available models from Ollama API
  const fetchModels = async () => {
    setModelsLoading(true);
    setModelsError("");
    try {
      const res = await fetch(`${baseUrl}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModels(data.models || []);
      // If no model is selected and models are available, select the first one
      if (!model && data.models && data.models.length > 0) {
        setModel(data.models[0].name);
      }
    } catch (err) {
      setModelsError(`Failed to fetch models: ${err.message}`);
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  // Fetch models when component mounts or baseUrl changes
  useEffect(() => {
    fetchModels();
  }, [baseUrl]);

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

  // Add line numbers to file content
  const addLineNumbers = (content) => {
    if (!content) return content;
    const lines = content.split("\n");
    const maxLineLength = lines.length.toString().length;
    return lines
      .map((line, index) => {
        const lineNumber = (index + 1).toString().padStart(maxLineLength, " ");
        return `${lineNumber}: ${line}`;
      })
      .join("\n");
  };

  // Build messages array
  const buildMessages = () => {
    const messages = [];
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt });
    }
    let userContent = userPrompt;
    if (fileContent) {
      const processedFileContent = includeLineNumbers
        ? addLineNumbers(fileContent)
        : fileContent;

      if (userPrompt.includes("@file")) {
        userContent = userPrompt.replace(/@file/g, processedFileContent);
      } else {
        userContent = userPrompt + "\n" + processedFileContent;
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
    setStreamedContent("");
    const messages = buildMessages();
    if (!model || !messages.length) {
      setError("Model and user prompt are required.");
      setLoading(false);
      return;
    }
    const payload = {
      model,
      messages,
      stream: true,
      thinking: true,
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
      if (payload.stream) {
        const reader = res.body.getReader();
        let decoder = new TextDecoder();
        let done = false;
        let buffer = "";
        let full = "";
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split("\n");
            buffer = lines.pop(); // Save incomplete line for next chunk
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                // Some APIs prefix with 'data: '
                const clean = line.replace(/^data: /, "");
                const json = JSON.parse(clean);
                console.log("Parsed JSON:", json); // Debug log
                // Try to get incremental content
                let delta = "";
                if (json.message && typeof json.message.content === "string") {
                  delta = json.message.content;
                } else if (json.content) {
                  delta = json.content;
                } else if (json.response) {
                  // Ollama might use 'response' field
                  delta = json.response;
                }
                console.log("Delta content:", delta); // Debug log
                if (delta) {
                  setStreamedContent((prev) => prev + delta);
                  full += delta;
                }
                // Store the last valid JSON for stats (if it has done: true)
                if (json.done === true) {
                  console.log("Final streaming JSON:", json); // Debug log
                  setResponse(json);
                }
              } catch (err) {
                console.log("Parse error:", err, "Line:", line); // Debug log
              }
            }
          }
        }
        // Try to parse the last complete JSON for stats, etc.
        try {
          const lastJson = JSON.parse(buffer.trim().replace(/^data: /, ""));
          console.log("Final JSON:", lastJson); // Debug log
          setResponse(lastJson);
        } catch (err) {
          console.log("Final JSON parse error:", err, "Buffer:", buffer); // Debug log
          // Not valid JSON, just leave streamedContent
        }
      } else {
        const data = await res.json();
        setResponse(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render the assistant's response content
  const renderContent = () => {
    if (streamedContent) {
      let pretty = null;
      try {
        const parsed = JSON.parse(streamedContent);
        pretty = (
          <pre className="ollama-content-json">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        pretty = <div className="ollama-content-text">{streamedContent}</div>;
      }
      return pretty;
    }
    if (!response || !response.message) return null;
    let content = response.message.content;
    let pretty = null;
    try {
      const parsed = JSON.parse(content);
      pretty = (
        <pre className="ollama-content-json">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
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
        <div className="ollama-form-row">
          <div className="ollama-field ollama-field-half">
            <label>API Base URL: </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="ollama-field ollama-field-half">
            <label>Model: </label>
            <div className="ollama-model-selector">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={modelsLoading}
              >
                <option value="">
                  {modelsLoading ? "Loading models..." : "Select a model"}
                </option>
                {models.map((modelItem) => (
                  <option key={modelItem.name} value={modelItem.name}>
                    {modelItem.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={fetchModels}
                disabled={modelsLoading}
                className="ollama-refresh-btn"
              >
                🔄
              </button>
            </div>
            {modelsError && (
              <div className="ollama-models-error">{modelsError}</div>
            )}
          </div>
        </div>
        <div className="ollama-form-row">
          <div className="ollama-field ollama-field-half">
            <label>System Prompt:</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
            />
          </div>
          <div className="ollama-field ollama-field-half">
            <label>File Upload: </label>
            <input type="file" onChange={handleFileChange} />
            {file && (
              <div className="ollama-file-info">
                <span className="ollama-file-name">{file.name}</span>
                <label className="ollama-checkbox-label ollama-line-numbers-option">
                  <input
                    type="checkbox"
                    checked={includeLineNumbers}
                    onChange={(e) => setIncludeLineNumbers(e.target.checked)}
                  />
                  Include line numbers
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="ollama-field">
          <label>User Prompt:</label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            placeholder="Type your message. Use @file to insert file content."
          />
        </div>
        <div className="ollama-field">
          <details open={structured} className="ollama-structured-details">
            <summary className="ollama-structured-summary">
              <label className="ollama-checkbox-label">
                <input
                  type="checkbox"
                  checked={structured}
                  onChange={(e) => setStructured(e.target.checked)}
                />{" "}
                Structured Output
              </label>
            </summary>
            {structured && (
              <div className="ollama-field" style={{ marginTop: "0.5rem" }}>
                <label>JSON Schema:</label>
                <textarea
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  rows={6}
                  style={{ fontFamily: "monospace" }}
                />
              </div>
            )}
          </details>
        </div>
        <button type="submit" disabled={loading} className="ollama-send-btn">
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
      {error && <div className="ollama-error">{error}</div>}
      {(response || streamedContent) && (
        <div className="ollama-response">
          <h3>Response</h3>
          {renderContent()}
          {renderStats()}
          {response && (
            <details style={{ marginTop: 16 }}>
              <summary>Raw JSON</summary>
              <pre className="ollama-json-raw">
                {JSON.stringify(response, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
