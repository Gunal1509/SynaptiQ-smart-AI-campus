import axios from 'axios';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
function Login({setuser}) {
    const navigate=useNavigate()
    const[email,setEmail]=useState('');
    const[password,setPassword]=useState('');
    const handlelogin=async(e)=>{
        e.preventDefault();
        console.log("BUTTON CLICKED");
        console.log(email,password);
        try{
            const response=await axios.post('http://localhost:5000/login',{email,password});
           if(response.data.token){

localStorage.setItem("token", response.data.token);
    localStorage.setItem("email", email);

    setuser({
        email
    });
    navigate('/dashboard');
    console.log(email)

}
console.log(response.data);
        }
        catch(error){


            if(error.response){
                alert(error.response.data.message);
            }
        }
    };
return (

<div className="row vh-100">

<div className="col-md-6 text-white d-flex justify-content-center align-items-center" style={{backgroundColor:"#19107d"}}>
<div>
<h1>AI Smart Campus Assistant</h1>
<p>Login to continue</p>
</div>
</div>


<div className="col-md-6 bg-dark d-flex justify-content-center align-items-center">

<div className="card shadow p-4 rounded-5 hover-card" style={{width:"400px"}}>

<h2 className="text-center mb-4">
Login
</h2>

<form onSubmit={handlelogin}>

<div className="mb-3">
<label>Email</label>
<input
type="email"
className="form-control"
onChange={(e)=>setEmail(e.target.value)}
/>
</div>

<div className="mb-3">
<label>Password</label>
<input
type="password"
className="form-control"
onChange={(e)=>setPassword(e.target.value)}
/>
</div>

<button className="btn btn-primary w-100" style={{backgroundColor:"#19107d"}}>
Login
</button>

<p className="text-center mt-3">
No account?
<button
type="button"
className="btn btn-link"
onClick={()=>navigate('/signup')}
>
Sign Up
</button>
</p>

</form>

</div>

</div>

</div>

)

}

export default Login;