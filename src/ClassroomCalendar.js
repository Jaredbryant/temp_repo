import React from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const ClassroomCalendar = ({ events }) => {
  const coloredEvents = events.map((event) => ({
    ...event,
    style: { backgroundColor: event.color || "blue" }, // Apply color to events
  }));

  return (
    <Calendar
      localizer={localizer}
      events={coloredEvents}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 500, margin: "50px" }}
      eventPropGetter={(event) => ({
        style: event.style,
      })}
    />
  );
};

export default ClassroomCalendar;
