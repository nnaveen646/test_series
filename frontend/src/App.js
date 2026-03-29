import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  resetPassword,
  fetchTests,
  fetchTest,
  submitAttempt,
  fetchAttempts,
  fetchUserStats,
  fetchUserByPhone,
  adminLogin,
  adminFetchTests,
  adminDeleteTest,
  adminEditTest,
  adminUploadTests,
  setAuthToken,
} from './api';

const colors = {
  primary: '#2563EB',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
  neutral: '#6B7280',
};

const toastsInitial = { visible: false, message: '', type: 'info' };

function Toast({ toast, onClear }) {
  useEffect(() => {
    if (toast.visible) {
      const id = setTimeout(onClear, 3500);
      return () => clearTimeout(id);
    }
  }, [toast, onClear]);
  if (!toast.visible) return null;
  return <div className="toast">{toast.message}</div>;
}

function Header({ user, onLogout, isAdmin }) {
  const location = useLocation();
  return (
    <div className="header container">
      <div className="logo">ExamPrep Test Series</div>
      <div className="nav-actions">
        {!user && (
          <>
            <Link className="btn btn-secondary" to="/login">
              Login
            </Link>
            <Link className="btn btn-primary" to="/register">
              Register
            </Link>
          </>
        )}
        {user && !isAdmin && (
          <>
            <Link className="btn btn-secondary" to="/dashboard">
              Dashboard
            </Link>
            <button className="btn btn-danger" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
        {user && isAdmin && (
          <>
            <Link className="btn btn-secondary" to="/admin/dashboard">
              Admin
            </Link>
            <button className="btn btn-danger" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="container">
      <div className="card">
        <h1>Practice tests for UPSC, SSC, Banking, etc.</h1>
        <p>Timed tests • Detailed results • Review answers</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link className="btn btn-primary" to="/register">
            Register
          </Link>
          <Link className="btn btn-secondary" to="/login">
            Login
          </Link>
        </div>
      </div>
      <div className="grid grid-3">
        <div className="card">
          <h3>Timed assessments</h3>
          <p>Secure exam timers with low-distraction layout.</p>
        </div>
        <div className="card">
          <h3>Detailed analytics</h3>
          <p>Score trends, accuracy, and high-priority topics.</p>
        </div>
        <div className="card">
          <h3>Review answers</h3>
          <p>See correct vs. your choice with explanations.</p>
        </div>
      </div>
    </div>
  );
}

function Register({ onSuccess, pushToast }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    examInterest: 'UPSC',
    city: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(form);
      pushToast('Account created successfully', 'success');
      navigate('/login');
    } catch (err) {
      pushToast(err.response?.data?.detail || 'Registration failed', 'danger');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 500, margin: '0 auto' }}>
        <h2>Student Registration</h2>
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>Phone Number</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <label>Email (optional)</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label>Exam Interest</label>
          <select value={form.examInterest} onChange={(e) => setForm({ ...form, examInterest: e.target.value })}>
            <option>UPSC</option>
            <option>SSC</option>
            <option>Banking</option>
            <option>Other</option>
          </select>
          <label>City (optional)</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <label>Confirm Password</label>
          <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
          <label>
            <input type="checkbox" checked={form.agreeTerms} onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })} /> I agree to Terms
          </label>
          <button type="submit" className="btn btn-primary">Create account</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/login')} style={{ marginLeft: 8 }}>
            Already have an account? Login
          </button>
        </form>
      </div>
    </div>
  );
}

function Login({ onLogin, pushToast }) {
  const [tab, setTab] = useState('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('login');
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handlePasswordLogin = async () => {
    try {
      const result = await loginUser({ phone, password });
      onLogin({ ...result.data.user, access_token: result.data.access_token });
      pushToast('Login successful', 'success');
      navigate('/dashboard');
    } catch (err) {
      pushToast(err.response?.data?.detail || 'Login failed', 'danger');
    }
  };

  const handleSendOtp = async () => {
    try {
      const result = await sendOtp({ phone });
      setOtpSent(true);
      setStage('otp');
      pushToast(`OTP sent ${result.data.otp} (demo)`, 'success');
    } catch (err) {
      pushToast(err.response?.data?.detail || 'OTP send failed', 'danger');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const result = await verifyOtp({ phone, otp });
      onLogin({ ...result.data.user, access_token: result.data.access_token });
      pushToast('OTP verified. Logged in', 'success');
      navigate('/dashboard');
    } catch (err) {
      pushToast(err.response?.data?.detail || 'OTP verify failed', 'danger');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 500, margin: '0 auto' }}>
        <h2>Student Login</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className={`btn ${tab === 'password' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('password')}>Password login</button>
          <button className={`btn ${tab === 'otp' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('otp')}>OTP login</button>
        </div>
        {tab === 'password' ? (
          <>
            <label>Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn btn-primary" onClick={handlePasswordLogin}>Login</button>
          </>
        ) : (
          <>
            {stage === 'login' && (
              <>
                <label>Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                <button className="btn btn-primary" onClick={handleSendOtp}>Send OTP</button>
              </>
            )}
            {stage === 'otp' && (
              <>
                <label>Enter 6-digit OTP</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
                <button className="btn btn-primary" onClick={handleVerifyOtp}>Verify</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStage('login')}>Change number</button>
              </>
            )}
          </>
        )}
        <div style={{ marginTop: 12 }}>
          <Link to="/forgot">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}

function ForgotPassword({ pushToast }) {
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('enter');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendOtp = async () => {
    try {
      const result = await sendOtp({ phone });
      setStage('otp');
      pushToast(`OTP sent ${result.data.otp} (demo)`, 'success');
    } catch (err) {
      pushToast(err.response?.data?.detail || 'OTP send failed', 'danger');
    }
  };

  const handleReset = async () => {
    try {
      await verifyOtp({ phone, otp });
      if (password !== confirmPassword) {
        throw new Error('Password mismatch');
      }
      await resetPassword({ phone, otp, newPassword: password, confirmPassword });
      pushToast('Password updated', 'success');
      setStage('done');
    } catch (err) {
      pushToast(err.response?.data?.detail || err.message || 'Reset error', 'danger');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 500, margin: '0 auto' }}>
        <h2>Forgot Password</h2>
        {stage === 'enter' && (
          <>
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn btn-primary" onClick={handleSendOtp}>Send OTP</button>
          </>
        )}
        {stage === 'otp' && (
          <>
            <label>OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
            <label>New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button className="btn btn-primary" onClick={handleReset} disabled={password !== confirmPassword}>Set New Password</button>
          </>
        )}
        {stage === 'done' && <p>Password reset complete, please login again.</p>}
      </div>
    </div>
  );
}

function TestModal({ test, questions, onClose, onSubmitAttempt, onToast }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [time, setTime] = useState(test.durationMin * 60);
  const [showConfirmExit, setShowConfirmExit] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!test || questions.length === 0) return null;

  const currentQuestion = questions[current];
  const selected = answers[current];

  const handleAnswer = (option) => {
    setAnswers((prev) => {
      const newArr = [...prev];
      newArr[current] = newArr[current] === option ? null : option;
      return newArr;
    });
  };

  const doSubmit = () => {
    const answersPayload = questions.map((q, index) => ({ questionId: q.id, selectedOption: answers[index] }));
    onSubmitAttempt({ answers: answersPayload, timeSpentSec: test.durationMin * 60 - time });
    onClose();
  };

  const late = time < 120;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3>{test.testName}</h3>
          <div>
            <span style={{ marginRight: 12, fontWeight: 600, color: late ? colors.warning : colors.primary }}>
              {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}
            </span>
            <button className="btn btn-danger" onClick={() => setShowConfirmExit(true)}>Close</button>
          </div>
        </div>
        <div className="card status-card" style={{ marginBottom: 12 }}>
          <p>Q {current + 1} of {questions.length}</p>
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 999 }}>
            <div style={{ width: `${((current + 1) / questions.length) * 100}%`, background: colors.primary, height: '100%', borderRadius: 999 }} />
          </div>
        </div>
        <div className="card" style={{ marginBottom: 12 }}>
          <p><strong>{currentQuestion.questionText}</strong></p>
          {['A','B','C','D'].map((key) => (
            <div
              key={key}
              className={`question-item ${selected === key ? 'selected' : ''}`}
              onClick={() => handleAnswer(key)}
            >
              <strong>{key}</strong>. {currentQuestion[`option${key}`]}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-secondary" onClick={() => setCurrent((v) => Math.max(0, v - 1))} disabled={current === 0}>Back</button>
          {current < questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrent((v) => Math.min(questions.length - 1, v + 1))}>Next</button>
          ) : (
            <button className="btn btn-success" onClick={doSubmit}>Submit test</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Question palette</button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(38px,1fr))' }}>
          {questions.map((q, index) => {
            const status = answers[index] ? '#2563EB' : '#D1D5DB';
            return (
              <button
                key={q.id}
                style={{ width: '100%', minHeight: 42, background: status, color: '#fff', border: 'none', borderRadius: 6 }}
                onClick={() => setCurrent(index)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        {showConfirmExit && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: 380 }}>
              <p>Exit test? progress will be saved and you can resume later.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowConfirmExit(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={onClose}>Exit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard({ user, pushToast }) {
  const [testsAvailable, setTestsAvailable] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTest, setActiveTest] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewAttempt, setReviewAttempt] = useState(null);

  const loadData = async () => {
    try {
      const [testResp, attResp, statsResp] = await Promise.all([fetchTests(), fetchAttempts(user.id), fetchUserStats(user.id)]);
      setTestsAvailable(testResp.data.tests);
      setAttempts(attResp.data.attempts);
      setStats(statsResp.data);
    } catch (err) {
      pushToast('Failed to load dashboard', 'danger');
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const openTest = async (testId) => {
    try {
      const resp = await fetchTest(testId);
      setActiveTest(resp.data.test);
      setActiveQuestions(resp.data.questions);
      setModalOpen(true);
    } catch (err) {
      pushToast('Unable to load test', 'danger');
    }
  };

  const handleSubmitAttempt = async ({ answers, timeSpentSec }) => {
    try {
      const payload = { userId: user.id, testId: activeTest.id, answers, timeSpentSec };
      const resp = await submitAttempt(payload);
      pushToast('Test submitted', 'success');
      setResult({ ...resp.data.attempt, test: activeTest });
      setAttempts((prev) => [resp.data.attempt, ...prev]);
      const statsResp = await fetchUserStats(user.id);
      setStats(statsResp.data);
    } catch (err) {
      pushToast('Submit failed', 'danger');
    }
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div className="container">
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="card status-card">
          <h4>Total tests taken</h4>
          <p>{stats?.totalTests ?? 0}</p>
        </div>
        <div className="card status-card">
          <h4>Total study hours</h4>
          <p>{stats?.totalTimeMin ? `${stats.totalTimeMin.toFixed(1)} min` : '0 min'}</p>
        </div>
        <div className="card status-card">
          <h4>Average score</h4>
          <p>{stats?.averageScore ?? 0}%</p>
        </div>
        <div className="card status-card">
          <h4>Best score</h4>
          <p>{stats?.bestScore ?? 0}%</p>
        </div>
        <div className="card status-card">
          <h4>Last test taken</h4>
          <p>{stats?.lastTestAt ?? 'N/A'}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3>Available Tests</h3>
          <small>Most relevant for {user.examInterest}</small>
        </div>
        {testsAvailable.length === 0 ? (
          <p>No tests are currently available.</p>
        ) : (
          <div className="grid grid-3">
            {testsAvailable.slice(0, 6).map((test) => (
              <div className="card" key={test.id}>
                <h4>{test.testName}</h4>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="badge">{test.exam}</span>
                  <span className="badge">{test.difficulty}</span>
                  <span className="badge">{test.durationMin}m</span>
                </div>
                <p>{test.questionCount} questions</p>
                <button className="btn btn-primary" onClick={() => openTest(test.id)}>Take test</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Tests Taken</h3>
        {attempts.length === 0 ? (
          <p>No tests taken yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Test</th> <th>Date</th> <th>Time spent</th> <th>Correct</th> <th>Wrong</th> <th>%</th> <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((att) => {
                const test = testsAvailable.find((t) => t.id === att.testId) || activeTest;
                return (
                  <tr key={att.id}>
                    <td>{test?.testName ?? att.testId}</td>
                    <td>{new Date(att.submittedAt).toLocaleString()}</td>
                    <td>{att.timeSpentSec}s</td>
                    <td>{att.correctCount}</td>
                    <td>{att.wrongCount}</td>
                    <td>{att.percentage}%</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setReviewAttempt(att)}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && activeTest && (
        <TestModal
          test={activeTest}
          questions={activeQuestions}
          onClose={closeModal}
          onSubmitAttempt={handleSubmitAttempt}
          onToast={pushToast}
        />
      )}

      {result && (
        <div className="modal-backdrop" onClick={() => setResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Results</h3>
            <p>Score %: {result.percentage}</p>
            <p>Correct {result.correctCount}</p>
            <p>Wrong {result.wrongCount}</p>
            <p>Unattempted {result.unattemptedCount}</p>
            <p>Time spent {result.timeSpentSec}s</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setReviewAttempt(result)}>Review answers</button>
              <button className="btn btn-primary" onClick={() => setResult(null)}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      )}

      {reviewAttempt && (
        <div className="modal-backdrop" onClick={() => setReviewAttempt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Review attempt</h3>
            <p>{reviewAttempt.percentage}% | {reviewAttempt.correctCount}C {reviewAttempt.wrongCount}W {reviewAttempt.unattemptedCount}U</p>
            {(testsAvailable.find((t) => t.id === reviewAttempt.testId) ? activeQuestions : activeQuestions).map((q, idx) => {
              const answer = reviewAttempt.answers.find((a) => a.questionId === q.id);
              const selected = answer?.selectedOption;
              const correct = q.correctOption;
              const status = selected === correct ? 'Correct' : selected ? 'Wrong' : 'Unattempted';
              return (
                <div key={q.id} className="card" style={{ marginBottom: 8 }}>
                  <p>{idx + 1}. {q.questionText}</p>
                  <p>Selected: {selected || 'None'} | Correct: {correct} | {status}</p>
                </div>
              );
            })}
            <button className="btn btn-primary" onClick={() => setReviewAttempt(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ pushToast }) {
  const [testsData, setTestsData] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [editData, setEditData] = useState(null);
  const [questions, setQuestions] = useState([]);

  const loadTests = async () => {
    try {
      const resp = await adminFetchTests();
      setTestsData(resp.data.tests);
    } catch (err) {
      pushToast('Admin tests failed', 'danger');
    }
  };

  useEffect(() => { loadTests(); }, []);

  const doUpload = async () => {
    if (!file) {
      pushToast('Select CSV first', 'danger');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    try {
      await adminUploadTests(form);
      pushToast('Upload successful', 'success');
      loadTests();
    } catch (err) {
      pushToast('Upload failed', 'danger');
    }
  };

  const startEditTest = async (id) => {
    try {
      const resp = await fetchTest(id);
      setSelectedTest(resp.data.test);
      setEditData({
        testName: resp.data.test.testName,
        exam: resp.data.test.exam,
        durationMin: resp.data.test.durationMin,
        difficulty: resp.data.test.difficulty,
        topics: resp.data.test.topics,
      });
      setQuestions(resp.data.questions);
    } catch (err) {
      pushToast('Failed to load test for editing', 'danger');
    }
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveEdit = async () => {
    if (!selectedTest || !editData) return;
    try {
      await adminEditTest(selectedTest.id, {
        testName: editData.testName,
        exam: editData.exam,
        durationMin: Number(editData.durationMin),
        difficulty: editData.difficulty,
        topics: editData.topics.split(',').map((t) => t.trim()).filter(Boolean),
        questions: questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
        })),
      });
      pushToast('Test updated', 'success');
      setSelectedTest(null);
      setEditData(null);
      setQuestions([]);
      loadTests();
    } catch (err) {
      pushToast('Update failed', 'danger');
    }
  };

  const doDelete = async (id) => {
    if (!window.confirm('Delete test? This removes it for students too.')) return;
    try {
      await adminDeleteTest(id);
      pushToast('Deleted', 'success');
      loadTests();
    } catch (err) {
      pushToast('Delete failed', 'danger');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Admin Test Management</h2>
        <p>CSV columns: testName, exam, durationMin, difficulty, topics, questionId, questionText, optionA, optionB, optionC, optionD, correctOption</p>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
        <button className="btn btn-primary" onClick={doUpload}>Upload & Create Tests</button>
      </div>
      <div className="card">
        <h3>Created Tests</h3>
        <table className="table">
          <thead>
            <tr><th>Test name</th><th>Exam</th><th>Duration</th><th>Questions</th><th>Last updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {testsData.map((t) => (
              <tr key={t.id}>
                <td>{t.testName}</td>
                <td>{t.exam}</td>
                <td>{t.durationMin}</td>
                <td>{t.questionCount}</td>
                <td>{new Date(t.updatedAt).toLocaleString()}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => startEditTest(t.id)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => doDelete(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTest && editData && (
        <div className="modal-backdrop" onClick={() => setSelectedTest(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Test</h3>
            <label>Test Name</label>
            <input value={editData.testName} onChange={(e) => setEditData({ ...editData, testName: e.target.value })} />
            <label>Exam</label>
            <input value={editData.exam} onChange={(e) => setEditData({ ...editData, exam: e.target.value })} />
            <label>Duration</label>
            <input value={editData.durationMin} onChange={(e) => setEditData({ ...editData, durationMin: e.target.value })} />
            <label>Difficulty</label>
            <input value={editData.difficulty} onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })} />
            <label>Topics (comma-separated)</label>
            <input value={editData.topics} onChange={(e) => setEditData({ ...editData, topics: e.target.value })} />

            <h4>Questions</h4>
            <div style={{ maxHeight: '40vh', overflow: 'auto', marginBottom: 12 }}>
              {questions.map((q, idx) => (
                <div key={q.id} className="card" style={{ marginBottom: 8 }}>
                  <label>Q{idx + 1}</label>
                  <input value={q.questionText} onChange={(e) => updateQuestion(idx, 'questionText', e.target.value)} />
                  {['A','B','C','D'].map((opt) => (
                    <div key={opt} style={{ marginTop: 4 }}>
                      <label>{opt}</label>
                      <input value={q[`option${opt}`]} onChange={(e) => updateQuestion(idx, `option${opt}`, e.target.value)} />
                    </div>
                  ))}
                  <label>Correct option</label>
                  <select value={q.correctOption} onChange={(e) => updateQuestion(idx, 'correctOption', e.target.value)}>
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>D</option>
                  </select>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTest(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(toastsInitial);

  useEffect(() => {
    const session = localStorage.getItem('examprep-user');
    if (session) {
      const parsed = JSON.parse(session);
      setUser(parsed);
      if (parsed.access_token) {
        setAuthToken(parsed.access_token);
      }
    }
  }, []);

  const pushToast = (message, type = 'info') => setToast({ visible: true, message, type });
  const clearToast = () => setToast(toastsInitial);

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem('examprep-user', JSON.stringify(u));
    if (u.access_token) {
      setAuthToken(u.access_token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('examprep-user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <Header user={user} onLogout={handleLogout} isAdmin={isAdmin} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register onSuccess={handleLogin} pushToast={pushToast} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} pushToast={pushToast} />} />
        <Route path="/forgot" element={<ForgotPassword pushToast={pushToast} />} />
        <Route path="/dashboard" element={user && !isAdmin ? <Dashboard user={user} pushToast={pushToast} /> : <LandingPage />} />
        <Route path="/admin/login" element={<AdminLogin onLogin={handleLogin} pushToast={pushToast} />} />
        <Route path="/admin/dashboard" element={user && isAdmin ? <AdminDashboard pushToast={pushToast} /> : <LandingPage />} />
      </Routes>
      <Toast toast={toast} onClear={clearToast} />
    </>
  );
}

function AdminLogin({ onLogin, pushToast }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const doLogin = async () => {
    try {
      const result = await adminLogin({ phone, password });
      if (result.data.user.role !== 'admin') {
        throw new Error('Not an admin');
      }
      onLogin({ ...result.data.user, access_token: result.data.access_token });
      pushToast('Admin login success', 'success');
      navigate('/admin/dashboard');
    } catch (err) {
      pushToast(err.response?.data?.detail || err.message || 'Login failed', 'danger');
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h2>Admin Login</h2>
        <label>Username / Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary" onClick={doLogin}>Login</button>
      </div>
    </div>
  );
}

export default App;
