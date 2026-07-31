import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs once a day; convex/reminders.ts internally checks whether today is
// exactly 7, 3, or 1 day(s) before training start and only sends if so.
// 8am UTC = 9am WAT (Nigeria), a reasonable send time.
crons.daily(
  "training countdown reminders",
  { hourUTC: 8, minuteUTC: 0 },
  internal.reminders.sendCountdownReminders,
);

// Runs once a day; convex/reminders.ts internally checks whether today falls
// within the 7-day training window and only sends to live_5000 buyers if so.
// 6am UTC = 7am WAT, ahead of a typical training day starting.
crons.daily(
  "daily training session reminder",
  { hourUTC: 6, minuteUTC: 0 },
  internal.reminders.sendDailyTrainingReminder,
);

export default crons;
