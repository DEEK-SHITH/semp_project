// database.js - All database operations
import { 
  db, collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy 
} from './firebase.js';

class DatabaseManager {
  constructor() {
    this.collections = {
      USERS: 'users',
      DEPARTMENTS: 'departments',
      SEMESTERS: 'semesters',
      SECTIONS: 'sections',
      COURSES: 'courses',
      FACULTIES: 'faculties',
      ROOMS: 'rooms',
      TIMESLOTS: 'timeslots',
      TIMETABLES: 'timetables',
      ENROLLMENTS: 'enrollments'
    };
  }

  // User Management
  async createUser(userData) {
    try {
      const userRef = await addDoc(collection(db, this.collections.USERS), {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return userRef.id;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  async getUserByEmail(email) {
    try {
      const q = query(collection(db, this.collections.USERS), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      throw new Error(`Error getting user: ${error.message}`);
    }
  }

  async updateUser(userId, updates) {
    try {
      const userRef = doc(db, this.collections.USERS, userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Department Management
  async createDepartment(departmentData) {
    try {
      const deptRef = await addDoc(collection(db, this.collections.DEPARTMENTS), {
        ...departmentData,
        createdAt: new Date().toISOString()
      });
      return deptRef.id;
    } catch (error) {
      throw new Error(`Error creating department: ${error.message}`);
    }
  }

  async getDepartments() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.DEPARTMENTS));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting departments: ${error.message}`);
    }
  }

  // Semester Management
  async createSemester(semesterData) {
    try {
      const semesterRef = await addDoc(collection(db, this.collections.SEMESTERS), {
        ...semesterData,
        createdAt: new Date().toISOString()
      });
      return semesterRef.id;
    } catch (error) {
      throw new Error(`Error creating semester: ${error.message}`);
    }
  }

  async getSemesters() {
    try {
      const q = query(collection(db, this.collections.SEMESTERS), orderBy("number"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting semesters: ${error.message}`);
    }
  }

  // Section Management
  async createSection(sectionData) {
    try {
      const sectionRef = await addDoc(collection(db, this.collections.SECTIONS), {
        ...sectionData,
        createdAt: new Date().toISOString()
      });
      return sectionRef.id;
    } catch (error) {
      throw new Error(`Error creating section: ${error.message}`);
    }
  }

  async getSectionsBySemester(semesterId) {
    try {
      const q = query(collection(db, this.collections.SECTIONS), where("semesterId", "==", semesterId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting sections: ${error.message}`);
    }
  }

  // Course Management
  async createCourse(courseData) {
    try {
      const courseRef = await addDoc(collection(db, this.collections.COURSES), {
        ...courseData,
        createdAt: new Date().toISOString()
      });
      return courseRef.id;
    } catch (error) {
      throw new Error(`Error creating course: ${error.message}`);
    }
  }

  async getCoursesBySemester(semesterId) {
    try {
      const q = query(collection(db, this.collections.COURSES), where("semesterId", "==", semesterId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting courses: ${error.message}`);
    }
  }

  // Faculty Management
  async createFaculty(facultyData) {
    try {
      const facultyRef = await addDoc(collection(db, this.collections.FACULTIES), {
        ...facultyData,
        createdAt: new Date().toISOString()
      });
      return facultyRef.id;
    } catch (error) {
      throw new Error(`Error creating faculty: ${error.message}`);
    }
  }

  async getFaculties() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.FACULTIES));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting faculties: ${error.message}`);
    }
  }

  // Room Management
  async createRoom(roomData) {
    try {
      const roomRef = await addDoc(collection(db, this.collections.ROOMS), {
        ...roomData,
        createdAt: new Date().toISOString()
      });
      return roomRef.id;
    } catch (error) {
      throw new Error(`Error creating room: ${error.message}`);
    }
  }

  async getRooms() {
    try {
      const querySnapshot = await getDocs(collection(db, this.collections.ROOMS));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting rooms: ${error.message}`);
    }
  }

  // Timeslot Management
  async createTimeslot(timeslotData) {
    try {
      const timeslotRef = await addDoc(collection(db, this.collections.TIMESLOTS), {
        ...timeslotData,
        createdAt: new Date().toISOString()
      });
      return timeslotRef.id;
    } catch (error) {
      throw new Error(`Error creating timeslot: ${error.message}`);
    }
  }

  async getTimeslots() {
    try {
      const q = query(collection(db, this.collections.TIMESLOTS), orderBy("order"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting timeslots: ${error.message}`);
    }
  }

  // Timetable Management
  async createTimetable(timetableData) {
    try {
      const timetableRef = await addDoc(collection(db, this.collections.TIMETABLES), {
        ...timetableData,
        createdAt: new Date().toISOString()
      });
      return timetableRef.id;
    } catch (error) {
      throw new Error(`Error creating timetable: ${error.message}`);
    }
  }

  async getTimetableBySection(sectionId) {
    try {
      const q = query(collection(db, this.collections.TIMETABLES), where("sectionId", "==", sectionId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      throw new Error(`Error getting timetable: ${error.message}`);
    }
  }

  // Enrollment Management
  async enrollStudent(enrollmentData) {
    try {
      const enrollmentRef = await addDoc(collection(db, this.collections.ENROLLMENTS), {
        ...enrollmentData,
        enrolledAt: new Date().toISOString()
      });
      return enrollmentRef.id;
    } catch (error) {
      throw new Error(`Error enrolling student: ${error.message}`);
    }
  }

  async getStudentEnrollments(studentId) {
    try {
      const q = query(collection(db, this.collections.ENROLLMENTS), where("studentId", "==", studentId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting enrollments: ${error.message}`);
    }
  }

  // Initialize Sample Data
  async initializeSampleData() {
    try {
      // Create departments
      const departments = [
        { name: "Computer Science & Engineering", code: "CSE" },
        { name: "Electronics & Communication", code: "ECE" },
        { name: "Mechanical Engineering", code: "ME" },
        { name: "Civil Engineering", code: "CE" }
      ];

      for (const dept of departments) {
        await this.createDepartment(dept);
      }

      // Create semesters
      for (let i = 1; i <= 8; i++) {
        await this.createSemester({
          number: i,
          name: `Semester ${i}`,
          academicYear: "2024-25"
        });
      }

      // Create timeslots with breaks and lunch
      const timeslots = [
        { start: "8:30", end: "9:30", type: "theory", order: 1, day: "Monday" },
        { start: "9:30", end: "10:30", type: "theory", order: 2, day: "Monday" },
        { start: "10:30", end: "11:00", type: "break", order: 3, day: "Monday", isBreak: true },
        { start: "11:00", end: "12:00", type: "theory", order: 4, day: "Monday" },
        { start: "12:00", end: "1:00", type: "lunch", order: 5, day: "Monday", isLunch: true },
        { start: "1:00", end: "2:00", type: "theory", order: 6, day: "Monday" },
        { start: "2:00", end: "4:00", type: "lab", order: 7, day: "Monday", isLab: true },
        // Repeat for other days...
      ];

      for (const slot of timeslots) {
        await this.createTimeslot(slot);
      }

      return true;
    } catch (error) {
      throw new Error(`Error initializing sample data: ${error.message}`);
    }
  }
}

export const dbManager = new DatabaseManager();