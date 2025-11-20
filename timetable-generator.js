// Advanced timetable generator with real constraints
class AdvancedTimetableGenerator {
  constructor() {
    this.constraints = {
      MAX_CLASSES_PER_DAY: 6,
      MAX_HOURS_PER_DAY: 8,
      LAB_DURATION: 2, // hours
      MIN_BREAK_BETWEEN_CLASSES: 10, // minutes
      LUNCH_BREAK: 60, // minutes
      THEORY_DURATION: 1 // hour
    };
  }

  async generateTimetable(sectionData, constraints = {}) {
    const {
      department,
      semester,
      section,
      courses,
      faculties,
      rooms,
      timeslots
    } = sectionData;

    // Merge constraints
    const finalConstraints = { ...this.constraints, ...constraints };

    // Initialize timetable structure
    const timetable = this.initializeTimetable();

    // Separate courses by type
    const theoryCourses = courses.filter(c => c.type === 'theory');
    const labCourses = courses.filter(c => c.type === 'lab');

    // Generate theory schedule
    await this.scheduleTheoryCourses(timetable, theoryCourses, faculties, rooms, timeslots, finalConstraints);

    // Generate lab schedule (2-hour slots, once per week)
    await this.scheduleLabCourses(timetable, labCourses, faculties, rooms, timeslots, finalConstraints);

    // Add breaks and lunch
    this.addBreaksAndLunch(timetable, timeslots);

    // Optimize timetable to minimize conflicts
    const optimizedTimetable = this.optimizeTimetable(timetable, finalConstraints);

    return {
      ...optimizedTimetable,
      sectionId: `${department}-${semester}-${section}`,
      generatedAt: new Date().toISOString(),
      constraints: finalConstraints
    };
  }

  initializeTimetable() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timetable = {};
    
    days.forEach(day => {
      timetable[day] = [];
    });
    
    return timetable;
  }

  async scheduleTheoryCourses(timetable, courses, faculties, rooms, timeslots, constraints) {
    const theorySlots = timeslots.filter(slot => slot.type === 'theory');
    
    for (const course of courses) {
      let scheduled = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!scheduled && attempts < maxAttempts) {
        const randomDay = this.getRandomDay();
        const randomSlot = theorySlots[Math.floor(Math.random() * theorySlots.length)];
        
        if (this.canScheduleCourse(timetable, randomDay, randomSlot, course, faculties, rooms, constraints)) {
          timetable[randomDay].push({
            time: `${randomSlot.start}-${randomSlot.end}`,
            course: course.name,
            code: course.code,
            teacher: course.teacherId,
            room: this.findSuitableRoom(rooms, course),
            type: 'theory',
            credits: course.credits
          });
          scheduled = true;
        }
        
        attempts++;
      }
      
      if (!scheduled) {
        console.warn(`Could not schedule theory course: ${course.name}`);
      }
    }
  }

  async scheduleLabCourses(timetable, courses, faculties, rooms, timeslots, constraints) {
    const labSlots = timeslots.filter(slot => slot.type === 'lab');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (const course of courses) {
      let scheduled = false;
      let attempts = 0;
      const maxAttempts = 50;

      while (!scheduled && attempts < maxAttempts) {
        const randomDay = days[Math.floor(Math.random() * days.length)];
        const randomSlot = labSlots[Math.floor(Math.random() * labSlots.length)];
        
        // Check if lab can be scheduled (2-hour slot, no conflict)
        if (this.canScheduleLab(timetable, randomDay, randomSlot, course, faculties, rooms, constraints)) {
          timetable[randomDay].push({
            time: `${randomSlot.start}-${randomSlot.end}`,
            course: `${course.name} Lab`,
            code: `${course.code}L`,
            teacher: course.teacherId,
            room: this.findLabRoom(rooms, course),
            type: 'lab',
            duration: 2,
            credits: course.labCredits || 1
          });
          scheduled = true;
        }
        
        attempts++;
      }
      
      if (!scheduled) {
        console.warn(`Could not schedule lab course: ${course.name}`);
      }
    }
  }

  canScheduleCourse(timetable, day, slot, course, faculties, rooms, constraints) {
    const daySchedule = timetable[day];
    
    // Check if teacher is available
    const teacherConflict = daySchedule.some(scheduledClass => 
      scheduledClass.teacher === course.teacherId && 
      scheduledClass.time === `${slot.start}-${slot.end}`
    );
    
    if (teacherConflict) return false;

    // Check if room is available
    const room = this.findSuitableRoom(rooms, course);
    const roomConflict = daySchedule.some(scheduledClass => 
      scheduledClass.room === room && 
      scheduledClass.time === `${slot.start}-${slot.end}`
    );
    
    if (roomConflict) return false;

    // Check daily class limit
    if (daySchedule.length >= constraints.MAX_CLASSES_PER_DAY) return false;

    return true;
  }

  canScheduleLab(timetable, day, slot, course, faculties, rooms, constraints) {
    const daySchedule = timetable[day];
    
    // Check if teacher is available for the entire lab duration
    const teacherConflict = daySchedule.some(scheduledClass => 
      scheduledClass.teacher === course.teacherId
    );
    
    if (teacherConflict) return false;

    // Check if lab room is available
    const labRoom = this.findLabRoom(rooms, course);
    const roomConflict = daySchedule.some(scheduledClass => 
      scheduledClass.room === labRoom
    );
    
    if (roomConflict) return false;

    // Check if this course already has a lab scheduled this week
    const labScheduledThisWeek = Object.values(timetable).some(dayClasses =>
      dayClasses.some(scheduledClass => 
        scheduledClass.code === `${course.code}L`
      )
    );
    
    if (labScheduledThisWeek) return false;

    return true;
  }

  findSuitableRoom(rooms, course) {
    // Find a classroom with sufficient capacity
    const suitableRooms = rooms.filter(room => 
      room.type === 'classroom' && room.capacity >= (course.expectedStudents || 60)
    );
    
    if (suitableRooms.length === 0) {
      return rooms.find(room => room.type === 'classroom')?.name || 'Room 201';
    }
    
    return suitableRooms[Math.floor(Math.random() * suitableRooms.length)].name;
  }

  findLabRoom(rooms, course) {
    // Find a lab room
    const labRooms = rooms.filter(room => room.type === 'lab');
    
    if (labRooms.length === 0) {
      return 'Lab 101';
    }
    
    return labRooms[Math.floor(Math.random() * labRooms.length)].name;
  }

  addBreaksAndLunch(timetable, timeslots) {
    const days = Object.keys(timetable);
    
    days.forEach(day => {
      const daySchedule = timetable[day];
      
      // Sort by time
      daySchedule.sort((a, b) => {
        const aStart = a.time.split('-')[0];
        const bStart = b.time.split('-')[0];
        return aStart.localeCompare(bStart);
      });

      // Add breaks between classes
      const updatedSchedule = [];
      for (let i = 0; i < daySchedule.length; i++) {
        updatedSchedule.push(daySchedule[i]);
        
        // Add break if needed (except after last class)
        if (i < daySchedule.length - 1) {
          const currentEnd = daySchedule[i].time.split('-')[1];
          const nextStart = daySchedule[i + 1].time.split('-')[0];
          
          if (this.getTimeDifference(currentEnd, nextStart) > this.constraints.MIN_BREAK_BETWEEN_CLASSES) {
            updatedSchedule.push({
              time: `${currentEnd}-${nextStart}`,
              course: 'Break',
              type: 'break',
              isBreak: true
            });
          }
        }
      }

      // Add lunch break (around 12:00-1:00)
      const lunchTime = '12:00-1:00';
      const hasClassDuringLunch = updatedSchedule.some(cls => 
        cls.time === lunchTime || 
        (cls.time.split('-')[0] <= '12:00' && cls.time.split('-')[1] >= '1:00')
      );

      if (!hasClassDuringLunch) {
        const lunchIndex = updatedSchedule.findIndex(cls => 
          cls.time.split('-')[1] >= '12:00'
        );
        
        if (lunchIndex !== -1) {
          updatedSchedule.splice(lunchIndex + 1, 0, {
            time: lunchTime,
            course: 'Lunch',
            type: 'lunch',
            isLunch: true
          });
        }
      }

      timetable[day] = updatedSchedule;
    });
  }

  optimizeTimetable(timetable, constraints) {
    // Implement genetic algorithm or other optimization techniques
    // This is a simplified version
    const optimized = JSON.parse(JSON.stringify(timetable));
    
    // Ensure no teacher has classes at the same time
    this.resolveTeacherConflicts(optimized);
    
    // Ensure room conflicts are resolved
    this.resolveRoomConflicts(optimized);
    
    // Balance daily workload
    this.balanceDailyWorkload(optimized, constraints);
    
    return optimized;
  }

  resolveTeacherConflicts(timetable) {
    const teacherSchedule = {};
    
    Object.entries(timetable).forEach(([day, classes]) => {
      classes.forEach(cls => {
        if (cls.teacher && !cls.isBreak && !cls.isLunch) {
          const key = `${day}_${cls.time}_${cls.teacher}`;
          if (teacherSchedule[key]) {
            // Resolve conflict by moving class to different time
            this.moveClassToResolveConflict(timetable, day, cls);
          } else {
            teacherSchedule[key] = true;
          }
        }
      });
    });
  }

  moveClassToResolveConflict(timetable, day, classToMove) {
    const otherDays = Object.keys(timetable).filter(d => d !== day);
    
    for (const otherDay of otherDays) {
      const hasConflict = timetable[otherDay].some(cls => 
        cls.time === classToMove.time && cls.teacher === classToMove.teacher
      );
      
      if (!hasConflict) {
        // Move class to this day
        timetable[otherDay].push(classToMove);
        timetable[day] = timetable[day].filter(cls => cls !== classToMove);
        break;
      }
    }
  }

  resolveRoomConflicts(timetable) {
    const roomSchedule = {};
    
    Object.entries(timetable).forEach(([day, classes]) => {
      classes.forEach(cls => {
        if (cls.room && !cls.isBreak && !cls.isLunch) {
          const key = `${day}_${cls.time}_${cls.room}`;
          if (roomSchedule[key]) {
            // Find alternative room
            cls.room = this.findAlternativeRoom(cls.room);
          } else {
            roomSchedule[key] = true;
          }
        }
      });
    });
  }

  findAlternativeRoom(currentRoom) {
    // This would query available rooms from database
    const alternativeRooms = ['Room 202', 'Room 203', 'Room 204', 'Room 205'];
    return alternativeRooms.find(room => room !== currentRoom) || 'Room 201';
  }

  balanceDailyWorkload(timetable, constraints) {
    const dayWorkload = {};
    
    Object.keys(timetable).forEach(day => {
      const theoryClasses = timetable[day].filter(cls => 
        cls.type === 'theory' || cls.type === 'lab'
      ).length;
      dayWorkload[day] = theoryClasses;
    });

    // Balance classes across days
    const avgClasses = Object.values(dayWorkload).reduce((a, b) => a + b, 0) / Object.keys(dayWorkload).length;
    
    Object.entries(dayWorkload).forEach(([day, count]) => {
      if (count > avgClasses + 1) {
        this.redistributeClasses(timetable, day, Math.floor(count - avgClasses));
      }
    });
  }

  redistributeClasses(timetable, fromDay, numClassesToMove) {
    const classesToMove = timetable[fromDay]
      .filter(cls => cls.type === 'theory')
      .slice(0, numClassesToMove);
    
    const otherDays = Object.keys(timetable).filter(day => day !== fromDay);
    
    classesToMove.forEach(cls => {
      const targetDay = otherDays.find(day => 
        timetable[day].length < timetable[fromDay].length
      ) || otherDays[0];
      
      if (targetDay) {
        timetable[targetDay].push(cls);
        timetable[fromDay] = timetable[fromDay].filter(c => c !== cls);
      }
    });
  }

  getRandomDay() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days[Math.floor(Math.random() * days.length)];
  }

  getTimeDifference(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 - h1) * 60 + (m2 - m1);
  }

  calculateTimetableScore(timetable) {
    let score = 100;
    
    // Deduct points for conflicts
    const conflicts = this.detectConflicts(timetable);
    score -= conflicts.length * 10;
    
    // Deduct points for unbalanced days
    const balanceScore = this.calculateBalanceScore(timetable);
    score += balanceScore;
    
    return Math.max(0, score);
  }

  detectConflicts(timetable) {
    const conflicts = [];
    const teacherSlots = {};
    const roomSlots = {};
    
    Object.entries(timetable).forEach(([day, classes]) => {
      classes.forEach(cls => {
        if (cls.teacher && cls.room) {
          const teacherKey = `${day}_${cls.time}_${cls.teacher}`;
          const roomKey = `${day}_${cls.time}_${cls.room}`;
          
          if (teacherSlots[teacherKey]) {
            conflicts.push(`Teacher ${cls.teacher} double booked on ${day} at ${cls.time}`);
          } else {
            teacherSlots[teacherKey] = true;
          }
          
          if (roomSlots[roomKey]) {
            conflicts.push(`Room ${cls.room} double booked on ${day} at ${cls.time}`);
          } else {
            roomSlots[roomKey] = true;
          }
        }
      });
    });
    
    return conflicts;
  }

  calculateBalanceScore(timetable) {
    const dayCounts = Object.values(timetable).map(day => 
      day.filter(cls => cls.type === 'theory' || cls.type === 'lab').length
    );
    
    const max = Math.max(...dayCounts);
    const min = Math.min(...dayCounts);
    
    return (max - min) * -5; // Penalize unbalanced schedules
  }
}

// Export for use in other files
export const timetableGenerator = new AdvancedTimetableGenerator();