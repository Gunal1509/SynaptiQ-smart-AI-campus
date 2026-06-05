import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
const Profiles = () => {
    const email = localStorage.getItem("email");
const [studentName,setStudentName] = useState("");
const [regNo,setRegNo] = useState("");
const [department,setDepartment] = useState("");
const [year,setYear] = useState("");
const [phone,setPhone] = useState("");
const [photo,setPhoto] = useState(null);
    const handleSave = async(e)=>{

e.preventDefault();

await axios.post(
"http://localhost:5000/profile",
{
email,
student_name:studentName,
reg_no:regNo,
department,
year,
phone,
profile_photo:""
}
);

alert("Profile Saved");

};

    return (

        <div className="bg-success min-vh-100 py-4">

            <div className="container">

                <h2 className="fw-bold text-white">
                    Profile
                </h2>

            </div>

            <div className="container mt-4">

                <div
                    className="card shadow rounded-4 p-3"
                    style={{maxWidth:"500px"}}
                >

                    <h4 className="fw-bold mb-0">
                        📧 Email Id : {email}
                    </h4>

                </div>

            </div>

            <div className="container mt-5 d-flex justify-content-center">

                <div
                    className="card shadow rounded-4 p-4"
                    style={{
                        maxWidth:"700px",
                        width:"100%"
                    }}
                >

                    <h3 className="text-center fw-bold mb-4">
                        Student Profile
                    </h3>

                    <form onSubmit={handleSave}>

                        <div className="mb-3">
                            <label className="form-label">
                                Student Name
                            </label>

                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter your name"
                                value={studentName}
                                onChange={(e)=>setStudentName(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Register Number
                            </label>

                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter register number"
                                value={regNo}
                                onChange={(e)=>setRegNo(e.target.value)}
                            />
                        </div>

                        <div className="row">

                            <div className="col-md-6 mb-3">

                                <label className="form-label">
                                    Department
                                </label>

                                <select
                                        className="form-select"
                                        value={department}
                                        onChange={(e)=>setDepartment(e.target.value)}
                                        >
                                        <option value="">Select Department</option>
                                        <option>CSE</option>
                                        <option>IT</option>
                                        <option>ECE</option>
                                        <option>EEE</option>
                                        <option>MECH</option>
                                        </select>

                            </div>

                            <div className="col-md-6 mb-3">

                                <label className="form-label">
                                    Year
                                </label>
                                <select
                                    className="form-select"
                                    value={year}
                                    onChange={(e)=>setYear(e.target.value)}
                                    >
                                    <option value="">Select Year</option>
                                    <option>1st Year</option>
                                    <option>2nd Year</option>
                                    <option>3rd Year</option>
                                    <option>4th Year</option>
                                    </select>
                            </div>

                        </div>

                        <div className="mb-3">

                            <label className="form-label">
                                Email
                            </label>

                            <input
                                type="email"
                                className="form-control"
                                value={email || ""}
                                readOnly
                            />

                        </div>

                        <div className="mb-3">

                                <label className="form-label">
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    className="form-control"
                                    placeholder="Enter phone number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />

                            </div>

                        <div className="mb-3">

                            <label className="form-label">
                                Upload Profile Photo
                            </label>

                            <input
                                    type="file"
                                    className="form-control"
                                    onChange={(e)=>setPhoto(e.target.files[0])}
                                    />

                        </div>

                        <button
                            type="submit"
                            className="btn btn-success w-100"
                        >
                            Save Profile
                        </button>

                    </form>

                </div>

            </div>

        </div>

    );
};

export default Profiles;