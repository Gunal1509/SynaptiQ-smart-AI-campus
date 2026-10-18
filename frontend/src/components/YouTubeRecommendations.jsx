import { useState, useEffect } from 'react';
import { pythonApi, authService } from '../services/api';

const YouTubeRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [topic, setTopic] = useState('');
  const [reason, setReason] = useState('');
  const [learningGap, setLearningGap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('');
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  const email = authService.getEmail();

  const fetchRecommendations = async (topicOverride = '') => {
    setLoading(true);
    setError('');

    try {
      const params = { limit: 5 };
      if (topicOverride) {
        params.topic = topicOverride;
      }
      if (email) {
        params.email = email;
      }

      const res = await pythonApi.get('/recommendations', { params });
      if (res.data) {
        setTopic(res.data.topic || '');
        setReason(res.data.reason || '');
        setLearningGap(res.data.learning_gap || null);
        setRecommendations(res.data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Unable to load personalized recommendations. Please verify the AI backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(selectedTopicFilter);
  }, [selectedTopicFilter]);

  const handleWatchVideo = (video) => {
    setActiveVideoModal(video);

    // Track user interaction asynchronously
    try {
      pythonApi.post('/recommendations/interaction', {
        video_id: video.video_id,
        topic: video.topic || topic,
        action: 'clicked',
        watch_time_seconds: 0,
      }).catch((e) => console.debug('Non-blocking interaction tracking notice:', e));
    } catch (e) {
      console.debug(e);
    }
  };

  const handleDismissModal = () => {
    setActiveVideoModal(null);
  };

  return (
    <div className="card border rounded-4 bg-white shadow-sm p-4 mb-4">
      {/* Section Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="rounded-3 d-flex align-items-center justify-content-center text-white"
              style={{ width: '32px', height: '32px', backgroundColor: '#ef4444' }}
            >
              <i className="bi bi-youtube fs-5"></i>
            </span>
            <h5 className="fw-bold text-dark mb-0">🎯 Recommended for You</h5>
          </div>
          <p className="text-muted small mb-0">
            AI-curated learning paths synthesized from your diagnostic scores, uploaded notes, and semantic similarity
          </p>
        </div>

        {/* Filters and Refresh */}
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            value={selectedTopicFilter}
            onChange={(e) => setSelectedTopicFilter(e.target.value)}
            style={{ width: '190px' }}
          >
            <option value="">🎯 Auto (AI Gap Detection)</option>
            <option value="Database Normalization">Database Normalization</option>
            <option value="TCP Congestion Control">TCP Congestion Control</option>
            <option value="Deadlocks & Memory">Deadlocks & OS Memory</option>
            <option value="Spring Security & JWT">Spring Security & JWT</option>
          </select>

          <button
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-3"
            onClick={() => fetchRecommendations(selectedTopicFilter)}
            title="Refresh Recommendations"
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Why This Topic Banner */}
      {!loading && !error && topic && (
        <div
          className="p-3 rounded-3 mb-4 d-flex align-items-start gap-3 border"
          style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
        >
          <div
            className="p-2 rounded-circle d-flex align-items-center justify-content-center text-primary flex-shrink-0 mt-1"
            style={{ backgroundColor: '#eff6ff', width: '36px', height: '36px' }}
          >
            <i className="bi bi-lightbulb-fill fs-6"></i>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>
                Recommended Topic: {topic}
              </span>
              {learningGap && (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                  {learningGap.source === 'quiz_assessment'
                    ? 'Assessment Gap Detected'
                    : learningGap.source === 'rag_document'
                    ? 'Course Notes Context'
                    : 'Curriculum Core'}
                </span>
              )}
            </div>
            <p className="text-secondary small mb-0 leading-relaxed">
              {reason || 'These resources are recommended based on your recent activity and curriculum requirements.'}
            </p>
          </div>
        </div>
      )}

      {/* State 1: Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h6 className="fw-bold text-dark mb-1">Finding the best learning resources for you...</h6>
          <p className="text-muted small mb-0">
            Analyzing quiz weak points, retrieving candidate lectures, and scoring semantic relevance.
          </p>
        </div>
      )}

      {/* State 2: Error */}
      {!loading && error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 small">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <div>{error}</div>
          </div>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => fetchRecommendations(selectedTopicFilter)}
          >
            Retry
          </button>
        </div>
      )}

      {/* State 3: Empty */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-collection-play fs-1 text-secondary opacity-50 mb-2 d-block"></i>
          <h6 className="fw-medium text-dark">No personalized recommendations available yet</h6>
          <p className="small mb-3">
            Complete a diagnostic quiz or upload your lecture materials to trigger AI learning gap detection.
          </p>
          <button
            className="btn btn-primary btn-sm px-3 rounded-3"
            onClick={() => fetchRecommendations('Database Normalization')}
          >
            Explore Core Recommendations
          </button>
        </div>
      )}

      {/* State 4: Video Recommendations Grid */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="row g-3">
          {recommendations.map((video, idx) => {
            const matchPercentage = Math.round((video.final_score || 0.85) * 100);
            return (
              <div className="col-12 col-md-6 col-xl-4" key={video.video_id || idx}>
                <div className="card h-100 border rounded-4 bg-white shadow-xs overflow-hidden card-elevated d-flex flex-column justify-content-between">
                  <div>
                    {/* Thumbnail with duration overlay */}
                    <div className="position-relative" style={{ aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#0f172a' }}>
                      <img
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                        alt={video.title}
                        className="w-100 h-100 object-fit-cover transition-all"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleWatchVideo(video)}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400';
                        }}
                      />
                      {video.duration && (
                        <span
                          className="position-absolute bottom-0 end-0 m-2 px-2 py-1 rounded text-white fw-semibold"
                          style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', fontSize: '0.72rem' }}
                        >
                          <i className="bi bi-clock me-1"></i>
                          {video.duration}
                        </span>
                      )}
                      <span
                        className="position-absolute top-0 start-0 m-2 badge rounded-pill px-2 py-1"
                        style={{
                          backgroundColor:
                            video.difficulty === 'Beginner'
                              ? '#dcfce7'
                              : video.difficulty === 'Advanced'
                              ? '#fee2e2'
                              : '#eff6ff',
                          color:
                            video.difficulty === 'Beginner'
                              ? '#166534'
                              : video.difficulty === 'Advanced'
                              ? '#991b1b'
                              : '#1e40af',
                          fontSize: '0.7rem',
                        }}
                      >
                        {video.difficulty || 'Intermediate'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-3">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <small className="text-muted text-truncate fw-medium" style={{ maxWidth: '65%' }}>
                          <i className="bi bi-person-video me-1"></i>
                          {video.channel || 'Academic Creator'}
                        </small>
                        <span
                          className="badge rounded-pill fw-bold"
                          style={{
                            backgroundColor: matchPercentage >= 85 ? '#dcfce7' : '#eff6ff',
                            color: matchPercentage >= 85 ? '#15803d' : '#1d4ed8',
                            fontSize: '0.75rem',
                          }}
                        >
                          {matchPercentage}% Match
                        </span>
                      </div>

                      <h6
                        className="fw-bold text-dark mb-2 text-truncate-2"
                        style={{
                          fontSize: '0.92rem',
                          lineHeight: '1.4',
                          cursor: 'pointer',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: '2.8em',
                        }}
                        title={video.title}
                        onClick={() => handleWatchVideo(video)}
                      >
                        {video.title}
                      </h6>

                      {/* Why Recommended Pill */}
                      <div
                        className="p-2 rounded-3 small mb-2 text-muted"
                        style={{ backgroundColor: '#f8fafc', fontSize: '0.78rem', lineHeight: '1.45', borderLeft: '3px solid #2563eb' }}
                      >
                        <strong className="text-dark d-block mb-1">
                          <i className="bi bi-check2-circle text-primary me-1"></i>Why recommended:
                        </strong>
                        {video.reason || 'Semantic alignment with your syllabus requirements.'}
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="px-3 pb-3 pt-0">
                    <button
                      className="btn btn-outline-primary btn-sm w-100 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-medium"
                      onClick={() => handleWatchVideo(video)}
                    >
                      <i className="bi bi-play-circle-fill"></i>
                      <span>Watch Lecture</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideoModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1200 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 overflow-hidden shadow-lg">
              <div className="modal-header bg-dark text-white border-0 py-3 px-4">
                <h6 className="modal-title fw-bold text-truncate me-3" style={{ fontSize: '0.95rem' }}>
                  {activeVideoModal.title}
                </h6>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleDismissModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body p-0" style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideoModal.video_id}?autoplay=1`}
                  title={activeVideoModal.title}
                  className="w-100 h-100 border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="modal-footer bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                <div className="small text-muted">
                  <span className="fw-semibold text-dark">{activeVideoModal.channel}</span> • Match Score:{' '}
                  <span className="fw-bold text-primary">
                    {Math.round((activeVideoModal.final_score || 0.85) * 100)}%
                  </span>
                </div>
                <div className="d-flex gap-2">
                  <a
                    href={activeVideoModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-secondary rounded-3"
                  >
                    Open on YouTube <i className="bi bi-box-arrow-up-right ms-1"></i>
                  </a>
                  <button className="btn btn-sm btn-dark rounded-3" onClick={handleDismissModal}>
                    Close Player
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeRecommendations;
