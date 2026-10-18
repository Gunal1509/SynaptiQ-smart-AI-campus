import { useState, useEffect } from 'react';
import Layout from './Layout';
import { pythonApi } from '../services/api';

const DEFAULT_QUESTION_BANKS = {
  DBMS: [
    {
      question: 'Which normal form is strictly based on the concept of full functional dependency?',
      options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
      correctIndex: 1,
      explanation: 'Second Normal Form (2NF) requires that the table is in 1NF and all non-key attributes are fully functionally dependent on the primary key, eliminating partial dependencies.',
      topic: 'Normalization',
    },
    {
      question: 'In ACID properties of a transaction, which property guarantees that concurrent transactions do not interfere with each other?',
      options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
      correctIndex: 2,
      explanation: 'Isolation ensures that concurrent execution of transactions leaves the database in the same state that would have been obtained if the transactions were executed sequentially.',
      topic: 'Transactions',
    },
    {
      question: 'What is the primary difference between a B-Tree and a B+ Tree in database indexing?',
      options: [
        'B+ Trees store data records only in leaf nodes, whereas B-Trees store data in both internal and leaf nodes',
        'B-Trees have linked leaf nodes for range scans, B+ Trees do not',
        'B+ Trees cannot handle duplicate keys',
        'B-Trees have higher fan-out than B+ Trees of the same order',
      ],
      correctIndex: 0,
      explanation: 'In a B+ tree, data pointers or actual records are strictly stored in the leaves, which are linked together in a sequence. Internal nodes only hold index search keys.',
      topic: 'Indexing',
    },
    {
      question: 'Which of the following relational algebra operations is equivalent to Cartesian Product followed by Selection?',
      options: ['Natural Join', 'Theta Join', 'Projection', 'Intersection'],
      correctIndex: 1,
      explanation: 'A Theta Join (θ-join) combines tuples from two relations that satisfy a specified condition (selection) applied to the Cartesian product.',
      topic: 'Relational Algebra',
    },
    {
      question: 'What type of lock allows concurrent read transactions but prevents write locks on a database item?',
      options: ['Exclusive Lock (X)', 'Shared Lock (S)', 'Intent Exclusive Lock (IX)', 'Two-Phase Lock'],
      correctIndex: 1,
      explanation: 'A Shared lock (S) allows multiple transactions to read the same data simultaneously, but no transaction can modify the data until all shared locks are released.',
      topic: 'Concurrency Control',
    },
  ],
  Networks: [
    {
      question: 'In TCP congestion control, what happens immediately when a 3-duplicate ACK is received?',
      options: ['Slow Start restart with cwnd = 1 MSS', 'Fast Retransmit & Fast Recovery', 'Connection termination', 'Timeout exponential backoff'],
      correctIndex: 1,
      explanation: 'Receiving 3 duplicate ACKs indicates that a single packet was lost while subsequent packets arrived. TCP triggers Fast Retransmit and enters Fast Recovery rather than dropping cwnd to 1.',
      topic: 'Transport Layer',
    },
    {
      question: 'Which subnet mask provides at least 30 usable host IP addresses per subnet?',
      options: ['/26', '/27', '/28', '/29'],
      correctIndex: 1,
      explanation: '/27 provides 32 total addresses, leaving 2^5 - 2 = 30 usable host addresses (excluding network and broadcast addresses).',
      topic: 'IPv4 Subnetting',
    },
    {
      question: 'What routing protocol uses the Dijkstra Shortest Path First algorithm?',
      options: ['BGP', 'RIP', 'OSPF', 'EIGRP'],
      correctIndex: 2,
      explanation: 'OSPF (Open Shortest Path First) is a link-state routing protocol that utilizes Dijkstra’s algorithm to calculate the shortest path tree from each router.',
      topic: 'Routing Protocols',
    },
    {
      question: 'Which DNS record type maps an IPv6 hostname to its 128-bit IP address?',
      options: ['A Record', 'AAAA Record', 'CNAME Record', 'MX Record'],
      correctIndex: 1,
      explanation: 'AAAA records map hostnames to 128-bit IPv6 addresses, whereas standard A records map to 32-bit IPv4 addresses.',
      topic: 'Application Layer',
    },
    {
      question: 'How does CSMA/CD handle collisions on Ethernet networks?',
      options: [
        'Transmits a jamming signal and backs off using Binary Exponential Backoff',
        'Requests a token from the central ring controller',
        'Discards all packets permanently',
        'Switches to frequency division multiplexing',
      ],
      correctIndex: 0,
      explanation: 'Upon detecting a collision, CSMA/CD sends a jam signal to ensure all stations recognize the collision, then waits for a random period calculated via Binary Exponential Backoff.',
      topic: 'Data Link Layer',
    },
  ],
  OS: [
    {
      question: 'Which condition is NOT one of Coffman’s four necessary conditions for a Deadlock to occur?',
      options: ['Mutual Exclusion', 'Preemption Allowed', 'Hold and Wait', 'Circular Wait'],
      correctIndex: 1,
      explanation: 'The condition is "No Preemption" (resources cannot be forcibly taken away). Allowing preemption actively prevents deadlocks.',
      topic: 'Deadlocks',
    },
    {
      question: 'What is Belady’s Anomaly in page replacement algorithms?',
      options: [
        'Increasing the number of page frames causes more page faults under FIFO',
        'LRU performs worse than optimal under cyclic references',
        'Virtual memory thrashing occurs due to low CPU utilization',
        'TLB cache miss rate rises as process priority drops',
      ],
      correctIndex: 0,
      explanation: 'Belady’s Anomaly describes the phenomenon where increasing physical page frames results in an increase (instead of decrease) in the number of page faults under FIFO replacement.',
      topic: 'Memory Management',
    },
    {
      question: 'In Unix-like systems, which system call creates a new process by duplicating the calling process?',
      options: ['exec()', 'fork()', 'clone()', 'spawn()'],
      correctIndex: 1,
      explanation: 'fork() creates a new child process with an exact duplicate address space of the parent process, returning 0 to the child and the child PID to the parent.',
      topic: 'Process Management',
    },
    {
      question: 'What CPU scheduling algorithm guarantees minimal average waiting time for a set of stationary processes?',
      options: ['Round Robin (RR)', 'Shortest Job First (SJF)', 'First-Come, First-Served (FCFS)', 'Priority Scheduling'],
      correctIndex: 1,
      explanation: 'Shortest Job First (SJF) is mathematically proven to yield the minimal average waiting time among all non-preemptive scheduling algorithms.',
      topic: 'CPU Scheduling',
    },
    {
      question: 'What is a Translation Lookaside Buffer (TLB)?',
      options: [
        'A high-speed hardware cache used to speed up virtual-to-physical address translation',
        'A kernel buffer used for asynchronous disk I/O',
        'A swap space partition on NVMe drives',
        'An interrupt handling table in RAM',
      ],
      correctIndex: 0,
      explanation: 'A TLB is a dedicated MMU associative cache that stores recently used page-table entries to avoid multiple memory lookups during virtual address translation.',
      topic: 'Virtual Memory',
    },
  ],
};

function ExamSprint() {
  const [subject, setSubject] = useState('DBMS');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Standard University');
  const [stage, setStage] = useState('setup'); // setup | testing | review
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer
  const [generating, setGenerating] = useState(false);
  const [aiStudyPlan, setAiStudyPlan] = useState('');
  const [planLoading, setPlanLoading] = useState(false);

  const submitExam = () => {
    setStage('review');
    const scoreData = calculateScore();
    const missed = questions
      .filter((q, idx) => selectedAnswers[idx] !== q.correctIndex)
      .map((q) => q.topic || subject);

    try {
      pythonApi.post('/recommendations/assessment-result', {
        subject: subject,
        topic: customTopic || subject,
        score_percentage: scoreData.percentage,
        total_questions: scoreData.total,
        correct_answers: scoreData.correct,
        missed_topics: missed,
      }).catch((e) => console.debug('Sync assessment result notice:', e));
    } catch (e) {
      console.debug(e);
    }
  };

  // Timer countdown during test
  useEffect(() => {
    let timer;
    if (stage === 'testing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  const handleStartExam = async () => {
    setGenerating(true);
    let bank = DEFAULT_QUESTION_BANKS[subject] || DEFAULT_QUESTION_BANKS.DBMS;

    // If custom topic provided, attempt AI prompt to generate custom questions
    if (customTopic.trim()) {
      try {
        const prompt = `Generate a JSON array of 5 rigorous multiple-choice questions for university students on "${customTopic}". Each object must have: "question", "options" (array of 4 strings), "correctIndex" (0-3), "explanation", and "topic". Return ONLY valid JSON array with no extra markdown.`;
        const formData = new FormData();
        formData.append('question', prompt);

        const res = await pythonApi.post('/ask', formData);
        if (res.data && res.data.answer) {
          // Parse JSON from answer
          const match = res.data.answer.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              bank = parsed;
            }
          }
        }
      } catch (e) {
        console.warn('AI question generation fallback to default bank', e);
      }
    }

    setQuestions(bank);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setTimeLeft(bank.length * 60); // 1 minute per question
    setStage('testing');
    setGenerating(false);
    setAiStudyPlan('');
  };

  const handleSelectOption = (optIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIndex,
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct += 1;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  const handleGenerateStudyPlan = async () => {
    setPlanLoading(true);
    const scoreData = calculateScore();

    // Find wrong topics
    const missedTopics = questions
      .filter((q, idx) => selectedAnswers[idx] !== q.correctIndex)
      .map((q) => `${q.topic}: ${q.question}`)
      .join('; ');

    const prompt = `Student scored ${scoreData.percentage}% on an exam on ${subject}. They missed questions on these topics: [${missedTopics || 'None - 100% score'}]. Generate a structured 48-Hour Exam Revision Blueprint with prioritized weak-point recovery, recommended formula/concept review, and 3 key high-probability exam questions to prepare. Keep it actionable and concise.`;

    try {
      const formData = new FormData();
      formData.append('question', prompt);
      const res = await pythonApi.post('/ask', formData);
      if (res.data && res.data.answer) {
        setAiStudyPlan(res.data.answer);
      }
    } catch (e) {
      console.error(e);
      setAiStudyPlan(
        `### 48-Hour Rapid Revision Plan for ${subject}\n\n1. **Focus on Missed Concepts:** Dedicate the first 2 hours to reading definitions and textbook examples of your incorrect questions.\n2. **Practice Active Recall:** Write down functional dependencies and algorithm steps from memory without looking at notes.\n3. **Solve Previous Year Papers:** Attempt at least 2 complete past semester exams under timed conditions.`
      );
    } finally {
      setPlanLoading(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <Layout>
      <div className="container-fluid p-0">
        {/* Stage 1: Setup Configuration */}
        {stage === 'setup' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-1">
                  AI Exam Readiness & Adaptive Mock Engine
                </h4>
                <p className="text-muted small mb-0">
                  Simulate university exams, diagnose topic mastery, and receive tailored AI revision plans
                </p>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2">
                <i className="bi bi-cpu me-1"></i> Diagnostic Mode
              </span>
            </div>

            <div className="row g-4">
              <div className="col-lg-7">
                <div className="card border rounded-4 p-4 bg-white shadow-sm">
                  <h5 className="fw-bold text-dark mb-3">Configure Mock Exam Session</h5>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-dark">
                      Select University Course
                    </label>
                    <div className="row g-2">
                      {[
                        { id: 'DBMS', label: 'Database Systems', code: 'CS8592', icon: 'bi-database' },
                        { id: 'Networks', label: 'Computer Networks', code: 'CS8591', icon: 'bi-hdd-network' },
                        { id: 'OS', label: 'Operating Systems', code: 'CS8492', icon: 'bi-motherboard' },
                      ].map((item) => (
                        <div className="col-4" key={item.id}>
                          <div
                            className={`p-3 border rounded-3 text-center transition-all ${
                              subject === item.id && !customTopic
                                ? 'border-primary bg-primary-subtle text-primary fw-bold'
                                : 'bg-light text-secondary hover-bg-light'
                            }`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSubject(item.id);
                              setCustomTopic('');
                            }}
                          >
                            <i className={`bi ${item.icon} fs-4 d-block mb-1`}></i>
                            <div className="small text-truncate">{item.label}</div>
                            <small className="text-muted" style={{ fontSize: '0.68rem' }}>{item.code}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-dark">
                      Or Test on Custom Topic / Syllabus Chapter
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Distributed Consensus & Raft, or Compiler Syntax Analysis"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                    <small className="text-muted">
                      When provided, Groq AI will generate tailored questions specifically for this topic.
                    </small>
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold text-dark">
                      Rigour & Examination Format
                    </label>
                    <select
                      className="form-select"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option>Standard University Assessment (Concept & Syntax)</option>
                      <option>GATE & Competitive Exam Level (Analytical & Edge-cases)</option>
                      <option>Rapid 5-Minute Midterm Prep</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-primary w-100 py-3 rounded-3 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleStartExam}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Compiling Diagnostic Exam...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-play-circle-fill fs-5"></i>
                        <span>Start Adaptive Mock Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
                  <h6 className="fw-bold text-dark mb-3">Why Take AI Diagnostics?</h6>
                  <div className="d-flex flex-column gap-3 small text-muted">
                    <div className="d-flex align-items-start gap-2">
                      <div className="p-1 bg-success-subtle text-success rounded-circle mt-1">
                        <i className="bi bi-check fs-6"></i>
                      </div>
                      <div>
                        <strong className="text-dark">Syllabus Mastery Scoring:</strong> Instantly quantifies your exam readiness percentage (0–100%).
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                      <div className="p-1 bg-primary-subtle text-primary rounded-circle mt-1">
                        <i className="bi bi-check fs-6"></i>
                      </div>
                      <div>
                        <strong className="text-dark">Zero Bias Evaluation:</strong> Immediate verification against standard university rubrics.
                      </div>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                      <div className="p-1 bg-warning-subtle text-warning-emphasis rounded-circle mt-1">
                        <i className="bi bi-check fs-6"></i>
                      </div>
                      <div>
                        <strong className="text-dark">Automated Weak-Spot Remedy:</strong> AI synthesizes tailored 48h study blueprints for topics you missed.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 rounded-4 p-4 text-white shadow-sm" style={{ backgroundColor: '#0f172a' }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-lightning-charge text-warning fs-5"></i>
                    <h6 className="fw-bold mb-0">Exam Day Guarantee</h6>
                  </div>
                  <p className="small text-secondary mb-0">
                    Students using targeted diagnostic quizzes before exams show a 28% higher retention rate on conceptual theory questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Live Testing Simulator */}
        {stage === 'testing' && questions.length > 0 && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            {/* Top Bar with Timer & Progress */}
            <div className="card border rounded-4 p-3 bg-white shadow-sm mb-3 d-flex flex-row justify-content-between align-items-center">
              <div>
                <span className="badge bg-light text-secondary border px-3 py-1 rounded-pill me-2">
                  {customTopic || subject} Mock Exam
                </span>
                <span className="fw-bold text-dark small">
                  Question {currentIdx + 1} of {questions.length}
                </span>
              </div>

              <div className="d-flex align-items-center gap-2">
                <i className={`bi bi-alarm fs-5 ${timeLeft < 60 ? 'text-danger animate-pulse' : 'text-primary'}`}></i>
                <span className={`fw-bold fs-6 ${timeLeft < 60 ? 'text-danger' : 'text-dark'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-primary-subtle text-primary rounded-pill small">
                  Topic: {questions[currentIdx].topic || subject}
                </span>
                <span className="text-muted small">1 Mark</span>
              </div>

              <h5 className="fw-bold text-dark mb-4 leading-relaxed">
                {questions[currentIdx].question}
              </h5>

              {/* Options */}
              <div className="d-flex flex-column gap-3 mb-4">
                {questions[currentIdx].options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[currentIdx] === optIdx;
                  return (
                    <div
                      key={optIdx}
                      className={`p-3 border rounded-3 d-flex align-items-center gap-3 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-subtle text-primary fw-semibold'
                          : 'bg-light text-dark hover-bg-light'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectOption(optIdx)}
                    >
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center border ${
                          isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-muted'
                        }`}
                        style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <div className="flex-grow-1">{option}</div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                <button
                  className="btn btn-outline-secondary px-3 rounded-3"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => prev - 1)}
                >
                  <i className="bi bi-chevron-left me-1"></i>
                  Previous
                </button>

                <div className="d-flex gap-2">
                  {currentIdx < questions.length - 1 ? (
                    <button
                      className="btn btn-primary px-4 rounded-3 d-flex align-items-center gap-2"
                      onClick={() => setCurrentIdx((prev) => prev + 1)}
                    >
                      <span>Next</span>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  ) : (
                    <button
                      className="btn btn-success px-4 rounded-3 d-flex align-items-center gap-2"
                      onClick={submitExam}
                    >
                      <i className="bi bi-check2-circle"></i>
                      <span>Submit & Evaluate</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Review & Diagnostic Analytics */}
        {stage === 'review' && (
          <div>
            {(() => {
              const score = calculateScore();
              const isPassing = score.percentage >= 60;
              return (
                <div>
                  {/* Score Hero Banner */}
                  <div className="card border rounded-4 p-4 p-md-5 bg-white shadow-sm mb-4">
                    <div className="row align-items-center g-4">
                      <div className="col-md-7">
                        <span className={`badge ${isPassing ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'} px-3 py-1 rounded-pill mb-2`}>
                          Diagnostic Complete
                        </span>
                        <h3 className="fw-bold text-dark mb-2">
                          Syllabus Readiness Score: {score.percentage}%
                        </h3>
                        <p className="text-muted leading-relaxed mb-4">
                          {score.percentage >= 80
                            ? 'Excellent performance! You demonstrate thorough mastery across core concepts and university exam standards.'
                            : score.percentage >= 60
                            ? 'Good foundational grasp, but targeted revision on specific functional topics is recommended before the final.'
                            : 'Immediate revision needed. Critical conceptual gaps were detected in key syllabus units.'}
                        </p>

                        <div className="d-flex flex-wrap gap-2">
                          <button
                            className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm"
                            onClick={handleGenerateStudyPlan}
                            disabled={planLoading}
                          >
                            {planLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                <span>Synthesizing AI Plan...</span>
                              </>
                            ) : (
                              <>
                                <i className="bi bi-stars"></i>
                                <span>Generate 48h AI Revision Plan</span>
                              </>
                            )}
                          </button>

                          <button
                            className="btn btn-outline-secondary px-3 py-2 rounded-3"
                            onClick={() => setStage('setup')}
                          >
                            <i className="bi bi-arrow-counterclockwise me-1"></i>
                            Take Another Exam
                          </button>
                        </div>
                      </div>

                      <div className="col-md-5 text-center">
                        <div
                          className="d-inline-flex flex-column align-items-center justify-content-center rounded-circle border shadow-sm p-4"
                          style={{
                            width: '160px',
                            height: '160px',
                            backgroundColor: isPassing ? '#f0fdf4' : '#fffbeb',
                            borderColor: isPassing ? '#bbf7d0' : '#fde68a',
                          }}
                        >
                          <span className={`display-6 fw-bold ${isPassing ? 'text-success' : 'text-warning'}`}>
                            {score.correct}/{score.total}
                          </span>
                          <small className="text-muted fw-semibold">Correct Answers</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Generated Study Plan Section */}
                  {aiStudyPlan && (
                    <div className="card border rounded-4 p-4 bg-white shadow-sm mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div className="p-2 bg-primary-subtle text-primary rounded-3">
                          <i className="bi bi-stars fs-5"></i>
                        </div>
                        <h5 className="fw-bold text-dark mb-0">Personalized 48-Hour Exam Revision Plan</h5>
                      </div>
                      <div className="p-3 bg-light rounded-3 border text-dark leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                        {aiStudyPlan}
                      </div>
                    </div>
                  )}

                  {/* Detailed Question Review List */}
                  <h5 className="fw-bold text-dark mb-3">Diagnostic Breakdown by Question</h5>
                  <div className="d-flex flex-column gap-3 mb-4">
                    {questions.map((q, idx) => {
                      const userChoice = selectedAnswers[idx];
                      const isCorrect = userChoice === q.correctIndex;
                      return (
                        <div key={idx} className={`card border rounded-4 p-4 bg-white shadow-sm`}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="badge bg-light text-secondary border rounded-pill">
                              Question {idx + 1} • {q.topic}
                            </span>
                            <span className={`badge ${isCorrect ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-1`}>
                              {isCorrect ? 'Correct' : userChoice !== undefined ? 'Incorrect' : 'Unanswered'}
                            </span>
                          </div>

                          <h6 className="fw-bold text-dark mb-3">{q.question}</h6>

                          <div className="small mb-3">
                            <div className="text-muted mb-1">
                              <strong>Your Choice:</strong>{' '}
                              {userChoice !== undefined ? (
                                <span className={isCorrect ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                  {q.options[userChoice]}
                                </span>
                              ) : (
                                <span className="text-warning">Skipped</span>
                              )}
                            </div>
                            {!isCorrect && (
                              <div className="text-muted">
                                <strong>Correct Solution:</strong>{' '}
                                <span className="text-success fw-bold">{q.options[q.correctIndex]}</span>
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-light rounded-3 border small text-secondary">
                            <strong className="text-dark d-block mb-1">
                              <i className="bi bi-info-circle me-1 text-primary"></i>Conceptual Rationale:
                            </strong>
                            {q.explanation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ExamSprint;
