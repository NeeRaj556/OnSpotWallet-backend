const cron = require("node-cron");
const prisma = require("./prisma");
const sendEmail = require("./sendEmail");

 
 // Helper function to check if user has approved leave on a specific date
async function hasApprovedLeave(userId, date) {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  const leave = await prisma.leave.findFirst({
    where: {
      userId,
      status: "approved",
      startDate: { lte: dateObj },
      endDate: { gte: dateObj },
    },
  });

  return leave !== null;
}

// Run every hour during work hours (9 AM to 5 PM) to send check-in reminders
cron.schedule("0 8-10 * * 1-5", async () => {
// cron.schedule("*/10 * * * * *", async () => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    console.log(`📧 Checking for check-in reminders at ${now.toISOString()}`);

    // Get attendance times configuration
    const attendanceTimes = await prisma.attendanceTimes.findUnique({
      where: { id: 1 },
    });

    if (!attendanceTimes) {
      console.log(
        "⚠️  No attendance times configured, skipping reminder check"
      );
      return;
    }

    const checkInTime = attendanceTimes.checkInTime || "09:00:00";
    const [inH, inM = 0] = checkInTime.split(":").map(Number);

    // Calculate expected check-in time
    const expectedCheckIn = new Date(today);
    expectedCheckIn.setHours(inH, inM, 0, 0);

    // Define timeZone constant
    const timeZone = "Asia/Kolkata";

    // Find all staff users
    const staffUsers = await prisma.user.findMany({
      where: {
        role: "staff",
        deletedAt: null, // Add this to exclude deleted staff
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Only send reminders if current time is after expected check-in time
    const tenMinutesBeforeCheckIn = new Date(expectedCheckIn);
    tenMinutesBeforeCheckIn.setMinutes(tenMinutesBeforeCheckIn.getMinutes() - 10);

    if (now <= tenMinutesBeforeCheckIn) {
      console.log("📧 Too early for check-in reminders");
      return;
    }
    
    // Send reminder email to all staff users 10 minutes before check-in time
    if (now >= tenMinutesBeforeCheckIn && now < expectedCheckIn) {
      console.log("📧 Sending early reminder emails to staff users");

      for (const user of staffUsers) {
        try {
          // Check if user has approved leave today
          const hasLeave = await hasApprovedLeave(user.id, today);
          if (hasLeave) {
            console.log(
              `📧 User ${user.name} has approved leave today, skipping early reminder`
            );
            continue;
          }

          // Check if user has already checked in today
          const todayAttendance = await prisma.attendance.findFirst({
            where: {
              userId: user.id,
              checkInAt: { gte: today },
            },
          });

          if (todayAttendance) {
            console.log(`📧 User ${user.name} already checked in today`);
            continue;
          }

          // Check if we already sent an early reminder today
          const earlyReminderSent = await prisma.checkInReminder.findFirst({
            where: {
              userId: user.id,
              lastSent: { gte: today },
              isActive: true,
            },
          });

          if (earlyReminderSent) {
            console.log(`📧 Early reminder already sent to ${user.name}`);
            continue;
          }

          // Send early reminder email
          await sendEmail({
            to: user.email,
            subject: "⏰ Reminder: Check-In Time Approaching",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #17a2b8; border-radius: 10px;">
              <h2 style="color: #17a2b8; text-align: center;">⏰ Reminder: Check-In Time Approaching</h2>
              <p>Dear ${user.name},</p>
              <p>This is a friendly reminder that your check-in time is approaching.</p>
              <p><strong>Expected Check-In Time:</strong> ${expectedCheckIn.toLocaleString(
                "en-IN",
                { timeZone: timeZone }
              )}</p>
              <p>Please ensure you check in on time to avoid being marked as late or absent.</p>
              <p>Best regards,<br>HR Team</p>
              </div>
            `,
            text: `Reminder: Check-In Time Approaching. Dear ${
              user.name
            }, your expected check-in time is ${expectedCheckIn.toLocaleString(
              "en-IN",
              { timeZone: timeZone }
            )}. Please check in on time.`,
          });

          // Record that we sent the early reminder
          await prisma.checkInReminder.create({
            data: {
              userId: user.id,
              lastSent: now,
              isActive: true,
              reminderTime: now,
              days: "1,2,3,4,5", // Monday to Friday (weekdays)
            },
          });

          console.log(`📧 Sent early reminder to ${user.name}`);
        } catch (earlyReminderError) {
          console.error(
            `📧 Error sending early reminder to user ${user.name}:`,
            earlyReminderError
          );
        }
      }
    }

    // Check for late users and send reminders
    if (now >= expectedCheckIn) {
      for (const user of staffUsers) {
        try {
          // Check if user has approved leave today
          const hasLeave = await hasApprovedLeave(user.id, today);
          if (hasLeave) {
            console.log(
              `📧 User ${user.name} has approved leave today, skipping reminder`
            );
            continue;
          }

          // Check if user has already checked in today
          const todayAttendance = await prisma.attendance.findFirst({
            where: {
              userId: user.id,
              checkInAt: { gte: today },
            },
            orderBy: { checkInAt: "desc" },
          });

          if (todayAttendance) {
            console.log(`📧 User ${user.name} already checked in today`);
            continue;
          }

          // Check if we already sent a reminder today
          const reminderSentToday = await prisma.checkInReminder.findFirst({
            where: {
              userId: user.id,
              lastSent: { gte: today },
            },
          });

          if (reminderSentToday) {
            console.log(`📧 Reminder already sent to ${user.name} today`);
            continue;
          }

          // Calculate how late the user is
          const minutesLate = Math.floor((now - expectedCheckIn) / (1000 * 60));

          // Send reminder email
          await sendEmail({
            to: user.email,
            subject: "⚠️ Check-In Reminder - You Haven't Checked In Today",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc3545; border-radius: 10px;">
                <h2 style="color: #dc3545; text-align: center;">⚠️ Check-In Reminder</h2>
                <p>Dear ${user.name},</p>
                
                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                  <p><strong>You have not checked in today!</strong></p>
                  <p><strong>Expected Check-In Time:</strong> ${expectedCheckIn.toLocaleString(
                    "en-IN",
                    { timeZone: timeZone }
                  )}</p>
                  <p><strong>Current Time:</strong> ${now.toLocaleString(
                    "en-IN",
                    { timeZone: timeZone }
                  )}</p>
                  <p><strong>You are ${minutesLate} minutes late</strong></p>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <h4 style="color: #856404; margin-top: 0;">Action Required:</h4>
                  <ul style="color: #856404;">
                    <li>If you are planning to work today, please check in immediately through the attendance app</li>
                    <li>If you are sick or have an emergency, please contact HR immediately</li>
                    <li>If you have leave approved, please ignore this message (our system will update soon)</li>
                  </ul>
                </div>
                
                <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                  <p style="color: #0c5460; margin: 0;"><strong>Note:</strong> Failure to check in or notify HR may result in marking you as absent for today.</p>
                </div>
                
                <p style="text-align: center;">
                  <strong>If you need assistance, please contact HR immediately.</strong>
                </p>
                
                <p>Best regards,<br>HR Team</p>
              </div>
            `,
            text: `Check-In Reminder: Dear ${
              user.name
            }, you have not checked in today. Expected time: ${expectedCheckIn.toLocaleString(
              "en-IN",
              { timeZone: timeZone }
            )}. You are ${minutesLate} minutes late. Please check in immediately or contact HR.`,
          });

          // Also send notification to admin
          await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `Staff Check-In Alert - ${user.name} Has Not Checked In`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h3 style="color: #dc3545;">Staff Check-In Alert</h3>
                <p><strong>Staff Member:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Expected Check-In:</strong> ${expectedCheckIn.toLocaleString(
                  "en-IN",
                  { timeZone: timeZone }
                )}</p>
                <p><strong>Current Time:</strong> ${now.toLocaleString("en-IN", {
                  timeZone: timeZone,
                })}</p>
                <p><strong>Minutes Late:</strong> ${minutesLate} minutes</p>
                <p><strong>Status:</strong> No check-in recorded for today</p>
                <p>A reminder email has been sent to the staff member.</p>
              </div>
            `,
            text: `Staff Check-In Alert: ${
              user.name
            } has not checked in today. Expected: ${expectedCheckIn.toLocaleString(
              "en-IN",
              { timeZone: timeZone }
            )}, ${minutesLate} minutes late.`,
          });

          // Record that we sent the reminder
          await prisma.checkInReminder.create({
            data: {
              userId: user.id,
              lastSent: now,
              minutesLate: minutesLate,
              isActive: true,
              reminderTime: now,
              days: "1,2,3,4,5", // Monday to Friday (weekdays)
            },
          });

          console.log(
            `📧 Sent check-in reminder to ${user.name} (${minutesLate} minutes late)`
          );
        } catch (userError) {
          console.error(
            `📧 Error processing reminder for user ${user.name}:`,
            userError
          );
        }
      }
    }

    console.log("📧 Check-in reminder check completed");
  } catch (error) {
    console.error("📧 Error in check-in reminder scheduler:", error);
  }
});

// Run at end of day (6 PM) to mark absent users who didn't check in and have no approved leave
cron.schedule("0 20 * * 1-5", async () => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    console.log(
      `📊 Running end-of-day attendance check at ${now.toISOString()}`
    );

    // Find all staff users
    const staffUsers = await prisma.user.findMany({
      where: {
        role: "staff",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    for (const user of staffUsers) {
      try {
        // Check if user has approved leave today
        const hasLeave = await hasApprovedLeave(user.id, today);
        if (hasLeave) {
          console.log(
            `📊 User ${user.name} has approved leave today, marking as on leave`
          );
          continue;
        }

        // Check if user has any attendance record today
        const todayAttendance = await prisma.attendance.findFirst({
          where: {
            userId: user.id,
            checkInAt: { gte: today },
          },
        });

        if (!todayAttendance) {
          // Mark as absent and send notification
          console.log(
            `📊 User ${user.name} has no attendance record and no approved leave - marking as absent`
          );

          // Send final warning email to staff
          await sendEmail({
            to: user.email,
            subject: "❌ Marked as Absent - No Check-In Recorded Today",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc3545; border-radius: 10px;">
                <h2 style="color: #dc3545; text-align: center;">❌ Marked as Absent</h2>
                <p>Dear ${user.name},</p>
                
                <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                  <p><strong>You have been marked as ABSENT for today (${today.toDateString()})</strong></p>
                  <p><strong>Reason:</strong> No check-in recorded and no approved leave</p>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <h4 style="color: #856404; margin-top: 0;">If this is incorrect:</h4>
                  <ul style="color: #856404;">
                    <li>Contact HR immediately to explain your absence</li>
                    <li>Provide documentation if you were sick or had an emergency</li>
                    <li>Submit a leave request retroactively if applicable</li>
                  </ul>
                </div>
                
                <p><strong>This absence will be recorded in your attendance record.</strong></p>
                <p>Please contact HR for any questions or corrections.</p>
                
                <p>Best regards,<br>HR Team</p>
              </div>
            `,
            text: `You have been marked as ABSENT for today (${today.toDateString()}) due to no check-in recorded and no approved leave. Contact HR immediately if this is incorrect.`,
          });

          // Send notification to admin
          await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `Staff Marked as Absent - ${user.name}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h3 style="color: #dc3545;">Staff Marked as Absent</h3>
                <p><strong>Staff Member:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Date:</strong> ${today.toDateString()}</p>
                <p><strong>Reason:</strong> No check-in recorded and no approved leave</p>
                <p>The staff member has been notified via email.</p>
              </div>
            `,
            text: `Staff ${
              user.name
            } has been marked as absent for ${today.toDateString()} - no check-in and no approved leave.`,
          });
        }
      } catch (userError) {
        console.error(
          `📊 Error processing end-of-day check for user ${user.name}:`,
          userError
        );
      }
    }

    console.log("📊 End-of-day attendance check completed");
  } catch (error) {
    console.error("📊 Error in end-of-day attendance scheduler:", error);
  }
});

module.exports = {
  hasApprovedLeave,
};
