import { useState } from "react";
import axiosInstance from "../api/axios";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";


const Auth = () => {
  const [su, setsu] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // 🔹 Signup
  const handleSignup = async () => {
    try {
      await axiosInstance.post("/auth", {
        name,
        email,
        password,
      });

      toast.success("Signup successful");
      await handleLogin(); // auto-login
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "User already exists. Try logging in."
      );
    }
  };

  // 🔹 Login
  const handleLogin = async () => {
    try {
      await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      toast.success("Login successful");

      const res = await axiosInstance.get("/home");
      const data = res.data;

      if (!data.gender || !data.age) {
        window.location.href = "/details";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Wrong username or password"
      );
    }
  };

  // 🔹 Signup UI
  if (su) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-full max-w-sm shadow-xl bg-base-100">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft size={24} />
              </Link>
              <h2 className="text-2xl font-bold text-center grow">Sign Up</h2>
              <div className="w-6"></div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSignup();
              }}
            >
              <label className="form-control w-full mb-4">
                <span className="label-text">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </label>

              <label className="form-control w-full mb-4">
                <span className="label-text">Username</span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </label>

              <label className="form-control w-full mb-6">
                <span className="label-text">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </label>

              <button type="submit" className="btn btn-primary mt-4 w-full">
                Sign Up
              </button>
            </form>
            <div className="divider">OR</div>

            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const res = await axiosInstance.post("/auth/google", {
                    token: credentialResponse.credential,
                  });

                  toast.success("Logged in with Google");

                  const data = res.data;

                  if (!data.gender || !data.age) {
                    window.location.href = "/details";
                  } else {
                    window.location.href = "/";
                  }
                } catch (err) {
                  toast.error("Google login failed");
                }
              }}
              onError={() => {
                toast.error("Google login failed");
              }}
            />


            <p className="justify-self-start cursor-pointer mt-2">
              <span onClick={() => setsu(false)}>
                Already have an account?
              </span>
              <Link to="/doctor" className="ml-3">
                doctor&apos;s account?
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 🔹 Login UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm shadow-xl bg-base-100">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft size={24} />
            </Link>
            <h2 className="text-2xl font-bold text-center grow">Log In</h2>
            <div className="w-6"></div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <label className="form-control w-full mb-4">
              <span className="label-text">Username</span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input input-bordered w-full"
                autoFocus
                required
              />
            </label>

            <label className="form-control w-full mb-6">
              <span className="label-text">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </label>

            <button type="submit" className="btn btn-accent mt-4 w-full">
              Log In
            </button>
          </form>
          <div className="divider">OR</div>

          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const res = await axiosInstance.post("/auth/google", {
                  token: credentialResponse.credential,
                });

                toast.success("Logged in with Google");

                const data = res.data;

                if (!data.gender || !data.age) {
                  window.location.href = "/details";
                } else {
                  window.location.href = "/";
                }
              } catch (err) {
                toast.error("Google login failed");
              }
            }}
            onError={() => {
              toast.error("Google login failed");
            }}
          />


          <p
            className="justify-self-start cursor-pointer mt-2"
            onClick={() => setsu(true)}
          >
            Don&apos;t have an account?
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
