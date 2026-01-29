import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axios";
import { Hospital, ClipboardMinus, FileClock } from "lucide-react";

// Placeholder data for demonstration
const quickActions = [
  {
    id: 1,
    title: "Find Nearby Hospitals",
    icon: <Hospital />,
    description: "Use real-time location tracking.",
    style: "btn-primary",
    view: "/map",
  },
  {
    id: 2,
    title: "Upload Medical Reports",
    icon: <ClipboardMinus />,
    description: "Securely upload and manage reports.",
    style: "btn-secondary",
    view: "/upload",
  },
  {
    id: 3,
    title: "View Health Summary",
    icon: <FileClock />,
    description: "See history and recent interactions.",
    style: "btn-accent",
    view: "/history",
  },
];

export default function Dashboard() {
  const [name, setName] = useState("Sign up to access features");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    age: "",
  });

  const getUser = async () => {
    try {
      const res = await axiosInstance.get("/home");
      const data = res.data;

      setUser(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        gender: data.gender || "",
        age: data.age || "",
      });
      setName(data.name || "Sign up to access features");
    } catch (error) {
      console.error(error.response?.data?.msg || "Error fetching user details");
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Personalized Welcome Banner */}
        <div className="hero rounded-2xl bg-base-200 p-8 shadow-xl">
          <div className="hero-content flex-col lg:flex-row-reverse w-full p-0">
            <div>
              <h1 className="text-4xl font-bold text-base-content">
                Hello, {name}!
              </h1>
              <p className="py-2 text-lg text-base-content/80">
                Your health ecosystem is live. Quickly access nearby care,
                manage your reports, and stay connected.
              </p>
            </div>
          </div>
        </div>


        {/* Quick Actions Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-base-content">
            Quick Access & Primary Tasks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className="card shadow-lg bg-base-100 transition duration-300 transform hover:scale-[1.02] cursor-pointer"
              >
                <div className="card-body p-6">
                  <div
                    className={`text-4xl font-bold mb-3 ${action.style.replace("btn-", "text-")}`}
                  >
                    {action.icon}
                  </div>
                  <h3 className="card-title text-xl text-base-content">
                    {action.title}
                  </h3>
                  <p className="text-base-content/70 text-sm mt-1">
                    {action.description}
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <Link
                      to={action.view}
                      className={`btn btn-sm ${action.style}`}
                    >
                      Go Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
