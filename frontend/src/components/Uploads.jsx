import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { pythonApi, authService } from '../services/api';

const Uploads = () => {
  const navigate = useNavigate();
  const email = authService.getEmail() || '';
  const [fileName, setFileName] = useState('');
  const [userId, setUserId] = useState(email);
  const [fileType, setFileType] = useState('pdf');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fetchingFiles, setFetchingFiles] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchUploadedFiles = async () => {
    setFetchingFiles(true);
    try {
      const res = await pythonApi.get('/files', { params: { email } });
      if (res.data && res.data.files) {
        setUploadedFiles(res.data.files);
      }
    } catch (err) {
      console.error('Failed to fetch uploaded repository files:', err);
    } finally {
      setFetchingFiles(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, [email]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      if (!fileName) {
        setFileName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!fileName) {
        setFileName(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setToast({ show: true, message: 'Please select a document to upload.', type: 'danger' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('fileName', fileName || file.name);
    formData.append('email', email);
    formData.append('userId', userId || email);
    formData.append('fileType', fileType);
    formData.append('file', file);

    try {
      await pythonApi.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setToast({
        show: true,
        message: 'Material uploaded and cataloged into campus repository.',
        type: 'success',
      });
      setFileName('');
      setFile(null);
      // Refresh repository file list immediately
      fetchUploadedFiles();
    } catch (err) {
      console.error(err);
      setToast({
        show: true,
        message: 'Upload failed. Ensure the Python API service on port 8000 is active.',
        type: 'danger',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
    }
  };

  const handleDeleteFile = async (fileId, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your repository?`)) {
      return;
    }

    try {
      await pythonApi.delete(`/files/${fileId}`);
      setToast({ show: true, message: `Removed "${name}" from repository.`, type: 'info' });
      fetchUploadedFiles();
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'Could not delete file from repository.', type: 'danger' });
    }
  };

  const handleUseInRag = (fileItem) => {
    // Store selected file ID for RAG page
    localStorage.setItem('selected_rag_file_id', fileItem.id);
    localStorage.setItem('selected_rag_file_name', fileItem.fileName);
    navigate('/rag');
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="container-fluid p-0">
        <div className="mb-4">
          <h4 className="fw-bold text-dark mb-1">Upload Course Materials & Syllabus</h4>
          <p className="text-muted small">Upload course notes, syllabi, and reference readings to your personal academic repository</p>
        </div>

        {toast.show && (
          <div
            className={`alert alert-${toast.type} alert-dismissible fade show rounded-3 small mb-4 shadow-sm`}
            role="alert"
          >
            <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'} me-2`}></i>
            {toast.message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
            ></button>
          </div>
        )}

        <div className="row g-4 mb-4">
          {/* Main Upload Form */}
          <div className="col-lg-8">
            <div className="card border rounded-4 p-4 bg-white shadow-sm">
              <h5 className="fw-bold text-dark mb-3">Upload New Academic Material</h5>
              <form onSubmit={handleSubmit}>
                {/* Drag and Drop Zone */}
                <div
                  className="border border-2 border-dashed rounded-4 p-5 text-center mb-4 transition-all"
                  style={{
                    backgroundColor: file ? '#f0fdf4' : '#f8fafc',
                    borderColor: file ? '#86efac' : '#cbd5e1',
                    cursor: 'pointer',
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('fileInput').click()}
                >
                  <input
                    id="fileInput"
                    type="file"
                    className="d-none"
                    accept=".pdf,.docx,.txt,.pptx"
                    onChange={handleFileSelect}
                  />

                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow-xs"
                    style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: file ? '#dcfce7' : '#eff6ff',
                      color: file ? '#16a34a' : '#2563eb',
                    }}
                  >
                    <i className={`bi ${file ? 'bi-file-earmark-check-fill' : 'bi-cloud-arrow-up'} fs-3`}></i>
                  </div>

                  {file ? (
                    <div>
                      <h6 className="fw-bold text-success mb-1">{file.name}</h6>
                      <small className="text-muted">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Click or drag to replace
                      </small>
                    </div>
                  ) : (
                    <div>
                      <h6 className="fw-semibold text-dark mb-1">
                        Click to browse or drag and drop document
                      </h6>
                      <small className="text-muted">
                        Supported formats: PDF, DOCX, TXT, PPTX (Max 25MB)
                      </small>
                    </div>
                  )}
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">Material Title / Subject</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Database Management Systems Unit 1"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">Document Type</label>
                    <select
                      className="form-select"
                      value={fileType}
                      onChange={(e) => setFileType(e.target.value)}
                    >
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="docx">Word Document (.docx)</option>
                      <option value="pptx">PowerPoint Presentation (.pptx)</option>
                      <option value="txt">Plain Text (.txt)</option>
                      <option value="others">Other Academic Document</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">Uploader Email</label>
                    <input
                      type="email"
                      className="form-control bg-light text-muted"
                      value={email}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-dark">Student / Faculty ID</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="User ID"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm"
                    disabled={loading || !file}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Cataloging Document...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload"></i>
                        <span>Upload to Repository</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Information & Guidelines */}
          <div className="col-lg-4">
            <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
              <h6 className="fw-bold text-dark mb-3">Repository Guidelines</h6>
              <ul className="list-unstyled small text-muted d-flex flex-column gap-2 mb-0">
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check-circle text-success mt-1"></i>
                  <span>Ensure syllabus files contain legible lecture schedules and subject codes.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check-circle text-success mt-1"></i>
                  <span>PDFs uploaded here are immediately available for selection in the <strong>RAG Assistant</strong>.</span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <i className="bi bi-check-circle text-success mt-1"></i>
                  <span>Stored in your MongoDB profile archive for personalized AI recommendations.</span>
                </li>
              </ul>
            </div>

            <div className="card border rounded-4 p-4 bg-white shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold text-dark mb-0">Repository Status</h6>
                <span className="badge bg-primary-subtle text-primary rounded-pill">
                  {uploadedFiles.length} {uploadedFiles.length === 1 ? 'File' : 'Files'}
                </span>
              </div>
              <p className="small text-muted mb-3">
                All documents cataloged in MongoDB are ready for vector grounding.
              </p>
              <button
                className="btn btn-outline-primary btn-sm w-100 rounded-3 d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate('/rag')}
              >
                <i className="bi bi-file-earmark-text"></i>
                <span>Open RAG Assistant</span>
              </button>
            </div>
          </div>
        </div>

        {/* Uploaded Documents Repository Section */}
        <div className="card border rounded-4 p-4 bg-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="fw-bold text-dark mb-0">📁 Your Uploaded Documents & Syllabus Repository</h5>
              <p className="text-muted small mb-0">Manage cataloged materials and select files for vector grounding</p>
            </div>
            <button
              className="btn btn-outline-secondary btn-sm rounded-3 d-flex align-items-center gap-1"
              onClick={fetchUploadedFiles}
              title="Refresh Repository"
            >
              <i className={`bi bi-arrow-clockwise ${fetchingFiles ? 'spin' : ''}`}></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>
          </div>

          {fetchingFiles ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
              <div className="text-muted small">Loading your uploaded repository...</div>
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="text-center py-5 border rounded-3 bg-light">
              <i className="bi bi-folder2-open fs-1 text-secondary opacity-50 mb-2 d-block"></i>
              <h6 className="fw-semibold text-dark">No documents in your repository yet</h6>
              <p className="small text-muted mb-0">
                Upload a syllabus or lecture PDF using the form above to populate your archive and enable RAG.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-secondary small text-uppercase">
                    <th className="px-3 py-3">Document Title</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Size</th>
                    <th className="py-3">Uploaded Date</th>
                    <th className="py-3 text-end px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFiles.map((item) => (
                    <tr key={item.id} className="border-bottom">
                      <td className="px-3 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: '38px',
                              height: '38px',
                              backgroundColor: item.isPdf ? '#fee2e2' : '#eff6ff',
                              color: item.isPdf ? '#dc2626' : '#2563eb',
                            }}
                          >
                            <i className={`bi ${item.isPdf ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark-text-fill'} fs-5`}></i>
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{item.fileName}</div>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {item.filePath ? item.filePath.split(/[\\/]/).pop() : 'Document'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`badge rounded-pill ${item.isPdf ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}`}>
                          {item.fileType ? item.fileType.toUpperCase() : 'PDF'}
                        </span>
                      </td>
                      <td className="py-3 text-muted small">
                        {formatFileSize(item.fileSize)}
                      </td>
                      <td className="py-3 text-muted small">
                        <i className="bi bi-calendar3 me-1"></i>
                        {item.uploadedAt || 'Recently'}
                      </td>
                      <td className="py-3 text-end px-3">
                        <div className="d-inline-flex gap-2">
                          <button
                            className="btn btn-sm btn-primary d-flex align-items-center gap-1 rounded-3"
                            onClick={() => handleUseInRag(item)}
                            title="Query this document in RAG Assistant"
                          >
                            <i className="bi bi-cpu"></i>
                            <span className="d-none d-md-inline">Use in RAG</span>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger border-0 rounded-2 p-1 px-2"
                            onClick={() => handleDeleteFile(item.id, item.fileName)}
                            title="Delete file"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Uploads;