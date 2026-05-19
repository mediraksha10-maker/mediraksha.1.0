import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Hospital, CheckCircle2, User as UserIcon } from "lucide-react";
import axiosInstance from "../api/axios";

export default function AddAvailability() {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [selectedTimes, setSelectedTimes] = useState([]);

  const TIMES = [
    "09:00 - 09:15",
    "09:15 - 09:30",
    "09:30 - 09:45",
    "10:00 - 10:15",
  ];

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const { data } = await axiosInstance.get("/doctor");
        setDoctorId(data?._id || "");
      } catch (error) {
        console.error("Failed to fetch doctor:", error);
      }
    };

    fetchDoctor();
  }, []);

  const fetchDoctorsFromSlots = async () => {
    try {
      const { data } = await axiosInstance.get("/slots/my");
      setDoctors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch doctors from slots:", error);
      setDoctors([]);
    }
  };

  useEffect(() => {
    fetchDoctorsFromSlots();
  }, []);

  const formatDate = (dateValue) => {
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateValue;

    return parsed.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const doctorsWithGroupedSlots = useMemo(() => {
    return doctors.map((doc) => {
      const grouped = (doc.availability || []).reduce((acc, rawSlot) => {
        const [datePart, timePart] = String(rawSlot).split("|").map((v) => v?.trim());
        if (!datePart || !timePart) return acc;

        if (!acc[datePart]) acc[datePart] = new Set();
        acc[datePart].add(timePart);
        return acc;
      }, {});

      const slotGroups = Object.entries(grouped).map(([date, times]) => ({
        date,
        displayDate: formatDate(date),
        times: Array.from(times).sort(),
      }));

      slotGroups.sort((a, b) => a.date.localeCompare(b.date));

      return { ...doc, slotGroups };
    });
  }, [doctors]);

  const toggleTime = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time)
        ? prev.filter((t) => t !== time)
        : [...prev, time]
    );
  };

  const createSlots = async () => {
    if (!doctorId) {
      alert("Doctor not found. Please login again.");
      return;
    }

    if (!date) {
      alert("Please select a date");
      return;
    }

    if (selectedTimes.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    try {
      const { data } = await axiosInstance.post("/slots/create", {
        doctorId,
        date,
        times: selectedTimes,
      });

      if (!data) {
        alert("Failed to publish slots");
        return;
      }

      alert(data.message || "Slots published successfully");
      setSelectedTimes([]);
      fetchDoctorsFromSlots();
    } catch (error) {
      console.error("Frontend error:", error);
      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
          Availability Management
        </h1>
        <p className="text-base-content/60">Set your schedule and view active doctors.</p>
      </div>

      {/* Doctor View: Add Availability */}
      <section className="card bg-base-100 shadow-xl border border-base-200/60 overflow-hidden">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center gap-2">
          <Calendar className="text-primary" size={20} />
          <h2 className="text-lg font-bold text-primary">Publish New Slots</h2>
        </div>

        <div className="card-body p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">

            {/* Left side: Date Picker */}
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-semibold text-base-content/80">
                Select Date
              </label>
              <input
                type="date"
                className="input input-bordered w-full shadow-sm focus:border-primary transition-colors"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Right side: Time Slots */}
            <div className="w-full md:w-2/3 space-y-3">
              <label className="text-sm font-semibold text-base-content/80">
                Select Time Slots
              </label>
              <div className="flex flex-wrap gap-3">
                {TIMES.map((time) => {
                  const isSelected = selectedTimes.includes(time);
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => toggleTime(time)}
                      className={`btn rounded-full border px-6 transition-all duration-200 ${
                        isSelected
                          ? "btn-primary shadow-md shadow-primary/30 scale-105"
                          : "btn-outline border-base-300 text-base-content hover:border-primary/50 hover:bg-base-200"
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={16} className="mr-1" />}
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card-actions justify-end mt-8 pt-6 border-t border-base-200">
            <button
              onClick={createSlots}
              className="btn btn-primary px-8 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              Publish Schedule
            </button>
          </div>
        </div>
      </section>

      {/* Patient View: Available Doctors */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-base-content">Active Doctors Schedule</h2>

        {doctorsWithGroupedSlots.length === 0 ? (
          <div className="text-center py-10 bg-base-100 rounded-2xl border border-dashed border-base-300">
            <p className="text-base-content/50">No doctors currently have published slots.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {doctorsWithGroupedSlots.map((doc) => (
              <div key={doc._id} className="card bg-base-100 shadow-lg border border-base-200 hover:shadow-xl transition-shadow duration-300">
                <div className="card-body p-6">

                  {/* Doctor Info Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="avatar placeholder">
                      <div className="bg-primary/10 text-primary rounded-full w-12 h-12 ring-1 ring-primary/20">
                        <UserIcon size={24} />
                      </div>
                    </div>
                    <div>
                      <h3 className="card-title text-lg">{doc.name}</h3>
                      <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                      <p className="flex items-center gap-1.5 text-xs text-base-content/60 mt-1">
                        <Hospital size={14} /> {doc.hospital}
                      </p>
                    </div>
                  </div>

                  <div className="divider my-2 opacity-50" />

                  {/* Availability List */}
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-2 mb-3 text-base-content/80">
                      <Clock size={15} /> Published Availability
                    </p>

                    {doc.slotGroups.length === 0 ? (
                      <p className="text-sm text-base-content/50 italic bg-base-200 p-3 rounded-lg text-center">
                        No active slots
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {doc.slotGroups.map((group) => (
                          <div key={group.date} className="bg-base-200/50 rounded-xl p-3 border border-base-200">
                            <p className="text-sm font-bold text-base-content/90 mb-2">{group.displayDate}</p>
                            <div className="flex flex-wrap gap-2">
                              {group.times.map((time) => (
                                <span
                                  key={`${group.date}-${time}`}
                                  className="px-2.5 py-1 text-xs font-medium bg-base-100 border border-base-300 rounded-md text-base-content/80 shadow-sm"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
