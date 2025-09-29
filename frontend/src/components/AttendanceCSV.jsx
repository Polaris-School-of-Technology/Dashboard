import React, { useState } from "react";

const AttendanceCSV = () => {
  const [startDate, setStartDate] = useState("2025-09-01");
  const [endDate, setEndDate] = useState("2025-09-15");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL;

  const downloadCSV = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date");
      return;
    }

    setError("");
    setIsDownloading(true);

    try {
      const token = localStorage.getItem("token");
      const queryParams = `startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(
        `${API_BASE_URL}/api/attendance/attendance/csv?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to download: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading CSV:", err);
      setError(err.message || "Failed to download CSV");
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Download Attendance Report</h1>

        <div style={styles.inputGroup}>
          <div style={styles.field}>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        {startDate && endDate && (
          <div style={styles.summaryBox}>
            Duration: {calculateDays()} days
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        <button
          onClick={downloadCSV}
          disabled={isDownloading}
          style={{
            ...styles.button,
            ...(isDownloading ? styles.buttonDisabled : {}),
          }}
        >
          {isDownloading ? "Generating CSV..." : "Download Attendance CSV"}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #f0f4ff 0%, #e6f2ff 100%)",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center",
  },
  title: {
    fontSize: "20px",
    marginBottom: "20px",
    color: "#1f2937",
  },
  inputGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginBottom: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "14px",
    marginBottom: "5px",
    color: "#374151",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
  },
  summaryBox: {
    backgroundColor: "#f9fafb",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
    fontSize: "14px",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
    fontSize: "14px",
  },
  button: {
    width: "100%",
    background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
    color: "white",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background 0.2s",
  },
  buttonDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  },
};

export default AttendanceCSV;
