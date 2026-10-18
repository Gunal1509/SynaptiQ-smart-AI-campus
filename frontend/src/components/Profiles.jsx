import { useState, useEffect } from 'react';
import Layout from './Layout';
import { nodeApi, authService } from '../services/api';

const Profiles = () => {
  const email = authService.getEmail();
  const [studentName, setStudentName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (email) {
      nodeApi.get(`/profile/${email}`)
        .then((res) => {
          if (res.data) {
            setStudentName(res.data.student_name || '');
            setRegNo(res.data.reg_no || '');
            setDepartment(res.data.department || '');
            setYear(res.data.year || '');
            setPhone(res.data.phone || '');
            if (res.data.profile_photo) {
              setPhotoUrl(res.data.profile_photo);
              setPhotoPreview(res.data.profile_photo);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load profile', err);
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [email]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize large images to maximum 800px while maintaining aspect ratio
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoPreview(optimizedDataUrl);
          setPhotoUrl(optimizedDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage({ type: '', text: '' });

    try {
      await nodeApi.post('/profile', {
        email,
        student_name: studentName,
        reg_no: regNo,
        department,
        year,
        phone,
        profile_photo: photoUrl,
      });

      setStatusMessage({
        type: 'success',
        text: 'Profile records saved successfully under campus database.',
      });
    } catch (err) {
      console.error(err);
      let errorText = 'Failed to update profile. Please ensure you are authenticated.';
      if (err.response?.status === 413) {
        errorText = 'Avatar image payload is too large. Please select a smaller photo.';
      } else if (err.response?.data?.message) {
        errorText = err.response.data.message;
      }
      setStatusMessage({
        type: 'danger',
        text: errorText,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container-fluid p-0">
        <div className="mb-4">
          <h4 className="fw-bold text-dark mb-1">Student Profile & Credentials</h4>
          <p className="text-muted small">Manage your academic identity, department affiliations, and contact details</p>
        </div>

        {statusMessage.text && (
          <div className={`alert alert-${statusMessage.type} alert-dismissible fade show rounded-3 small mb-4`} role="alert">
            <i className={`bi ${statusMessage.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
            {statusMessage.text}
            <button type="button" className="btn-close" onClick={() => setStatusMessage({ type: '', text: '' })}></button>
          </div>
        )}

        <div className="row g-4">
          {/* Left Column: Profile Card */}
          <div className="col-lg-4">
            <div className="card border rounded-4 p-4 bg-white shadow-sm text-center">
              <div className="position-relative d-inline-block mx-auto mb-3">
                <img
                  src={
                    photoPreview ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
                  }
                  alt="Student Avatar"
                  className="rounded-circle object-fit-cover border shadow-sm"
                  style={{ width: '120px', height: '120px' }}
                  onError={(e) => {
                    e.target.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
                  }}
                />
              </div>

              <h5 className="fw-bold text-dark mb-1">{studentName || 'Student Name'}</h5>
              <p className="text-muted small mb-3">{email}</p>

              <div className="d-flex justify-content-center gap-2 mb-3">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1">
                  {department || 'Department Unset'}
                </span>
                <span className="badge bg-secondary-subtle text-secondary border rounded-pill px-3 py-1">
                  {year || 'Year Unset'}
                </span>
              </div>

              <div className="border-top pt-3 text-start small">
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Register Number:</span>
                  <span className="fw-semibold text-dark">{regNo || '—'}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Contact Phone:</span>
                  <span className="fw-semibold text-dark">{phone || '—'}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Portal Auth:</span>
                  <span className="badge bg-success-subtle text-success">Active JWT</span>
                </div>
              </div>

              <div className="mt-3 text-start">
                <label className="form-label small text-muted fw-medium">Update Avatar</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control form-control-sm"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Edit Form */}
          <div className="col-lg-8">
            <div className="card border rounded-4 p-4 bg-white shadow-sm">
              <h5 className="fw-bold text-dark mb-3">Academic Information</h5>

              {fetching ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark">Full Legal Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Alex Johnson"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark">University Register No.</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 717822P101"
                        value={regNo}
                        onChange={(e) => setRegNo(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark">Department</label>
                      <select
                        className="form-select"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                      >
                        <option value="">Select Department</option>
                        <option value="CSE">Computer Science & Engineering (CSE)</option>
                        <option value="IT">Information Technology (IT)</option>
                        <option value="ECE">Electronics & Communication (ECE)</option>
                        <option value="EEE">Electrical & Electronics (EEE)</option>
                        <option value="MECH">Mechanical Engineering (MECH)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark">Academic Year</label>
                      <select
                        className="form-select"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        required
                      >
                        <option value="">Select Academic Year</option>
                        <option value="1st Year">1st Year (Freshman)</option>
                        <option value="2nd Year">2nd Year (Sophomore)</option>
                        <option value="3rd Year">3rd Year (Junior)</option>
                        <option value="4th Year">4th Year (Senior)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark">Campus Email (Locked)</label>
                      <input
                        type="email"
                        className="form-control bg-light text-muted"
                        value={email || ''}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-dark">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-top d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          <span>Saving Profile...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save"></i>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profiles;