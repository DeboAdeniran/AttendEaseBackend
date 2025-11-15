export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (timeString) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const getAttendanceColor = (percentage) => {
  if (percentage >= 85) return "text-green-500";
  if (percentage >= 75) return "text-yellow-500";
  return "text-red-500";
};

export const getAttendanceBgColor = (percentage) => {
  if (percentage >= 85) return "bg-green-500";
  if (percentage >= 75) return "bg-yellow-500";
  return "bg-red-500";
};

export const getStatusColor = (status) => {
  switch (status) {
    case "Present":
      return "bg-green-500/20 text-green-500";
    case "Absent":
      return "bg-red-500/20 text-red-500";
    case "Late":
      return "bg-yellow-500/20 text-yellow-500";
    case "Excused":
      return "bg-blue/20 text-blue";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
};

export const calculateAttendancePercentage = (present, total) => {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
};

export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data.message || "An error occurred";
  } else if (error.request) {
    // Request made but no response
    return "Network error. Please check your connection";
  } else {
    // Something else happened
    return error.message || "An unexpected error occurred";
  }
};
