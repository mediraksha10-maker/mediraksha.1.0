import React from "react";

const RegisteredDoctor = ({ doctor, onSearch }) => {
  // If no doctor is registered
  if (!doctor) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>My Registered Doctor</h2>
        <p style={styles.noDoctor}>You are not registered with any doctor yet.</p>
        <button style={styles.searchBtn} onClick={onSearch}>
          Search for Doctors
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>My Registered Doctor</h2>

      <div style={styles.card}>
        <h3 style={styles.name}>Dr. {doctor.name}</h3>
        <p><strong>Specialization:</strong> {doctor.specialization}</p>
        <p><strong>Hospital:</strong> {doctor.hospital}</p>
        <p><strong>Experience:</strong> {doctor.experience} years</p>
        <p><strong>Contact:</strong> {doctor.contact}</p>
        <p><strong>Email:</strong> {doctor.email}</p>
      </div>

      <button style={styles.searchBtn} onClick={onSearch}>
        Search for Doctors
      </button>
    </div>
  );
};

export default RegisteredDoctor;

/* ================== STYLES ================== */

const styles = {
  container: {
    maxWidth: "600px",
    margin: "40px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  },
  heading: {
    marginBottom: "20px",
    color: "#2c3e50",
  },
  card: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    marginBottom: "20px",
    textAlign: "left",
  },
  name: {
    marginBottom: "10px",
    color: "#007bff",
  },
  searchBtn: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "#fff",
    transition: "0.3s",
  },
  noDoctor: {
    marginBottom: "20px",
    color: "#555",
  },
};
