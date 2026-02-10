import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function DoctorPatients() {
    // 🔹 Mock data (replace with API later)
    const [patients] = useState([
        {
            patientId: "P001",
            name: "John Doe",
            age: 45,
            diagnosis: "Diabetes Type 2",
            reports: [
                {
                    reportId: "R101",
                    title: "Blood Sugar Report",
                    result: "High",
                    date: "2025-01-12",
                },
                {
                    reportId: "R102",
                    title: "HbA1c Test",
                    result: "7.8%",
                    date: "2025-01-15",
                },
            ],
        },
        {
            patientId: "P002",
            name: "Jane Smith",
            age: 32,
            diagnosis: "Migraine",
            reports: [
                {
                    reportId: "R201",
                    title: "MRI Scan",
                    result: "Normal",
                    date: "2025-01-18",
                },
            ],
        },
    ]);

    return (
        <div className="min-h-screen bg-base-200 p-6">

            <h1 className="text-3xl font-bold text-center mb-6">
                <Link to="/doctordash" className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft size={24} />
                </Link>
                My Patients
            </h1>

            <div className="grid gap-6 max-w-5xl mx-auto">
                {patients.map((patient) => (
                    <div
                        key={patient.patientId}
                        className="card bg-base-100 shadow-xl p-5"
                    >
                        {/* Patient Info */}
                        <div className="mb-3">
                            <h2 className="text-xl font-bold">
                                {patient.name}
                            </h2>
                            <p>
                                <b>Patient ID:</b> {patient.patientId}
                            </p>
                            <p>
                                <b>Age:</b> {patient.age}
                            </p>
                            <p>
                                <b>Diagnosis:</b>{" "}
                                <span className="text-primary font-semibold">
                                    {patient.diagnosis}
                                </span>
                            </p>
                        </div>

                        {/* Reports */}
                        <div>
                            <h3 className="text-lg font-bold mb-2">
                                Medical Reports
                            </h3>

                            {patient.reports.length === 0 ? (
                                <p className="text-gray-500">
                                    No reports available
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra w-full">
                                        <thead>
                                            <tr>
                                                <th>Report ID</th>
                                                <th>Title</th>
                                                <th>Result</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {patient.reports.map((report) => (
                                                <tr key={report.reportId}>
                                                    <td>{report.reportId}</td>
                                                    <td>{report.title}</td>
                                                    <td>{report.result}</td>
                                                    <td>{report.date}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
