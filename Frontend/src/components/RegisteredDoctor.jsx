import { Phone, Mail, Building2, Star, CalendarPlus, UserMinus } from "lucide-react";
import { useNavigate } from "react-router";

export default function RegisteredDoctor({ doctor, onRemove, onChangeClick }) {
  const navigate = useNavigate();

  if (!doctor) {
    return (
      <div className="card bg-base-200 border border-dashed border-base-300">
        <div className="card-body items-center text-center py-10">
          <div className="text-5xl mb-2">🩺</div>
          <h3 className="card-title text-base-content/60">No Doctor Registered</h3>
          <p className="text-sm text-base-content/40">
            Search and register a primary doctor to get started.
          </p>
          <button className="btn btn-primary btn-sm mt-2" onClick={onChangeClick}>
            Find a Doctor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow border border-base-300">
      <div className="card-body gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-14">
                <span className="text-xl font-bold">
                  {doctor.name?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Dr. {doctor.name}</h3>
                <span className="badge badge-success badge-sm">Your Doctor</span>
              </div>
              <p className="text-sm text-primary font-medium">{doctor.specialization}</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {doctor.hospital && (
            <div className="flex items-center gap-2 text-base-content/70">
              <Building2 size={15} className="text-primary" />
              <span>{doctor.hospital}</span>
            </div>
          )}
          {doctor.experience && (
            <div className="flex items-center gap-2 text-base-content/70">
              <Star size={15} className="text-warning" />
              <span>{doctor.experience} years experience</span>
            </div>
          )}
          {doctor.contact && (
            <div className="flex items-center gap-2 text-base-content/70">
              <Phone size={15} className="text-success" />
              <span>{doctor.contact}</span>
            </div>
          )}
          {doctor.email && (
            <div className="flex items-center gap-2 text-base-content/70">
              <Mail size={15} className="text-info" />
              <span className="truncate">{doctor.email}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="card-actions justify-end pt-1 gap-2">
          <button
            className="btn btn-ghost btn-sm text-error gap-1"
            onClick={onRemove}
          >
            <UserMinus size={15} /> Remove
          </button>
          <button
            className="btn btn-outline btn-sm gap-1"
            onClick={onChangeClick}
          >
            Change Doctor
          </button>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={() => navigate("/appointments")}
          >
            <CalendarPlus size={15} /> Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}