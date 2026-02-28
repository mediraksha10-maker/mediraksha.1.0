import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { ArrowLeft, X, Search } from "lucide-react";
import { Link } from "react-router";
import axiosInstance from "../api/axios";
// import axiosInstance from "../api/axios.js"; // adjust path as needed

const STATUS_COLOR = {
  pending: "badge-warning",
  confirmed: "badge-success",
  cancelled: "badge-error",
};

export default function AppointmentCalendar() {
  const [events, setEvents]             = useState([]);
  const [meetings, setMeetings]         = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const [form, setForm] = useState({
    doctorId: "",
    doctorName: "",
    date: "",
    startTime: "",
    reason: "",
  });

  /* ── Fetch appointments on mount ── */
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await axiosInstance.get("/home/appointments");
      setMeetings(data);
      setEvents(
        data
          .filter((m) => m.status !== "cancelled")
          .map((m) => ({
            id: m._id,
            title: `Dr. ${m.doctor?.name} — ${m.startTime}`,
            date: m.date.split("T")[0],
            backgroundColor: m.status === "confirmed" ? "#22c55e" : "#f59e0b",
            borderColor: "transparent",
            extendedProps: m,
          }))
      );
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    }
  };

  /* ── Doctor search with debounce ── */
  useEffect(() => {
    if (!doctorSearch.trim()) { setDoctors([]); return; }
    const delay = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get(
          `/home/appointments/doctors?name=${doctorSearch}`
        );
        setDoctors(data);
      } catch {
        setDoctors([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [doctorSearch]);

  /* ── Book appointment ── */
  const handleSubmit = async () => {
    setError("");
    if (!form.doctorId || !form.date || !form.startTime) {
      setError("Doctor, date and time are required.");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post("/home/appointments", {
        doctorId: form.doctorId,
        date: form.date,
        startTime: form.startTime,
        reason: form.reason,
      });
      setShowModal(false);
      resetForm();
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.msg || "Booking failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Cancel appointment ── */
  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await axiosInstance.delete(`/home/appointments/${id}`);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.msg || "Could not cancel.");
    }
  };

  const resetForm = () =>
    setForm({ doctorId: "", doctorName: "", date: "", startTime: "", reason: "" });

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setError("");
  };

  return (
    <div className="p-6 bg-base-100 rounded-xl shadow space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-semibold">My Appointments</h2>
        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
          + Add Meeting
        </button>
      </div>

      {/* ── Calendar ── */}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        height="auto"
      />

      {/* ── Appointments list ── */}
      {meetings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">All Appointments</h3>
          <div className="space-y-2">
            {meetings.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium">Dr. {m.doctor?.name}</p>
                  <p className="text-sm text-gray-500">
                    {m.doctor?.specialization} &bull;{" "}
                    {new Date(m.date).toLocaleDateString()} at {m.startTime}
                  </p>
                  {m.reason && (
                    <p className="text-xs text-gray-400 mt-0.5">{m.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${STATUS_COLOR[m.status]}`}>{m.status}</span>
                  {m.status !== "cancelled" && (
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleCancel(m._id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Booking Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 btn btn-ghost btn-xs"
              onClick={closeModal}
            >
              <X size={16} />
            </button>

            <h3 className="text-xl font-semibold mb-4">Schedule Appointment</h3>

            {error && (
              <div className="alert alert-error text-sm mb-3 py-2">{error}</div>
            )}

            {/* Doctor search */}
            <label className="label text-sm font-medium pb-1">Search Doctor</label>
            <div className="relative mb-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                className="input input-bordered w-full pl-9"
                placeholder="Type doctor name..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
              />
            </div>

            {/* Doctor dropdown */}
            {doctors.length > 0 && (
              <ul className="menu bg-base-200 rounded-box mb-3 max-h-40 overflow-y-auto">
                {doctors.map((d) => (
                  <li key={d._id}>
                    <button
                      className={`text-left ${form.doctorId === d._id ? "active" : ""}`}
                      onClick={() => {
                        setForm({ ...form, doctorId: d._id, doctorName: d.name });
                        setDoctorSearch(d.name);
                        setDoctors([]);
                      }}
                    >
                      <span className="font-medium">{d.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{d.specialization}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Selected doctor chip */}
            {form.doctorId && (
              <div className="badge badge-primary gap-1 mb-3">
                Dr. {form.doctorName}
                <button onClick={() => setForm({ ...form, doctorId: "", doctorName: "" })}>
                  <X size={12} />
                </button>
              </div>
            )}

            <label className="label text-sm font-medium pb-1">Date</label>
            <input
              type="date"
              className="input input-bordered w-full mb-3"
              min={new Date().toISOString().split("T")[0]}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <label className="label text-sm font-medium pb-1">Time</label>
            <input
              type="time"
              className="input input-bordered w-full mb-3"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />

            <label className="label text-sm font-medium pb-1">Reason (optional)</label>
            <textarea
              className="textarea textarea-bordered w-full mb-4"
              placeholder="Describe your concern..."
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />

            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : "Book"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}