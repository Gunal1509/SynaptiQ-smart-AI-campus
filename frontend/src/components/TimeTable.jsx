import { useState } from 'react';
import Layout from './Layout';

const TimeTable = () => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedSemester, setSelectedSemester] = useState('5');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const scheduleData = {
    Monday: [
      { time: '09:00 - 10:00 AM', code: 'CS8591', subject: 'Computer Networks', room: 'LH-201', faculty: 'Dr. S. Raman', type: 'Lecture' },
      { time: '10:00 - 11:00 AM', code: 'CS8592', subject: 'Database Management Systems', room: 'LH-201', faculty: 'Prof. K. Priya', type: 'Lecture' },
      { time: '11:15 - 12:15 PM', code: 'EC8691', subject: 'Microprocessors & Microcontrollers', room: 'LH-104', faculty: 'Dr. A. Verma', type: 'Lecture' },
      { time: '01:15 - 03:15 PM', code: 'CS8581', subject: 'DBMS Laboratory', room: 'Lab 3 (Ground Floor)', faculty: 'Prof. K. Priya', type: 'Lab' },
      { time: '03:30 - 04:30 PM', code: 'CS8501', subject: 'Theory of Computation', room: 'LH-201', faculty: 'Dr. M. Suresh', type: 'Tutorial' },
    ],
    Tuesday: [
      { time: '09:00 - 10:00 AM', code: 'CS8501', subject: 'Theory of Computation', room: 'LH-201', faculty: 'Dr. M. Suresh', type: 'Lecture' },
      { time: '10:00 - 11:00 AM', code: 'CS8591', subject: 'Computer Networks', room: 'LH-201', faculty: 'Dr. S. Raman', type: 'Lecture' },
      { time: '11:15 - 12:15 PM', code: 'MA8551', subject: 'Algebra & Number Theory', room: 'LH-203', faculty: 'Dr. N. Lakshmi', type: 'Lecture' },
      { time: '01:15 - 03:15 PM', code: 'CS8582', subject: 'Networks Laboratory', room: 'Lab 2 (First Floor)', faculty: 'Dr. S. Raman', type: 'Lab' },
      { time: '03:30 - 04:30 PM', code: 'CS8592', subject: 'Database Management Systems', room: 'LH-201', faculty: 'Prof. K. Priya', type: 'Tutorial' },
    ],
    Wednesday: [
      { time: '09:00 - 10:00 AM', code: 'MA8551', subject: 'Algebra & Number Theory', room: 'LH-203', faculty: 'Dr. N. Lakshmi', type: 'Lecture' },
      { time: '10:00 - 11:00 AM', code: 'EC8691', subject: 'Microprocessors & Microcontrollers', room: 'LH-104', faculty: 'Dr. A. Verma', type: 'Lecture' },
      { time: '11:15 - 12:15 PM', code: 'CS8591', subject: 'Computer Networks', room: 'LH-201', faculty: 'Dr. S. Raman', type: 'Lecture' },
      { time: '01:15 - 02:15 PM', code: 'CS8592', subject: 'Database Management Systems', room: 'LH-201', faculty: 'Prof. K. Priya', type: 'Lecture' },
      { time: '02:30 - 04:30 PM', code: 'AI8511', subject: 'AI Project Mentoring Session', room: 'Seminar Hall 1', faculty: 'Staff Committee', type: 'Activity' },
    ],
    Thursday: [
      { time: '09:00 - 10:00 AM', code: 'EC8691', subject: 'Microprocessors & Microcontrollers', room: 'LH-104', faculty: 'Dr. A. Verma', type: 'Lecture' },
      { time: '10:00 - 11:00 AM', code: 'CS8501', subject: 'Theory of Computation', room: 'LH-201', faculty: 'Dr. M. Suresh', type: 'Lecture' },
      { time: '11:15 - 12:15 PM', code: 'MA8551', subject: 'Algebra & Number Theory', room: 'LH-203', faculty: 'Dr. N. Lakshmi', type: 'Lecture' },
      { time: '01:15 - 03:15 PM', code: 'EC8681', subject: 'Microprocessor Laboratory', room: 'HW Lab 1', faculty: 'Dr. A. Verma', type: 'Lab' },
      { time: '03:30 - 04:30 PM', code: 'LIB001', subject: 'Library & Digital Self Study', room: 'Central Library', faculty: 'Librarian', type: 'Self Study' },
    ],
    Friday: [
      { time: '09:00 - 10:00 AM', code: 'CS8592', subject: 'Database Management Systems', room: 'LH-201', faculty: 'Prof. K. Priya', type: 'Lecture' },
      { time: '10:00 - 11:00 AM', code: 'MA8551', subject: 'Algebra & Number Theory', room: 'LH-203', faculty: 'Dr. N. Lakshmi', type: 'Lecture' },
      { time: '11:15 - 12:15 PM', code: 'CS8501', subject: 'Theory of Computation', room: 'LH-201', faculty: 'Dr. M. Suresh', type: 'Lecture' },
      { time: '01:15 - 03:00 PM', code: 'SEM005', subject: 'Department Seminar & Presentation', room: 'Auditorium B', faculty: 'HOD & Faculty', type: 'Seminar' },
      { time: '03:15 - 04:30 PM', code: 'CCA001', subject: 'Co-Curricular / Sports Activity', room: 'Campus Grounds', faculty: 'Physical Director', type: 'Sports' },
    ],
  };

  const currentSchedule = scheduleData[selectedDay] || [];

  const handleDownload = () => {
    alert(`Downloading Official Timetable for Semester ${selectedSemester} (PDF)...`);
  };

  return (
    <Layout>
      <div className="container-fluid p-0">
        {/* Header Bar */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h4 className="fw-bold text-dark mb-1">Academic Timetable & Schedule</h4>
            <p className="text-muted small mb-0">
              Department of Computer Science & Engineering • Academic Year 2025–26
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="1">Semester 1 (Sec A)</option>
              <option value="2">Semester 2 (Sec A)</option>
              <option value="3">Semester 3 (Sec A)</option>
              <option value="4">Semester 4 (Sec A)</option>
              <option value="5">Semester 5 (Sec A)</option>
              <option value="6">Semester 6 (Sec A)</option>
              <option value="7">Semester 7 (Sec A)</option>
              <option value="8">Semester 8 (Sec A)</option>
            </select>

            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 shadow-sm text-nowrap"
              onClick={handleDownload}
            >
              <i className="bi bi-download"></i>
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Day Selector Pills */}
        <div className="card border rounded-4 p-2 bg-white shadow-sm mb-4">
          <div className="nav nav-pills nav-fill gap-2" role="tablist">
            {days.map((day) => (
              <button
                key={day}
                className={`nav-link py-2 rounded-3 fw-medium ${
                  selectedDay === day ? 'active bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
                }`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Table Card */}
        <div className="card border rounded-4 bg-white shadow-sm overflow-hidden mb-4">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <div className="fw-bold text-dark d-flex align-items-center gap-2">
              <i className="bi bi-clock-history text-primary"></i>
              <span>{selectedDay} Schedule — Semester {selectedSemester}</span>
            </div>
            <span className="badge bg-light text-muted border px-3 py-1 rounded-pill small">
              {currentSchedule.length} Periods Scheduled
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="text-secondary small text-uppercase">
                  <th className="px-4 py-3" style={{ width: '200px' }}>Time Slot</th>
                  <th className="py-3">Course Code & Subject</th>
                  <th className="py-3">Location / Room</th>
                  <th className="py-3">Faculty / Instructor</th>
                  <th className="py-3 text-center" style={{ width: '130px' }}>Category</th>
                </tr>
              </thead>
              <tbody>
                {currentSchedule.map((slot, idx) => (
                  <tr key={idx} className="border-bottom">
                    <td className="px-4 py-3 fw-semibold text-dark">
                      <i className="bi bi-alarm me-2 text-primary small"></i>
                      {slot.time}
                    </td>
                    <td className="py-3">
                      <div className="fw-bold text-dark">{slot.subject}</div>
                      <small className="text-muted">{slot.code}</small>
                    </td>
                    <td className="py-3 text-dark">
                      <i className="bi bi-geo-alt me-1 text-muted"></i>
                      {slot.room}
                    </td>
                    <td className="py-3 text-secondary">
                      {slot.faculty}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`badge rounded-pill px-3 py-1 ${
                          slot.type === 'Lab'
                            ? 'bg-warning-subtle text-warning-emphasis'
                            : slot.type === 'Lecture'
                            ? 'bg-primary-subtle text-primary'
                            : slot.type === 'Tutorial'
                            ? 'bg-info-subtle text-info-emphasis'
                            : 'bg-secondary-subtle text-secondary'
                        }`}
                      >
                        {slot.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Timetable Downloads for All Semesters */}
        <div className="card border rounded-4 bg-white shadow-sm p-4">
          <h6 className="fw-bold text-dark mb-3">Department Master Timetable Files</h6>
          <div className="row g-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <div className="col-12 col-sm-6 col-md-3" key={sem}>
                <div className="p-3 border rounded-3 d-flex align-items-center justify-content-between bg-light">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-file-earmark-pdf text-danger fs-4"></i>
                    <div>
                      <div className="fw-semibold text-dark small">Semester {sem} (A & B)</div>
                      <small className="text-muted">Updated Feb 2026</small>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-primary border-0 rounded-circle p-2"
                    title={`Download Semester ${sem} Timetable`}
                    onClick={() => alert(`Downloading Semester ${sem} Timetable PDF...`)}
                  >
                    <i className="bi bi-download"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TimeTable;