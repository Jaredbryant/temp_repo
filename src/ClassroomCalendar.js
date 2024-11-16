import React from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const ClassroomCalendar = ({ events }) => {
  const currentDate = new Date();

  // Define a function to style events
  const eventPropGetter = (event) => {
    if (event.end < currentDate) {
      // Overdue assignments
      return {
        style: {
          backgroundColor: "red", // Red color for overdue assignments
          color: "white",
          border: "1px solid darkred",
        },
      };
    }
    if (event.title.startsWith("Study:")) {
      // Study reminders
      return {
        style: {
          backgroundColor: "#FFD700", // Gold color for study reminders
          color: "black",
        },
      };
    }
    // Regular assignments
    return {
      style: {
        backgroundColor: "#1E90FF", // Blue color for assignments
        color: "white",
      }
    };
  };

  // Preprocess events to mark overdue assignments
  const processedEvents = events.map((event) => {
    if (event.end < currentDate && !event.title.startsWith("Overdue:")) {
      return {
        ...event,
        title: `Overdue: ${event.title}`, // Add "Overdue:" prefix
      };
    }
    return event;
  });

  return (
    <div style={{ height: "600px" }}>
      <Calendar
        localizer={localizer}
        events={processedEvents} // Use the processed events
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        eventPropGetter={eventPropGetter} // Apply custom styles
        style={{ height: 500 }}
      />
    </div>
  );
};

export default ClassroomCalendar;
