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
    minHeight: "77vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at top left, #2b2b2b 0%, #0d0d0d 100%)",
    padding: "20px",
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45)",
    maxWidth: "440px",
    width: "100%",
    textAlign: "center",
    border: "1px solid rgba(255, 209, 64, 0.18)",
  },
  title: {
    fontSize: "22px",
    marginBottom: "22px",
    color: "#ffd54f",
  },
  inputGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginBottom: "22px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "14px",
    marginBottom: "6px",
    color: "#f5e27a",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 213, 79, 0.35)",
    backgroundColor: "#1e1e1e",
    color: "#f8f1b0",
    fontSize: "14px",
  },
  summaryBox: {
    backgroundColor: "rgba(255, 215, 64, 0.08)",
    color: "#f8f1b0",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "14px",
    border: "1px solid rgba(255, 215, 64, 0.18)",
  },
  errorBox: {
    backgroundColor: "rgba(255, 87, 34, 0.12)",
    color: "#ffb74d",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
    fontSize: "14px",
    border: "1px solid rgba(255, 87, 34, 0.25)",
  },
  button: {
    width: "100%",
    background: "linear-gradient(135deg, #fdd835 0%, #ffca28 100%)",
    color: "#111111",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 10px 25px rgba(255, 214, 79, 0.25)",
  },
  buttonDisabled: {
    background: "#7a6b00",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};

export default AttendanceCSV;
