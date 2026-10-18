import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { pythonApi, authService } from '../services/api';

function Rag() {
  const navigate = useNavigate();
  const email = authService.getEmail() || '';

  // Repository files state
  const [repositoryFiles, setRepositoryFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState('');

  // Active loaded RAG document state
  const [activeFile, setActiveFile] = useState(null);
  const [vectorizing, setVectorizing] = useState(false);

  // Q&A state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [retrievedContext, setRetrievedContext] = useState('');
  const [asking, setAsking] = useState(false);
  const [showContextAccordion, setShowContextAccordion] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // 1. Fetch uploaded files and active document on mount
  const fetchRepositoryAndActive = async () => {
    setLoadingFiles(true);
    try {
      // Fetch student's uploaded repository files
      const filesRes = await pythonApi.get('/files', { params: { email } });
      const files = filesRes.data?.files || [];
      setRepositoryFiles(files);

      // Check if a file was pre-selected from Uploads page
      const preSelectedId = localStorage.getItem('selected_rag_file_id');
      if (preSelectedId && files.some((f) => f.id === preSelectedId)) {
        setSelectedFileId(preSelectedId);
        localStorage.removeItem('selected_rag_file_id');
      } else if (files.length > 0 && !selectedFileId) {
        setSelectedFileId(files[0].id);
      }

      // Check if there is already an active file loaded on backend
      const activeRes = await pythonApi.get('/rag/active-file');
      if (activeRes.data?.has_active_file) {
        setActiveFile(activeRes.data.file);
      }
    } catch (err) {
      console.error('Error loading repository for RAG:', err);
      setStatusMessage({
        type: 'danger',
        text: 'Could not connect to RAG service. Ensure Python FastAPI server on port 8000 is running.',
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchRepositoryAndActive();
  }, [email]);

  // 2. Index the chosen uploaded file
  const handleIndexFile = async () => {
    if (!selectedFileId) {
      setStatusMessage({ type: 'warning', text: 'Please select an uploaded document from the list.' });
      return;
    }

    setVectorizing(true);
    setStatusMessage({ type: '', text: '' });
    setAnswer('');
    setRetrievedContext('');

    const formData = new FormData();
    formData.append('file_id', selectedFileId);

    try {
      const res = await pythonApi.post('/rag/index-file', formData);
      if (res.data && res.data.status === 'success') {
        setActiveFile({
          file_id: res.data.file_id,
          file_name: res.data.file_name,
          chunk_count: res.data.chunk_count,
          indexed_at: 'Just now',
        });
        setStatusMessage({
          type: 'success',
          text: `"${res.data.file_name}" successfully loaded into FAISS vector space (${res.data.chunk_count} chunks indexed). You can now ask questions!`,
        });
      }
    } catch (err) {
      console.error('Vectorization failed:', err);
      const detail = err.response?.data?.detail || 'Failed to extract and index document into FAISS.';
      setStatusMessage({ type: 'danger', text: detail });
    } finally {
      setVectorizing(false);
    }
  };

  // 3. Ask question grounded in the active uploaded document
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    if (!activeFile) {
      setStatusMessage({
        type: 'warning',
        text: 'Please select and load an uploaded document first before asking questions.',
      });
      return;
    }

    setAsking(true);
    setAnswer('');
    setRetrievedContext('');
    setStatusMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('question', question);

    try {
      const res = await pythonApi.post('/rag/ask', formData);
      if (res.data) {
        setAnswer(res.data.answer || 'No response generated.');
        if (res.data.has_context && res.data.context) {
          setRetrievedContext(res.data.context);
        }
      }
    } catch (err) {
      console.error('RAG query failed:', err);
      setStatusMessage({
        type: 'danger',
        text: 'Error retrieving grounded answer. Ensure the backend is responsive.',
      });
    } finally {
      setAsking(false);
    }
  };

  const getSelectedFileObject = () => {
    return repositoryFiles.find((f) => f.id === selectedFileId) || null;
  };

  return (
    <Layout>
      <div className="container-fluid p-0">
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="rounded-3 d-flex align-items-center justify-content-center text-white"
              style={{ width: '32px', height: '32px', backgroundColor: '#0d9488' }}
            >
              <i className="bi bi-file-earmark-text-fill fs-5"></i>
            </span>
            <h4 className="fw-bold text-dark mb-0">RAG Document Assistant</h4>
          </div>
          <p className="text-muted small mb-0">
            Query your uploaded course syllabus and notes with zero hallucinations using FAISS vector similarity and Sentence Transformers
          </p>
        </div>

        {statusMessage.text && (
          <div className={`alert alert-${statusMessage.type} alert-dismissible fade show rounded-3 small mb-4 shadow-sm`} role="alert">
            <i className={`bi ${statusMessage.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
            {statusMessage.text}
            <button type="button" className="btn-close" onClick={() => setStatusMessage({ type: '', text: '' })}></button>
          </div>
        )}

        <div className="row g-4">
          {/* Left Column: Choose from Uploaded Repository */}
          <div className="col-lg-5">
            <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                  1
                </span>
                <h5 className="fw-bold text-dark mb-0">Select from Uploaded Repository</h5>
              </div>

              <p className="text-muted small mb-3">
                RAG queries strictly operate on verified materials in your profile repository. Choose an uploaded syllabus or lecture note to vectorize:
              </p>

              {loadingFiles ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                  <div className="text-muted small">Loading your uploaded files...</div>
                </div>
              ) : repositoryFiles.length === 0 ? (
                <div className="p-4 border rounded-3 bg-light text-center mb-3">
                  <i className="bi bi-folder-x fs-1 text-secondary opacity-50 mb-2 d-block"></i>
                  <h6 className="fw-bold text-dark mb-1">No uploaded documents found</h6>
                  <p className="small text-muted mb-3">
                    You have not uploaded any syllabus or lecture notes yet. Documents must be in your repository before they can be used in RAG.
                  </p>
                  <button
                    className="btn btn-primary btn-sm px-3 rounded-3 d-inline-flex align-items-center gap-2"
                    onClick={() => navigate('/uploads')}
                  >
                    <i className="bi bi-cloud-arrow-up"></i>
                    <span>Upload Syllabus to Repository</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">
                      Choose Uploaded Document
                    </label>
                    <select
                      className="form-select"
                      value={selectedFileId}
                      onChange={(e) => setSelectedFileId(e.target.value)}
                      disabled={vectorizing}
                    >
                      {repositoryFiles.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.fileName} ({file.fileType.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected file preview card */}
                  {getSelectedFileObject() && (
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
                        <span className="fw-semibold text-dark small text-truncate">
                          {getSelectedFileObject().fileName}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between text-muted small" style={{ fontSize: '0.75rem' }}>
                        <span>Uploaded: {getSelectedFileObject().uploadedAt || 'Recently'}</span>
                        <span className="badge bg-secondary-subtle text-secondary">
                          {getSelectedFileObject().fileType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-100 py-2 rounded-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleIndexFile}
                    disabled={vectorizing || !selectedFileId}
                  >
                    {vectorizing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Vectorizing Chunks with MiniLM & FAISS...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cpu-fill"></i>
                        <span>Load & Vectorize Document</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Active Document Badge Card */}
              {activeFile && (
                <div className="mt-3 p-3 bg-success-subtle rounded-3 border border-success-subtle d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center bg-success text-white flex-shrink-0"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className="bi bi-check-lg fs-5"></i>
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-bold text-success text-truncate small">
                      {activeFile.file_name}
                    </div>
                    <small className="text-success-emphasis" style={{ fontSize: '0.72rem' }}>
                      Active in FAISS • {activeFile.chunk_count} text chunks indexed
                    </small>
                  </div>
                </div>
              )}
            </div>

            <div className="card border rounded-4 p-4 bg-white shadow-sm">
              <h6 className="fw-bold text-dark mb-2">Why Uploaded-Only Grounding?</h6>
              <ul className="list-unstyled small text-muted d-flex flex-column gap-2 mb-0">
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-shield-check text-success mt-1"></i>
                  <span><strong>Zero Hallucinations:</strong> The assistant strictly relies on verified syllabus text uploaded by students and faculty.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check2 text-primary mt-1"></i>
                  <span><strong>Instant Switching:</strong> Easily change the active document to study DBMS, Networks, or Operating Systems without re-uploading.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Grounded Q&A Assistant */}
          <div className="col-lg-7">
            <div className="card border rounded-4 p-4 bg-white shadow-sm h-100 d-flex flex-column">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                  2
                </span>
                <h5 className="fw-bold text-dark mb-0">Ask Questions on Active Document</h5>
              </div>

              <p className="text-muted small mb-3">
                {activeFile
                  ? `Queries are currently grounded strictly in "${activeFile.file_name}".`
                  : 'Load an uploaded document on the left to start asking grounded questions.'}
              </p>

              {/* Question Input Form */}
              <form onSubmit={handleAsk} className="mb-4">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control py-2 ps-3"
                    placeholder={
                      activeFile
                        ? `Ask anything from ${activeFile.file_name} (e.g. Unit 3 syllabus or textbook editions)...`
                        : 'Select and load an uploaded document first...'
                    }
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={asking || !activeFile}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary px-4 d-flex align-items-center gap-2"
                    disabled={asking || !question.trim() || !activeFile}
                  >
                    {asking ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      <>
                        <span>Query</span>
                        <i className="bi bi-search"></i>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Answer & Context Display Box */}
              <div className="flex-grow-1 border rounded-4 p-4 bg-light d-flex flex-column justify-content-center">
                {asking && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <h6 className="fw-semibold text-dark">Searching FAISS index for relevant excerpts...</h6>
                    <small className="text-muted">Synthesizing grounded response without hallucinations</small>
                  </div>
                )}

                {!asking && answer && (
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-1">
                          <i className="bi bi-shield-check me-1"></i>Grounded Answer
                        </span>
                        <small className="text-muted text-truncate" style={{ maxWidth: '300px' }}>
                          Source: {activeFile?.file_name}
                        </small>
                      </div>

                      {retrievedContext && (
                        <button
                          className="btn btn-sm btn-link text-decoration-none small p-0 text-primary"
                          onClick={() => setShowContextAccordion(!showContextAccordion)}
                        >
                          {showContextAccordion ? 'Hide Document Excerpts' : 'View Retrieved Context'}
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-white rounded-3 border shadow-xs text-dark leading-relaxed mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                      {answer}
                    </div>

                    {/* Context Excerpts Accordion */}
                    {showContextAccordion && retrievedContext && (
                      <div className="p-3 bg-white rounded-3 border border-dashed small text-muted">
                        <strong className="text-dark d-block mb-1">
                          <i className="bi bi-file-earmark-check text-primary me-1"></i>
                          FAISS Retrieved Semantic Chunks:
                        </strong>
                        <pre className="mb-0 text-secondary bg-light p-2 rounded" style={{ fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                          {retrievedContext}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {!asking && !answer && (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-file-earmark-medical fs-1 text-secondary opacity-50 mb-2 d-block"></i>
                    <h6 className="fw-medium text-dark">
                      {activeFile ? 'Ready for your questions' : 'No document currently indexed'}
                    </h6>
                    <small className="d-block" style={{ maxWidth: '420px', margin: '0 auto' }}>
                      {activeFile
                        ? `Ask any question above. The answer will be extracted strictly from "${activeFile.file_name}".`
                        : 'Choose one of your uploaded syllabus files on the left and click "Load & Vectorize Document" to begin.'}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Rag;