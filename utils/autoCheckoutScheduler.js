const cron = require("node-cron");
const prisma = require("./prisma");
const sendEmail = require("./sendEmail");

async function autoSetCheckoutTimes(checkOutRecord, now, defaultEndTime) {
  try {
    // Get the date of the attendance record (not today's date)
    const attendanceDate = new Date(checkOutRecord.checkInAt);
    
    // Validate attendance date
    if (isNaN(attendanceDate.getTime())) {
      console.error(`❌ Invalid checkInAt date for user ${checkOutRecord.userId}: ${checkOutRecord.checkInAt}`);
      return;
    }
    
    const attendanceDateStart = new Date(attendanceDate);
    attendanceDateStart.setHours(0, 0, 0, 0);
    const attendanceDateEnd = new Date(attendanceDate);
    attendanceDateEnd.setHours(23, 59, 59, 999);

    console.log(`🔍 Processing attendance for user ${checkOutRecord.userId} on date ${attendanceDate.toISOString().split('T')[0]}`);

    // Only get breaks from the SAME DATE as the attendance record
    const breaks = await prisma.break.findMany({
      where: {
        breakStart: {
          gte: attendanceDateStart, 
          lte: attendanceDateEnd,  
        },
        userId: checkOutRecord.userId,
      },
      select: {
        breakStart: true,
        breakEnd: true,
      },
      orderBy: {
        breakStart: 'asc'
      },
    });

    console.log(`📊 Found ${breaks.length} breaks for user ${checkOutRecord.userId} on ${attendanceDate.toISOString().split('T')[0]}`);

    let checkOutAt = null;

    if (!breaks.length) {
      // No breaks found, set checkout to EXACT default end time on the attendance date
      console.log(`📅 No breaks found for user ${checkOutRecord.userId}. Setting checkout to configured end time: ${defaultEndTime}`);
      
      if (defaultEndTime instanceof Date) {
        // If defaultEndTime is already a Date, use its time but on the attendance date
        const hours = defaultEndTime.getHours();
        const minutes = defaultEndTime.getMinutes();
        const seconds = defaultEndTime.getSeconds();
        
        checkOutAt = new Date(attendanceDate);
        checkOutAt.setHours(hours, minutes, seconds, 0);
        console.log(`⏰ Using Date object time: ${hours}:${minutes}:${seconds} on ${attendanceDate.toISOString().split('T')[0]}`);
        
      } else if (typeof defaultEndTime === 'string' && defaultEndTime.trim()) {
        try {
          // Parse time string (e.g., "17:00:00" or "17:00")
          const timeParts = defaultEndTime.trim().split(":");
          
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            const seconds = parseInt(timeParts[2] || '0', 10);
            
            // Validate time components
            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || 
                hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
              throw new Error(`Invalid time components: ${hours}:${minutes}:${seconds}`);
            }
            
            // Create checkout time on the SAME DATE as check-in
            checkOutAt = new Date(attendanceDate);
            checkOutAt.setHours(hours, minutes, seconds, 0);
            
            console.log(`⏰ Parsed time string "${defaultEndTime}" to ${hours}:${minutes}:${seconds} on ${attendanceDate.toISOString().split('T')[0]}`);
            console.log(`📝 Exact checkout time set to: ${checkOutAt.toISOString()}`);
            
          } else {
            throw new Error(`Invalid time format: ${defaultEndTime} - must be HH:MM or HH:MM:SS`);
          }
        } catch (timeError) {
          console.error(`❌ Error parsing defaultEndTime "${defaultEndTime}":`, timeError.message);
          // Fallback to 5 PM on the attendance date
          checkOutAt = new Date(attendanceDate);
          checkOutAt.setHours(17, 0, 0, 0);
          console.log(`⚠️ Using fallback time 17:00:00 on ${attendanceDate.toISOString().split('T')[0]}`);
        }
      } else {
        console.error(`❌ Invalid defaultEndTime: "${defaultEndTime}" (type: ${typeof defaultEndTime})`);
        // Fallback to 5 PM on the attendance date
        checkOutAt = new Date(attendanceDate);
        checkOutAt.setHours(17, 0, 0, 0);
        console.log(`⚠️ Using fallback time 17:00:00 on ${attendanceDate.toISOString().split('T')[0]}`);
      }
    } else {
      // Breaks found - determine checkout based on last break
      const lastBreak = breaks[breaks.length - 1];
      console.log(`📊 Processing last break: Start=${lastBreak.breakStart}, End=${lastBreak.breakEnd}`);
      
      if (!lastBreak.breakEnd) {
        // If last break has no end, set checkout to break start time
        checkOutAt = new Date(lastBreak.breakStart);
        console.log(`🔄 Last break has no end time, setting checkout to break start: ${checkOutAt.toISOString()}`);
      } else {
        // Last break has ended, set checkout to break end time
        checkOutAt = new Date(lastBreak.breakEnd);
        console.log(`✅ Last break ended, setting checkout to break end: ${checkOutAt.toISOString()}`);
      }
      
      // Ensure the checkout time is not before the check-in time
      if (checkOutAt < attendanceDate) {
        console.log(`⚠️ Calculated checkout (${checkOutAt.toISOString()}) is before check-in (${attendanceDate.toISOString()}). Adjusting...`);
        // Use the configured end time instead
        try {
          const timeParts = defaultEndTime.trim().split(":");
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          const seconds = parseInt(timeParts[2] || '0', 10);
          
          checkOutAt = new Date(attendanceDate);
          checkOutAt.setHours(hours, minutes, seconds, 0);
          console.log(`📝 Adjusted checkout to configured end time: ${checkOutAt.toISOString()}`);
        } catch (adjustError) {
          checkOutAt = new Date(attendanceDate);
          checkOutAt.setHours(17, 0, 0, 0);
          console.log(`📝 Adjusted checkout to fallback time: ${checkOutAt.toISOString()}`);
        }
      }
    }

    // Final validation of checkOutAt
    if (!checkOutAt || isNaN(checkOutAt.getTime())) {
      console.error(`❌ Invalid checkout date calculated for user ${checkOutRecord.userId}. Using fallback.`);
      // Use fallback time (configured end time or 5 PM on the attendance date)
      try {
        const timeParts = defaultEndTime.trim().split(":");
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = parseInt(timeParts[2] || '0', 10);
        
        checkOutAt = new Date(attendanceDate);
        checkOutAt.setHours(hours, minutes, seconds, 0);
        console.log(`🔧 Fallback to configured time: ${checkOutAt.toISOString()}`);
      } catch (fallbackError) {
        checkOutAt = new Date(attendanceDate);
        checkOutAt.setHours(17, 0, 0, 0);
        console.log(`🔧 Fallback to 17:00:00: ${checkOutAt.toISOString()}`);
      }
    }

    // Ensure checkout is on the same date as checkin
    const checkOutDate = checkOutAt.toISOString().split("T")[0];
    const checkInDate = attendanceDate.toISOString().split("T")[0];
    
    if (checkInDate !== checkOutDate) {
      console.log(`⚠️ Checkout date mismatch (${checkOutDate} vs ${checkInDate}). Adjusting to same day.`);
      // Force checkout to be on the same day as checkin using configured time
      try {
        const timeParts = defaultEndTime.trim().split(":");
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = parseInt(timeParts[2] || '0', 10);
        
        checkOutAt = new Date(attendanceDate);
        checkOutAt.setHours(hours, minutes, seconds, 0);
        console.log(`📅 Same-day adjustment to configured time: ${checkOutAt.toISOString()}`);
      } catch (sameDayError) {
        checkOutAt = new Date(attendanceDate);
        checkOutAt.setHours(17, 0, 0, 0);
        console.log(`📅 Same-day adjustment to 17:00:00: ${checkOutAt.toISOString()}`);
      }
    }

    // Final safety check before database update
    if (!checkOutAt || isNaN(checkOutAt.getTime())) {
      console.error(`❌ Final validation failed for checkout time. Skipping update for user ${checkOutRecord.userId}`);
      return;
    }

    console.log(`📝 Final checkout time for user ${checkOutRecord.userId}: ${checkOutAt.toISOString()}`);

    // Update the attendance record - try different approaches
    try {
      // First try: Update without status field
      const result = await prisma.attendance.updateMany({
        where: {
          userId: checkOutRecord.userId,
          checkInAt: checkOutRecord.checkInAt,
          checkOutAt: null,
        },
        data: {
          checkOutAt: checkOutAt,
        },
      });

      console.log(`✅ Updated ${result.count} attendance record(s) for user ${checkOutRecord.userId} with checkout time: ${checkOutAt.toISOString()}`);
      
      // Try to update status separately if the field exists
      if (result.count > 0) {
        try {
          await prisma.attendance.updateMany({
            where: {
              userId: checkOutRecord.userId,
              checkInAt: checkOutRecord.checkInAt,
              checkOutAt: checkOutAt,
            },
            data: {
              status: "auto_checkout",
            },
          });
          console.log(`✅ Updated status to auto_checkout for user ${checkOutRecord.userId}`);
        } catch (statusError) {
          console.log(`⚠️ Could not update status field: ${statusError.message}`);
        }
      }
      
    } catch (updateError) {
      console.error(`❌ Error with updateMany:`, updateError);
      
      // Fallback: Try using update with the record ID
      try {
        const existingRecord = await prisma.attendance.findFirst({
          where: {
            userId: checkOutRecord.userId,
            checkInAt: checkOutRecord.checkInAt,
            checkOutAt: null,
          },
        });
        
        if (existingRecord) {
          await prisma.attendance.update({
            where: { id: existingRecord.id },
            data: { 
              checkOutAt: checkOutAt,
            },
          });
          console.log(`✅ Updated attendance record using ID for user ${checkOutRecord.userId}`);
        } else {
          console.log(`⚠️ No matching attendance record found for user ${checkOutRecord.userId}`);
        }
      } catch (idUpdateError) {
        console.error(`❌ Failed to update using ID as well:`, idUpdateError);
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to update checkout time for user ${checkOutRecord.userId}:`, error);
  }
}

cron.schedule("59 23 * * *", async () => {
   try {
    const now = new Date();
    console.log(`🚀 Auto-checkout scheduler started at ${now.toISOString()}`);
    
    const attendanceTimes = await prisma.attendanceTimes.findFirst({
      where: { id: 1 },
      select: {
        checkInTime: true,
        checkOutTime: true,
      },
    });

    if (!attendanceTimes) {
      console.log("⚠️ No attendance times configuration found, skipping auto-checkout");
      return;
    }

    let defaultEndTime = attendanceTimes.checkOutTime;
    console.log("📅 Default end time for attendance:", defaultEndTime);
    
    // Validate and fallback for defaultEndTime
    if (!defaultEndTime || typeof defaultEndTime !== 'string') {
      console.log("⚠️ Invalid or missing default checkout time, using 17:00:00 as fallback");
      defaultEndTime = "17:00:00";
    }
    
    // Find all open attendance records (regardless of date)
    const openAttendances = await prisma.attendance.findMany({
      where: {
        checkOutAt: null,
        checkInAt: {
          // Only process records that are at least from yesterday or earlier
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        checkInAt: true,
        userId: true,
      },
      orderBy: {
        checkInAt: 'desc'
      }
    });

    console.log(`📋 Found ${openAttendances.length} open attendance records to process`);

    if (openAttendances.length === 0) {
      console.log("✅ No open attendance records found to auto-checkout");
      return;
    }

    // Process each open attendance record
    let processedCount = 0;
    for (const attendance of openAttendances) {
      try {
        await autoSetCheckoutTimes(attendance, now, defaultEndTime);
        processedCount++;
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (processingError) {
        console.error(`❌ Error processing attendance for user ${attendance.userId}:`, processingError);
      }
    }

    // Clean up invalid attendances (where checkout is on different date than checkin)
    console.log("🧹 Cleaning up invalid attendance records...");
    
    try {
      const invalidAttendances = await prisma.attendance.findMany({
        where: {
          NOT: {
            checkOutAt: null,
          },
        },
        select: {
          id: true,
          checkInAt: true,
          checkOutAt: true,
        },
      });

      let cleanedCount = 0;
      for (const attendance of invalidAttendances) {
        try {
          // Validate dates before processing
          if (!attendance.checkInAt || !attendance.checkOutAt) {
            continue;
          }
          
          const checkInDate = attendance.checkInAt.toISOString().split("T")[0];
          const checkOutDate = attendance.checkOutAt.toISOString().split("T")[0];

          // Calculate time difference in days
          const timeDiffDays = Math.abs((attendance.checkOutAt - attendance.checkInAt) / (1000 * 60 * 60 * 24));

          // Only flag as invalid if more than 1 day apart
          if (checkInDate !== checkOutDate && timeDiffDays > 1) {
            await prisma.attendance.update({
              where: { id: attendance.id },
              data: { 
                checkOutAt: null,
              },
            });
            cleanedCount++;
            console.log(`🧹 Reset invalid attendance record: checkin ${checkInDate}, checkout ${checkOutDate} (${timeDiffDays.toFixed(1)} days apart)`);
          }
        } catch (cleanupError) {
          console.error(`❌ Error cleaning up attendance record ${attendance.id}:`, cleanupError);
        }
      }

      console.log(`✅ Auto-checkout process completed. Processed ${processedCount}/${openAttendances.length} records, cleaned ${cleanedCount} invalid records.`);
    } catch (cleanupError) {
      console.error("❌ Error during cleanup phase:", cleanupError);
    }
    
  } catch (error) {
    console.error("❌ Error in auto-checkout scheduler:", error);
  }
});

module.exports = {
  autoSetCheckoutTimes,
};
