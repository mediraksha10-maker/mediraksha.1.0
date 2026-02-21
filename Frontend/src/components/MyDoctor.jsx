import { useState, useEffect, useCallback } from "react";
import RegisteredDoctor from "./RegisteredDoctor";
import { ArrowLeft, Search, Building2, Star, Loader2 } from "lucide-react";
import { Link } from "react-router";
import axiosInstance from "../api/axios"; // adjust path

export default function MyDoctor() {
  const [searchTerm, setSearchTerm]           = useState("");
  const [searchResults, setSearchResults]     = useState([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [registeredDoctor, setRegisteredDoctor] = useState(null);
  const [pageLoading, setPageLoading]         = useState(true);
  const [actionId, setActionId]               = useState(null); // doctor._id being acted on

  /* ── Load registered doctor on mount ── */
  useEffect(() => {
    fetchMyDoctor();
  }, []);

  const fetchMyDoctor = async () => {
    setPageLoading(true);
    try {
      const { data } = await axiosInstance.get("/home/my-doctor");
      setRegisteredDoctor(data);
    } catch (err) {
      console.error("Failed to load doctor", err);
    } finally {
      setPageLoading(false);
    }
  };

  /* ── Debounced search ── */
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await axiosInstance.get(
          `/home/doctors?name=${searchTerm}`
        );
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  /* ── Register / change doctor ── */
  const handleRegister = async (doctor) => {
    setActionId(doctor._id);
    try {
      const { data } = await axiosInstance.patch("/home/my-doctor", {
        doctorId: doctor._id,
      });
      setRegisteredDoctor(data.doctor);
      setSearchTerm("");
      setSearchResults([]);
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to register doctor.");
    } finally {
      setActionId(null);
    }
  };

  /* ── Remove doctor ── */
  const handleRemove = async () => {
    if (!window.confirm("Remove your registered doctor?")) return;
    try {
      await axiosInstance.delete("/home/my-doctor");
      setRegisteredDoctor(null);
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to remove doctor.");
    }
  };

  const isRegistered = (doctor) => registeredDoctor?._id === doctor._id;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">My Doctor</h1>
      </div>

      {/* Registered doctor card */}
      {pageLoading ? (
        <div className="flex justify-center py-10">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <RegisteredDoctor
          doctor={registeredDoctor}
          onRemove={handleRemove}
          onChangeClick={() => document.getElementById("search-input").focus()}
        />
      )}

      {/* Divider */}
      <div className="divider">Find a Doctor</div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
        <input
          id="search-input"
          type="text"
          placeholder="Search by name or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered w-full pl-9"
        />
        {searchLoading && (
          <Loader2 size={16} className="absolute right-3 top-3.5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search results */}
      {searchTerm && (
        <div className="space-y-3">
          {searchResults.length === 0 && !searchLoading ? (
            <p className="text-center text-base-content/50 py-4">No doctors found.</p>
          ) : (
            searchResults.map((doc) => (
              <div
                key={doc._id}
                className="card bg-base-200 border border-base-300"
              >
                <div className="card-body py-4 flex-row items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="avatar placeholder shrink-0">
                      <div className="bg-primary/20 text-primary rounded-full w-11">
                        <span className="font-bold">{doc.name?.[0]?.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">Dr. {doc.name}</p>
                      <p className="text-xs text-primary">{doc.specialization}</p>
                      <div className="flex gap-3 mt-0.5 text-xs text-base-content/50">
                        {doc.hospital && (
                          <span className="flex items-center gap-1">
                            <Building2 size={11} /> {doc.hospital}
                          </span>
                        )}
                        {doc.experience && (
                          <span className="flex items-center gap-1">
                            <Star size={11} /> {doc.experience} yrs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Register button */}
                  <button
                    className={`btn btn-sm shrink-0 ${
                      isRegistered(doc)
                        ? "btn-success pointer-events-none"
                        : "btn-primary"
                    }`}
                    onClick={() => !isRegistered(doc) && handleRegister(doc)}
                    disabled={actionId === doc._id}
                  >
                    {actionId === doc._id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : isRegistered(doc) ? (
                      "✓ Registered"
                    ) : (
                      "Register"
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

