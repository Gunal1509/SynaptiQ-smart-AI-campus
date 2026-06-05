import Img from '../assets/files.png';
import pro from '../assets/profiles.png';
import tim from '../assets/timetable.png';
import rag1 from '../assets/rag1.png';
import AI from '../assets/AI.png';
import axios from "axios";
import {useNavigate} from 'react-router-dom';
import {useEffect} from 'react';
import { useState } from 'react';
function Dashboard() {
    const navigate=useNavigate();
    useEffect(()=>{

        const token = localStorage.getItem("token");

        if(!token){

            navigate('/');

        }

    },[])
    const [showNotifications, setShowNotifications] = useState(false);
    const [profile,setProfile] = useState(null);

useEffect(()=>{

const email = localStorage.getItem("email");

axios.get(
`http://localhost:5000/profile/${email}`
)
.then((res)=>{
console.log("PROFILE DATA:", res.data);
setProfile(res.data);
})
.catch((err)=>{
console.log(err);
});

},[]);
    return(
        <div className="bg-success min-vh-100"
        style={{ width: "100%", overflowX: "auto" }}>
<nav className="navbar navbar-expand-lg navbar-dark bg-dark  w-100 px-4"
style={{
position: "sticky",
top: 0,
width: "100vw"
}}>
<div className="d-flex gap-2">
<button
className="btn btn-outline-light dropdown-toggle"
data-bs-toggle="dropdown"
>
☰
</button>
<ul className="dropdown-menu">
<li>
<a className="dropdown-item" href="/dashboard">
Dashboard
</a>
</li>
<li>
<a className="dropdown-item" href="#">
Settings
</a>
</li>
</ul>
<a className="navbar-brand fw-bold" href="#">
CampusCopilot
</a>
</div>
<div className="ms-auto d-flex gap-2">

<button
className="btn btn-outline-warning"
onClick={() => setShowNotifications(!showNotifications)}
>
🔔
</button>
</div>


<div className="ms-auto d-flex gap-2">
<button className="btn btn-outline-light"onClick={()=>{
localStorage.removeItem("token");
navigate('/');}}>
Logout
</button>
<div
className="d-flex align-items-center gap-2"
onClick={()=>navigate('/Profiles')}
style={{cursor:"pointer"}}
>

<img
src={
profile?.profile_photo ||
"https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
}
alt="profile"
style={{
width:"40px",
height:"40px",
borderRadius:"50%"
}}
/>

<span className="text-white fw-bold">
{profile?.student_name || "Profile"}
</span>

</div>
</div>
</nav>
{showNotifications && (

<div
className="position-fixed end-0 top-0 bg-light shadow p-3"
style={{
width:"300px",
height:"100vh",
zIndex:"1000"
}}
>

<h4>Notifications</h4>

<div className="alert alert-warning">DBMS Assignment due tomorrow
</div>

<div className="alert alert-info"> New React Material uploaded
</div>

<div className="alert alert-success"> Learn JWT Authentication
</div>

<div className="alert alert-primary">AI Class starts in 30 mins
</div>

<button
className="btn btn-danger w-100"
onClick={() => setShowNotifications(false)}
>
Close
</button>

</div>

)}

<div className="card p-4 rounded-4 d-inline-block mt-3 ms-4 fw-bold">
<h1> SynapticQ</h1>
<span>
    <p>one portal for all your needs</p>
</span>
</div>
<div className="d-flex align-items-start gap-4 mt-4 ms-4">
<button
className="border-0 bg-transparent p-0"
onClick={()=>navigate('/uploads')}>
<div 
className="card shadow rounded-4 mt-4 ms-4"
style={{width:"290px",backgroundColor:"#006234"}}
>

<img
src={Img}
className="card-img-top"
alt="Syllabus"
/>

<div className="card-body">

<h5 className="card-title fw-bold text-white">
Upload Syllabus
</h5>

<p className="card-text text-white">
Upload your files to share data and notes
</p>
</div>
</div>
</button>

  <button className="border-0 bg-transparent p-0"
onClick={()=>navigate('/Profiles')}>
    <div className="card shadow rounded-4 mt-4 ms-4" style={{width:"290px",backgroundColor:"#006234"}}>
        <img
src={pro}
className="card-img-top"
alt="profile"
/>
<div className="card-body">

<h5 className="card-title fw-bold text-white">
        Profile</h5>

<p className="card-text text-white">Manage your profile and settings</p>

</div>
    </div>
    </button>
    <button className="border-0 bg-transparent p-0"
onClick={()=>navigate('/timetable')}>
    <div className="card shadow rounded-4 mt-4 ms-4" style={{width:"290px",backgroundColor:"#006234"}}>
    <img
src={tim}
className="card-img-top"
alt="profile"/>
<div className="card-body">

<h5 className="card-title fw-bold text-white">
        TimeTable</h5>

<p className="card-text text-white">Manage your timetable with our portal</p>

</div>
    </div>
    </button>
    <button
className="border-0 bg-transparent p-0"
onClick={()=>navigate('/Rag')}>
<div 
className="card shadow rounded-4 mt-4 ms-4"
style={{width:"290px",backgroundColor:"#006234"}}
>

<img
src={rag1}
className="card-img-top"
alt="rag"
/>

<div className="card-body">

<h5 className="card-title fw-bold text-white">
Rag
</h5>

<p className="card-text text-white">
Upload files and ask query from document
</p>
</div>
</div>
</button>
<button
className="border-0 bg-transparent p-0"
onClick={()=>navigate('/AIAssisstant')}>
<div 
className="card shadow rounded-4 mt-4 ms-4"
style={{width:"290px",backgroundColor:"#006234"}}
>

<img
src={AI}
className="card-img-top"
alt="rag"
/>

<div className="card-body">

<h5 className="card-title fw-bold text-white">
AI Assisstant
</h5>

<p className="card-text text-white">
Ask Your Query And get Answer
</p>
</div>
</div>
</button>

</div>
</div>



    )}
export default Dashboard;