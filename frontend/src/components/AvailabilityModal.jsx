import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export default function AvailabilityModal({
  isOpen,
  onClose,
  onSuccess,
  availabilityToEdit,
  staffList = [],
}) {
  const isEditing = Boolean(availabilityToEdit);

  const [formData, setFormData] = useState({
    staffId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (availabilityToEdit) {
      setFormData({
        staffId: availabilityToEdit.staffId?._id || availabilityToEdit.staffId || '',
        dayOfWeek: availabilityToEdit.dayOfWeek !== undefined ? availabilityToEdit.dayOfWeek : 1,
        startTime: availabilityToEdit.startTime || '09:00',
        endTime: availabilityToEdit.endTime || '17:00',
        isActive: availabilityToEdit.isActive !== undefined ? availabilityToEdit.isActive : true,
      });
    } else {
      setFormData({
        staffId: '',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      });
    }
    setError(null);
  }, [availabilityToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'dayOfWeek'
          ? parseInt(value, 10)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.startTime >= formData.endTime) {
      setError('Start time must be strictly before end time.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        staffId: formData.staffId ? formData.staffId : null,
        isActive: formData.isActive,
      };

      await onSuccess(payload, availabilityToEdit?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save availability window.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="availability-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="availability-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="availability-modal-title" className="text-lg font-semibold text-white">
                {isEditing ? 'Edit Availability Window' : 'Add Availability Window'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure weekly working hours for the business or specific staff
              </p>
            </div>
          </div>
          <button
            id="availability-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              id="availability-modal-error"
              className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              {error}
            </div>
          )}

          {/* Scope: Business vs Staff */}
          <div>
            <label
              htmlFor="availability-staff-select"
              className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Schedule Scope
            </label>
            <select
              id="availability-staff-select"
              name="staffId"
              value={formData.staffId}
              onChange={handleChange}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">🏢 Business-Wide (Default Fallback)</option>
              {staffList.map((st) => (
                <option key={st._id} value={st._id}>
                  👤 {st.name} ({st.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Staff-specific schedules override business working hours for that weekday.
            </p>
          </div>

          {/* Day of Week */}
          <div>
            <label
              htmlFor="availability-day-select"
              className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Day of Week
            </label>
            <select
              id="availability-day-select"
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleChange}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="availability-start-time"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Start Time (24h)
              </label>
              <input
                id="availability-start-time"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label
                htmlFor="availability-end-time"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                End Time (24h)
              </label>
              <input
                id="availability-end-time"
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 pt-2">
            <input
              id="availability-active-checkbox"
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500/50 bg-slate-800 border-slate-700"
            />
            <label htmlFor="availability-active-checkbox" className="text-xs text-slate-300 font-medium">
              Window is active and open for slot calculation
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              id="availability-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="availability-submit-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Update Window' : 'Create Window'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
