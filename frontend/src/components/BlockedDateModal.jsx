import { useState, useEffect } from 'react';
import { X, CalendarX, User, AlignLeft, CheckCircle2 } from 'lucide-react';

export default function BlockedDateModal({
  isOpen,
  onClose,
  onSuccess,
  blockedDateToEdit,
  staffList = [],
}) {
  const isEditing = Boolean(blockedDateToEdit);

  const [formData, setFormData] = useState({
    staffId: '',
    date: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (blockedDateToEdit) {
      const rawDate = blockedDateToEdit.date ? new Date(blockedDateToEdit.date) : null;
      const formattedDate = rawDate ? rawDate.toISOString().split('T')[0] : '';

      setFormData({
        staffId: blockedDateToEdit.staffId?._id || blockedDateToEdit.staffId || '',
        date: formattedDate,
        reason: blockedDateToEdit.reason || '',
      });
    } else {
      // Default to tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        staffId: '',
        date: tomorrow.toISOString().split('T')[0],
        reason: '',
      });
    }
    setError(null);
  }, [blockedDateToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.date) {
      setError('Date is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date: formData.date,
        reason: formData.reason.trim(),
        staffId: formData.staffId ? formData.staffId : null,
      };

      await onSuccess(payload, blockedDateToEdit?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save blocked date.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="blocked-date-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="blocked-date-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h2 id="blocked-date-modal-title" className="text-lg font-semibold text-white">
                {isEditing ? 'Edit Blocked Date' : 'Block a Date'}
              </h2>
              <p className="text-xs text-slate-400">
                Mark dates unavailable for booking platform-wide or for specific staff
              </p>
            </div>
          </div>
          <button
            id="blocked-date-close-btn"
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
              id="blocked-date-modal-error"
              className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              {error}
            </div>
          )}

          {/* Scope: Business vs Staff */}
          <div>
            <label
              htmlFor="blocked-date-staff-select"
              className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
            >
              <User className="w-3.5 h-3.5 text-rose-400" />
              Blocked Scope
            </label>
            <select
              id="blocked-date-staff-select"
              name="staffId"
              value={formData.staffId}
              onChange={handleChange}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="">🏢 Entire Business (All Staff Blocked)</option>
              {staffList.map((st) => (
                <option key={st._id} value={st._id}>
                  👤 {st.name} ({st.status})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label
              htmlFor="blocked-date-picker"
              className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
            >
              <CalendarX className="w-3.5 h-3.5 text-rose-400" />
              Date to Block
            </label>
            <input
              id="blocked-date-picker"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="blocked-date-reason"
              className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2"
            >
              <AlignLeft className="w-3.5 h-3.5 text-rose-400" />
              Reason (Optional)
            </label>
            <input
              id="blocked-date-reason"
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g. National Holiday, Equipment Maintenance, Vacation"
              maxLength={200}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              id="blocked-date-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="blocked-date-submit-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-xl shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Update Blocked Date' : 'Confirm Block'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
