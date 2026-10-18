import { useState, useRef, useEffect } from 'react';
import Layout from './Layout';
import { pythonApi } from '../services/api';

function AIAssisstant() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your CampusCopilot AI assistant powered by Groq Llama-3.3. How can I assist you with your courses, concepts, or assignments today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    'Explain Database Normalization (1NF to BCNF)',
    "How does Dijkstra's Algorithm work?",
    'Provide a quick revision checklist for Object-Oriented Programming',
    'Write a polite email asking faculty for an assignment extension',
  ];

  const handleAsk = async (queryText) => {
    const textToSend = queryText || question;
    if (!textToSend.trim() || loading) return;

    const userMessage = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    const formData = new FormData();
    formData.append('question', textToSend);

    try {
      const res = await pythonApi.post('/ask', formData);
      const aiResponseText = res.data && res.data.answer
        ? res.data.answer
        : 'Received response from assistant.';

      const aiMessage = {
        sender: 'ai',
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage = {
        sender: 'ai',
        text: 'Sorry, I encountered an issue connecting to the AI backend. Please verify your Python FastAPI server is running with a valid GROQ_API_KEY.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container-fluid p-0 d-flex flex-column" style={{ height: 'calc(100vh - 150px)' }}>
        {/* Chat Header Bar */}
        <div className="card border rounded-4 bg-white p-3 shadow-sm mb-3 d-flex flex-row justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center text-white"
              style={{ width: '42px', height: '42px', backgroundColor: '#6366f1' }}
            >
              <i className="bi bi-robot fs-5"></i>
            </div>
            <div>
              <h6 className="fw-bold text-dark mb-0">Campus AI Copilot</h6>
              <div className="d-flex align-items-center gap-2">
                <span className="p-1 bg-success rounded-circle"></span>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>Llama-3.3 70B Versatile • Online</small>
              </div>
            </div>
          </div>

          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-3"
            onClick={() => setMessages([messages[0]])}
            title="Clear Chat History"
          >
            <i className="bi bi-arrow-counterclockwise"></i>
            <span className="d-none d-sm-inline">Reset Chat</span>
          </button>
        </div>

        {/* Chat History Container */}
        <div className="card border rounded-4 bg-white p-4 shadow-sm flex-grow-1 overflow-auto mb-3">
          {messages.length === 1 && (
            <div className="text-center py-4">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: '64px', height: '64px', backgroundColor: '#eef2ff', color: '#6366f1' }}
              >
                <i className="bi bi-stars fs-2"></i>
              </div>
              <h5 className="fw-bold text-dark mb-2">How can I assist your studies today?</h5>
              <p className="text-muted small mb-4" style={{ maxWidth: '440px', margin: '0 auto' }}>
                Ask any question regarding your lecture concepts, coding assignments, or exam preparation.
              </p>

              <div className="row g-2 text-start justify-content-center" style={{ maxWidth: '680px', margin: '0 auto' }}>
                {quickPrompts.map((prompt, i) => (
                  <div className="col-md-6" key={i}>
                    <button
                      className="btn btn-outline-light text-dark border text-start w-100 p-3 rounded-3 small h-100 hover-bg-light"
                      onClick={() => handleAsk(prompt)}
                    >
                      <i className="bi bi-lightbulb me-2 text-primary"></i>
                      {prompt}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="d-flex flex-column gap-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`d-flex gap-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 mt-1"
                    style={{ width: '32px', height: '32px', backgroundColor: '#6366f1' }}
                  >
                    <i className="bi bi-robot" style={{ fontSize: '0.85rem' }}></i>
                  </div>
                )}

                <div
                  className={`p-3 rounded-4 ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white'
                      : msg.isError
                      ? 'bg-danger-subtle text-danger border border-danger-subtle'
                      : 'bg-light text-dark border'
                  }`}
                  style={{
                    maxWidth: '75%',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '0.92rem',
                  }}
                >
                  {msg.text}
                  <div
                    className={`text-end mt-1 ${msg.sender === 'user' ? 'text-white-50' : 'text-muted'}`}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {msg.time}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 mt-1"
                    style={{ width: '32px', height: '32px', backgroundColor: '#0f172a' }}
                  >
                    <i className="bi bi-person" style={{ fontSize: '0.9rem' }}></i>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="d-flex gap-2 justify-content-start">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 mt-1"
                  style={{ width: '32px', height: '32px', backgroundColor: '#6366f1' }}
                >
                  <i className="bi bi-robot" style={{ fontSize: '0.85rem' }}></i>
                </div>
                <div className="p-3 rounded-4 bg-light text-muted border small d-flex align-items-center gap-2">
                  <div className="spinner-grow spinner-grow-sm text-primary" role="status"></div>
                  <span>Thinking & compiling response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="card border rounded-4 bg-white p-2 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="d-flex align-items-center gap-2"
          >
            <input
              type="text"
              className="form-control border-0 shadow-none px-3 py-2"
              placeholder="Ask anything about your coursework or syllabus..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary rounded-3 px-4 py-2 d-flex align-items-center gap-2"
              disabled={loading || !question.trim()}
            >
              <span>Send</span>
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default AIAssisstant;