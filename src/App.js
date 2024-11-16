import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import ClassroomCalendar from "./ClassroomCalendar";

const App = () => {
  const [events, setEvents] = useState([]);
  const [overdueCount, setOverdueCount] = useState(0); // Overdue assignments
  const [completedCount, setCompletedCount] = useState(0); // Completed assignments

  // Fetch Classroom Data
  const fetchClassroomData = async (token) => {
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
        setOverdueCount(0);
        setCompletedCount(0);
        return;
      }

      // Fetch coursework for each course
      const allEvents = [];
      let overdue = 0;
      let completed = 0;

      for (const course of courses) {
        try {
          const courseworkResponse = await axios.get(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log(`Assignments for Course ID: ${course.id}`, courseworkResponse.data);

          const coursework = courseworkResponse.data.courseWork || [];
          coursework.forEach((assignment) => {
            const now = new Date();
            const { dueDate, dueTime } = assignment;
            const title = assignment.title;

            if (dueDate) {
              const dueDateTime = new Date(
                dueDate.year,
                dueDate.month - 1,
                dueDate.day,
                dueTime?.hours || 23,
                dueTime?.minutes || 59
              );

              // Check overdue or on-time
              if (dueDateTime < now) {
                overdue++;
                allEvents.push({
                  title: `Overdue: ${title}`,
                  start: dueDateTime,
                  end: dueDateTime,
                  color: "red",
                });
              } else {
                completed++;
                allEvents.push({
                  title,
                  start: dueDateTime,
                  end: dueDateTime,
                  color: "blue",
                });
              }
            } else {
              allEvents.push({
                title: `${title} (No Due Date)`,
                start: null,
                end: null,
                color: "gray",
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching assignments for course ID: ${course.id}`, error);
        }
      }

      // Update state with events and counts
      setEvents(allEvents);
      setOverdueCount(overdue);
      setCompletedCount(completed);
      console.log("Final Events:", allEvents);
    } catch (error) {
      console.error("Error fetching classroom data:", error.response || error);
    }
  };

  // Google Login
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Login Successful:", tokenResponse);
      const token = tokenResponse.access_token;

      fetchClassroomData(token);
    },
    onError: (error) => console.error("Login failed:", error),
    scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  });

  // Logout
  const logout = () => {
    console.log("Logging out...");
    window.location.reload();
  };

  // Circle Progress Bar (inline for compactness)
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
      {!events.length ? (
        <>
          <button onClick={() => login()}>Login with Google</button>
          <p>No events to display</p>
        </>
      ) : (
        <>
          <button onClick={logout}>Logout</button>
          <h2>Your Assignments</h2>
          <CircleProgressBar completedCount={completedCount} overdueCount={overdueCount} />
          <h3>Overdue Assignments: {overdueCount}</h3>
          <ClassroomCalendar events={events} />
        </>
      )}
    </div>
  );
};

export default App;
