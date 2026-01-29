import { useState } from "react";
import axiosInstance from "../api/axios";
import { Link } from "react-router"; // 
import { ArrowLeft } from "lucide-react"; //

const Auth = () => {
  const [su, setsu] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Handle Signup
  const handleSignup = async () => {
    try {
      await axiosInstance.post("/auth", {
        name,
        email,
        password,
      });

      console.log("Signup successful");
      handleLogin(); // auto-login (cookie-based)
    } catch (error) {
      window.alert("Signup error:", error.response?.data || error.msg);
    }
  };

  
  // Handle Login
  const handleLogin = async () => {
    try {
      await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      const res = await axiosInstance.get("/home");

      const data = res.data;
      
      console.log("Login successful");

      if (!data.gender || !data.age) {
        window.location.href = "/details";
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      window.alert("Login error:", error.response?.data || error.message);
    }
  };



  // 🔹 UI Rendering
  if (su) {
    // Signup Form
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-full max-w-sm shadow-xl bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft size={24} />
              </Link>
              <h2 className="text-2xl font-bold text-center grow">Sign Up</h2>
              <div className="w-6"></div> {/* Spacer to balance the title */}
            </div>

            <label className="form-control w-full mb-4">
              <div className="label">
                <span className="label-text">Name</span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="input input-bordered w-full"
              />
            </label>

            <label className="form-control w-full mb-4">
              <div className="label">
                <span className="label-text">Username</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username"
                className="input input-bordered w-full"
              />
            </label>

            <label className="form-control w-full mb-6">
              <div className="label">
                <span className="label-text">Password</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input input-bordered w-full"
              />
            </label>

            <button onClick={handleSignup} className="btn btn-primary w-full">Sign Up</button>
            <p className="justify-self-start cursor-pointer" >
              <span onClick={() => setsu(false)}>Already have an account?</span>
              <Link to="/doctor" className="ml-3">doctor's account?</Link>
            </p>
          </div>
        </div>
      </div>
    );
  } else {
    // Login Form
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-full max-w-sm shadow-xl bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft size={24} />
              </Link>
              <h2 className="text-2xl font-bold text-center grow">Log In</h2>
              <div className="w-6"></div> {/* Spacer to balance the title */}
            </div>

            <label className="form-control w-full mb-4">
              <div className="label">
                <span className="label-text">Username</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username"
                className="input input-bordered w-full"
              />
            </label>

            <label className="form-control w-full mb-6">
              <div className="label">
                <span className="label-text">Password</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input input-bordered w-full"
              />
            </label>

            <button onClick={handleLogin} className="btn btn-accent w-full">Log In</button>
            <p className="justify-self-start cursor-pointer" onClick={() => setsu(true)}>
              Don't have an account?
            </p>
          </div>
        </div>
      </div>
    );
  }
};

export default Auth;
