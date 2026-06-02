import { User } from "lucide-react";
import { Link } from "react-router";
import AddAvailability from "../doctor/AddAvailability";
import MeetingRequests from "../doctor/MeetingRequests";

const DoctorDash = () => {
  return (
    <div className="min-h-screen bg-base-200/50">
      {/* Navbar with Glassmorphism */}
      <div className="navbar sticky top-0 bg-base-100/80 backdrop-blur-md border-b border-base-300 shadow-sm z-50 px-4 md:px-8">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow-lg border border-base-200">
              <li><Link to="/doctordash" className="font-medium">Home</Link></li>
              <li><Link to="/patients" className="font-medium">Patients</Link></li>
            </ul>
          </div>
          <span className="mx-2 font-extrabold text-2xl tracking-tight text-base-content">
            MediRaksha <span className="text-primary">Doctor</span>
          </span>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 gap-2">
            <li><Link to="/doctordash" className="font-medium rounded-lg hover:bg-base-200 transition-colors">Home</Link></li>
            <li><Link to="/patients" className="font-medium rounded-lg hover:bg-base-200 transition-colors">Patients</Link></li>
          </ul>
        </div>

        <div className="navbar-end">
          <Link to="/doctorprofile">
            <div className="btn btn-primary btn-outline btn-sm md:btn-md rounded-full shadow-sm hover:shadow-md transition-all">
              <User size={18} />
              <span className="hidden sm:inline">Profile</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        <AddAvailability />
        <div className="divider opacity-30" />
        <MeetingRequests />
      </main>
    </div>
  );
};

export default DoctorDash;
