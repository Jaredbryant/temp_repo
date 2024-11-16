import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios"; // Import axios
import ClassroomCalendar from "./ClassroomCalendar";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css"; // Import progress bar styles

const App = () => {
  const [events, setEvents] = useState([]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Login successful, token:", tokenResponse);

      const token = tokenResponse.access_token;

      try {
        const coursesResponse = await axios.get(
          "https://classroom.googleapis.com/v1/courses",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Courses fetched:", coursesResponse.data);
        const courses = coursesResponse.data.courses || [];
        const assignments = [];

        for (const course of courses) {
          try {
            const courseworkResponse = await axios.get(
              `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            console.log(`Course ID: ${course.id}, Assignments:`, courseworkResponse.data);
            const coursework = courseworkResponse.data.courseWork || [];

            coursework.forEach((work) => {
              if (work.dueDate) {
                const { year, month, day } = work.dueDate;
                const hours = work.dueTime?.hours || 23;
                const minutes = work.dueTime?.minutes || 59;

                const dueDate = new Date(year, month - 1, day, hours, minutes);
                const studyDate = new Date(dueDate);
                studyDate.setDate(dueDate.getDate() - 2);

                assignments.push({
                  title: `Study: ${work.title}`,
                  start: studyDate,
                  end: new Date(studyDate.getTime() + 60 * 60 * 1000),
                });

                assignments.push({
                  title: work.title,
                  start: dueDate,
                  end: new Date(dueDate.getTime() + 30 * 60 * 1000),
                });
              }
            });
          } catch (error) {
            console.error(`Error fetching coursework for course ID: ${course.id}`, error);
          }
        }

        setEvents(assignments);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    },
    onError: (error) => console.error("Login failed:", error),
    scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth.classroom.coursework.me",
  });

  const currentDate = new Date();

  // Calculate totals for progress tracking
  const totalAssignments = events.filter((event) => !event.title.startsWith("Study:")).length;
  const overdueAssignments = events.filter((event) => event.end < currentDate && !event.title.startsWith("Study:")).length;
  const completedAssignments = totalAssignments - overdueAssignments; // Example assumption: All non-overdue are "completed"

  // Calculate progress percentage
  const progress = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

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
          <h2>Progress Tracker</h2>
          <div style={{ width: "200px", margin: "auto", position: "relative" }}>
            <CircularProgressbar
              value={progress}
              text={`${progress}%`}
              styles={buildStyles({
                textColor: "black",
                pathColor: progress >= 75 ? "green" : progress >= 50 ? "orange" : "red",
                trailColor: "#d6d6d6",
              })}
            />
            <div style={{ position: "absolute", top: "75%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", fontSize: "12px" }}>
              <p style={{ margin: 0 }}>Completed: {completedAssignments}</p>
              <p style={{ margin: 0 }}>Overdue: {overdueAssignments}</p>
              <p style={{ margin: 0 }}>Total: {totalAssignments}</p>
            </div>
          </div>
          <ClassroomCalendar events={events} />
        </>
      )}
    </div>
  );
};

export default App;
