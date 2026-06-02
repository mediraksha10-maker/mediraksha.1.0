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

        <section>
          <h2 className="text-xl font-semibold mb-4">Your Published Slots</h2>
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

                    <p className="text-sm text-base-content/70">
                      {doc.specialization}
                    </p>

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
