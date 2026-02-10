import React, { useState } from "react";
import RegisteredDoctor from "./RegisteredDoctor";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
export default function MyDoctor() {
  const [searchTerm, setSearchTerm] = useState("");

  // 🏥 All Doctors
  const allDoctors = [
    {
      name: "Amit Sharma",
      specialization: "Cardiologist",
      hospital: "Apollo Hospital",
      experience: 12,
      contact: "+91 9876543210",
      email: "amit.sharma@apollo.com",
    },
    {
      name: "Priya Mehta",
      specialization: "Dermatologist",
      hospital: "Fortis Hospital",
      experience: 8,
      contact: "+91 9123456780",
      email: "priya.mehta@fortis.com",
    },
    {
      name: "Rahul Verma",
      specialization: "Orthopedic",
      hospital: "AIIMS",
      experience: 15,
      contact: "+91 9988776655",
      email: "rahul.verma@aiims.com",
    },
  ];

  // 🔵 Registered Doctor State
  const [registeredDoctor, setRegisteredDoctor] = useState(allDoctors[0]);

  // 🔍 Filter doctors
  const filteredDoctors = allDoctors.filter((doc) =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔁 Change Doctor Function
  const handleChangeDoctor = (doctor) => {
    setRegisteredDoctor(doctor);
    alert(`You have successfully changed your doctor to Dr. ${doctor.name}`);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      
      {/* 🔎 SEARCH SECTION */}
      <Link to="/" className="text-gray-500 hover:text-gray-700">
        <ArrowLeft size={24} />
      </Link>
      <div style={{ marginBottom: "30px" }}>
        <h2>Search Doctors</h2>
        <input
          type="text"
          placeholder="Search by doctor name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "10px",
            width: "300px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* 🔎 SEARCH RESULTS */}
      {searchTerm && (
        <div style={{ marginBottom: "40px" }}>
          <h3>Search Results</h3>
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc, index) => (
              <div
                key={index}
                style={{
                  background: "#f1f1f1",
                  padding: "15px",
                  borderRadius: "10px",
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h4>Dr. {doc.name}</h4>
                  <p>{doc.specialization}</p>
                  <p>{doc.hospital}</p>
                </div>

                {/* 🔁 Change Doctor Button */}
                <button
                  onClick={() => handleChangeDoctor(doc)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      registeredDoctor.name === doc.name
                        ? "#28a745"
                        : "#007bff",
                    color: "white",
                  }}
                >
                  {registeredDoctor.name === doc.name
                    ? "Current Doctor"
                    : "Change Doctor"}
                </button>
              </div>
            ))
          ) : (
            <p>No doctors found.</p>
          )}
        </div>
      )}

      {/* 🏥 REGISTERED DOCTOR SECTION */}
      <RegisteredDoctor
        doctor={registeredDoctor}
        onSearch={() => alert("Redirect to full search page")}
      />
    </div>
  );
}
