import React, { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import ClassroomCalendar from "./ClassroomCalendar";
import Gpt from "./Gpt";
import StudyMaterial from "./StudyMaterial"

const App = () => {
  const [token, setToken] = useState(null); // OAuth token
  const [events, setEvents] = useState([]);
  const [grades, setGrades] = useState({}); // Store grades for courses
  const [gradesArray, setGradesArray] = useState([]); // 2D array of assignments and grades
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchClassroomData(token);
    }
  }, [token]);

  // Fetch Classroom Data
  const fetchClassroomData = async (token) => {
    setIsLoading(true);
    try {
      console.log("Fetching classroom data with token:", token);

      // Fetch courses
      const coursesResponse = await axios.get(
        "https://classroom.googleapis.com/v1/courses",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Fetched Courses:", coursesResponse.data);

      const courses = coursesResponse.data.courses || [];
      if (courses.length === 0) {
        console.warn("No courses found for the logged-in account.");
        setEvents([]);
        setGrades({});
        setGradesArray([]);
        setIsLoading(false);
        return;
      }

      const allEvents = [];
      const gradesMap = {};
      const tempGradesArray = []; // Temporary array for assignments and grades

      // Fetch coursework and grades
      for (const course of courses) {
        try {
          const courseworkResponse = await axios.get(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const coursework = courseworkResponse.data.courseWork || [];
          for (const assignment of coursework) {
            const { dueDate, dueTime, title, id: assignmentId } = assignment;

            // Fetch student submission for the assignment
            const submissionResponse = await axios.get(
              `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${assignmentId}/studentSubmissions`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const submissions = submissionResponse.data.studentSubmissions || [];
            submissions.forEach((submission) => {
              const grade = submission?.assignedGrade || "Not Graded";
              const studentId = submission?.userId || "Unknown Student";
              tempGradesArray.push([title, studentId, grade]);
            });

            // Add assignment event
            if (dueDate) {
              const dueDateTime = new Date(
                dueDate.year,
                dueDate.month - 1,
                dueDate.day,
                dueTime?.hours || 23,
                dueTime?.minutes || 59
              );

              // Determine color
              let color = "gray"; // Default: ungraded
              if (dueDateTime < new Date() && submissions.every(s => s.state !== "TURNED_IN")) {
                color = "red"; // Past due and not submitted
              } else if (submissions.some(s => s.assignedGrade !== undefined)) {
                color = "green"; // Graded
              } else if (submissions.some(s => s.state === "TURNED_IN")) {
                color = "blue"; // Submitted but not graded
              }

              allEvents.push({
                title: `${title}`,
                start: dueDateTime,
                end: dueDateTime,
                color,
              });
            } else {
              allEvents.push({
                title: `${title}`,
                start: null,
                end: null,
                color: "gray",
              });
            }
          }

          // Store course-level grade information
          gradesMap[course.id] = {
            courseName: course.name,
            grade: course.grade || "N/A", // Course grade if available
          };
        } catch (error) {
          console.error(`Error fetching assignments for course ID: ${course.id}`, error);
        }
      }

      // Update state with events and grades
      setEvents(allEvents);
      setGrades(gradesMap);
      setGradesArray(tempGradesArray);
      console.log("Final Events:", allEvents);
      console.log("Grades by Course:", gradesMap);
      console.log("2D Grades Array:", tempGradesArray);
    } catch (error) {
      console.error("Error fetching classroom data:", error.response || error);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login
  const login = useGoogleLogin({
    onSuccess: (response) => {
      console.log("Login Successful:", response);
      setToken(response.access_token);
    },
    onError: (error) => console.error("Login failed:", error),
    scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
  });

  // Logout
  const logout = () => {
    console.log("Logging out...");
    setToken(null);
    setEvents([]);
    setGrades({});
    setGradesArray([]);
  };

  // Circle Progress Bar
  const CircleProgressBar = ({ completedCount, overdueCount }) => {
    const total = completedCount + overdueCount;
    const completedPercentage = total ? (completedCount / total) * 100 : 0;

    return (
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="green"
            strokeWidth="10"
            strokeDasharray={`${completedPercentage} ${100 - completedPercentage}`}
            strokeDashoffset="25"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div style={{ marginTop: "-90px", fontWeight: "bold" }}>
          {Math.round(completedPercentage)}% Complete
        </div>
        <p>
          Completed: {completedCount} | Overdue: {overdueCount} | Total: {total}
        </p>
      </div>
    );
  };

  return (
    <div>
      <h1>Classroom Calendar</h1>
      {!token ? (
        <>
          <button onClick={login}>Login with Google</button>
        </>
      ) : isLoading ? (
        <p>Loading data...</p>
      ) : (
        <>
          <button onClick={logout}>Logout</button>
          <h2>Your Assignments</h2>
          <CircleProgressBar
            completedCount={
              events.filter((event) => event.color === "green").length
            }
            overdueCount={
              events.filter((event) => event.color === "red").length
            }
          />
          <h3>Grades Overview</h3>
          <ul>
            {Object.values(grades).map((grade, index) => (
              <li key={index}>
                <strong>{grade.courseName}</strong>: {grade.grade}
              </li>
            ))}
          </ul>
          <ClassroomCalendar events={events} />
          <Gpt/>
          <h3>2D Array of Assignments and Grades</h3>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "10px",
              borderRadius: "5px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(gradesArray, null, 2)}
          </pre>
          <StudyMaterial/>
        </>
      )}
    </div>
    
  );
};

export default App;
