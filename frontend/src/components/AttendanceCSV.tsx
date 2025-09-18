import React, { useState } from "react";

const AttendanceCSV: React.FC = () => {
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

      const response = await fetch(
        `${API_BASE_URL}/api/attendance/attendance/csv?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
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
    } catch (error) {
      console.error("Error downloading CSV:", error);
      setError(error instanceof Error ? error.message : "Failed to download CSV");
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const estimatedRecords = calculateDays() * 12 * 200;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Download Attendance Report</h1>
          <p style={styles.subtitle}>Export attendance data for analysis and reporting</p>
        </div>

        <div style={styles.content}>
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
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Duration</div>
                <div style={styles.summaryValue}>{calculateDays()} days</div>
              </div>
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

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

          <div style={styles.footer}>
            <p>CSV file will include session details, student information, and attendance status</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f4ff 0%, #e6f2ff 100%)",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "white",
    borderRadius: "12px",

    overflow: "hidden",
  },
  header: {

    padding: "40px 30px",
    color: "white",
    textAlign: "center" as const,
    borderBottom: "3px solid rgba(255,255,255,0.2)",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },
  subtitle: {
    margin: 0,
    fontSize: "16px",
    opacity: 0.95,
    fontWeight: "400",
  },
  content: {
    padding: "30px",
  },
  inputGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "25px",
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
  },
  input: {
    padding: "12px",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s",
    ":focus": {
      borderColor: "#2563eb",
    },
  },
  summaryBox: {
    backgroundColor: "#f9fafb",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "25px",
    textAlign: "center" as const,
  },
  summaryItem: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "8px",
    textAlign: "center" as const,
    maxWidth: "200px",
    margin: "0 auto",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
  },
  summaryValue: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#111827",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "20px",
  },
  errorText: {
    color: "#dc2626",
    margin: 0,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
    color: "white",
    border: "none",
    padding: "15px 20px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
    ":hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 5px 15px rgba(37, 99, 235, 0.3)",
    },
  },
  buttonDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
    transform: "none",
  },
  footer: {
    textAlign: "center" as const,
    marginTop: "20px",
    fontSize: "13px",
    color: "#6b7280",
  },
};

export default AttendanceCSV;