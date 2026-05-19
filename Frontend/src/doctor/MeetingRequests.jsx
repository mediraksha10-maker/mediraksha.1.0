import { useEffect, useState } from "react";
import axiosInstance from "../api/axios";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, User, Calendar, FileText } from "lucide-react";

const STATUS_STYLE = {
  pending:   { badge: "bg-warning/10 text-warning border-warning/20", icon: <Clock size={14} />, border: "border-l-warning" },
  confirmed: { badge: "bg-success/10 text-success border-success/20", icon: <CheckCircle size={14} />, border: "border-l-success" },
  cancelled: { badge: "bg-error/10 text-error border-error/20",       icon: <XCircle size={14} />, border: "border-l-error" },
};

const FILTERS = ["all", "pending", "confirmed", "cancelled"];

export default function MeetingRequests() {
  const [meetings, setMeetings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [expanded, setExpanded]   = useState(null);
  const [acting, setActing]       = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/doctor/appointments");
      setMeetings(data);
    } catch (err) {
      console.error("Failed to load appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    setActing(id);
    try {
      await axiosInstance.patch(`/doctor/appointments/${id}`, { status });
      await fetchMeetings();
    } catch (err) {
      alert(err.response?.data?.msg || "Action failed.");
    } finally {
      setActing(null);
    }
  };

  const filtered = filter === "all"
    ? meetings
    : meetings.filter((m) => m.status === filter);

  const counts = {
    all:       meetings.length,
    pending:   meetings.filter((m) => m.status === "pending").length,
    confirmed: meetings.filter((m) => m.status === "confirmed").length,
    cancelled: meetings.filter((m) => m.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-base-content tracking-tight">Appointment Requests</h2>
          <p className="text-sm text-base-content/60">Manage your patient appointments and schedules.</p>
        </div>
        <button
          onClick={fetchMeetings}
          className="btn btn-outline btn-sm rounded-full shadow-sm"
        >
          <Clock size={14} className="mr-1" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="bg-base-200/60 p-1.5 rounded-xl w-fit flex gap-1">
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
                isActive
                  ? "bg-base-100 shadow-sm text-primary"
                  : "text-base-content/60 hover:text-base-content hover:bg-base-200"
              }`}
            >
              {f}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-primary/10 text-primary" : "bg-base-300 text-base-content/70"}`}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <span className="loading loading-ring loading-lg text-primary" />
          <p className="text-base-content/50 font-medium">Loading appointments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-base-100 rounded-2xl border border-dashed border-base-300">
          <Calendar size={48} className="mx-auto text-base-content/20 mb-4" />
          <p className="text-lg font-medium text-base-content/70">No {filter === "all" ? "" : filter} appointments found.</p>
          <p className="text-sm text-base-content/50 mt-1">When patients book slots, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => {
            const isExpanded = expanded === m._id;
            const isActing   = acting === m._id;
            const { badge, icon, border } = STATUS_STYLE[m.status];

            return (
              <div
                key={m._id}
                className={`bg-base-100 rounded-xl overflow-hidden shadow-sm border border-base-200 border-l-4 ${border} transition-all duration-200 ${isExpanded ? 'shadow-md' : 'hover:shadow-md'}`}
              >
                {/* Card header — always visible */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-base-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : m._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="avatar placeholder shadow-sm">
                      <div className="bg-base-200 text-base-content rounded-full w-12 h-12 ring-1 ring-base-300">
                        <span className="text-lg font-bold">
                          {m.patient?.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-base-content text-lg leading-tight">{m.patient?.name ?? "Unknown Patient"}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-base-content/60">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(m.date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          <span className="font-semibold">{m.startTime}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 sm:mt-0 self-start sm:self-center">
                    <span className={`border px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide ${badge}`}>
                      {icon} {m.status}
                    </span>
                    <button className="btn btn-circle btn-ghost btn-sm text-base-content/50">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 border-t border-base-200' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <div className="p-4 md:px-6 md:pb-6 bg-base-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Left: Patient Details */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50">Patient Details</h4>
                        <div className="flex gap-8 text-sm bg-base-100 p-4 rounded-xl border border-base-200">
                          <div className="flex flex-col">
                            <span className="text-base-content/50 mb-1 flex items-center gap-1"><User size={14} /> Age</span>
                            <span className="font-semibold text-base-content">{m.patient?.age || "N/A"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base-content/50 mb-1 flex items-center gap-1"><User size={14} /> Gender</span>
                            <span className="font-semibold text-base-content capitalize">{m.patient?.gender || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Reason */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50">Medical Reason</h4>
                        <div className="bg-base-100 p-4 rounded-xl border border-base-200 flex gap-3 h-full">
                          <FileText size={18} className="text-base-content/40 shrink-0 mt-0.5" />
                          <p className="text-sm text-base-content/80 leading-relaxed">
                            {m.reason || <span className="italic opacity-70">No reason provided by the patient.</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {m.status === "pending" && (
                      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-base-200 border-dashed">
                        <button
                          className="btn btn-outline btn-error rounded-full px-6 shadow-sm hover:shadow-md transition-all"
                          disabled={isActing}
                          onClick={() => handleAction(m._id, "cancelled")}
                        >
                          {isActing ? <span className="loading loading-spinner loading-xs" /> : <XCircle size={16} />}
                          Deny Request
                        </button>
                        <button
                          className="btn btn-success rounded-full px-6 shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/30 transition-all text-white"
                          disabled={isActing}
                          onClick={() => handleAction(m._id, "confirmed")}
                        >
                          {isActing ? <span className="loading loading-spinner loading-xs" /> : <CheckCircle size={16} />}
                          Approve Slot
                        </button>
                      </div>
                    )}

                    {m.status !== "pending" && (
                      <div className="mt-6 pt-4 border-t border-base-200 border-dashed flex justify-end">
                        <p className="text-sm text-base-content/50 italic flex items-center gap-1.5">
                          {icon} This appointment was automatically marked as {m.status}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
